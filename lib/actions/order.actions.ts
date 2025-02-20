"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { convertToPlanObject, formatErrorMessages } from "../utils";
import { getMyCart } from "./cart.actions";
import { getUserById } from "./user.actions";
import { insertOrderSchema } from "../validators";
import { prisma } from "@/db/prisma";
import { CartItem } from "@/types";
import { auth } from "@/auth";
import { paypal } from "../paypal";
import { PaymentResolve } from "@/types";
import { revalidatePath } from "next/cache";
import { PAGE_SIZE } from "../constants";
import { Prisma } from "@prisma/client";

export async function createOrder() {
  try {
    const session = await auth();

    if (!session)
      throw new Error("You need to be logged in to create an order");

    const cart = await getMyCart();

    const userId = session?.user?.id;

    if (!userId) throw new Error("User not found");

    const user = await getUserById(userId);

    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: "Your cart is empty",
        redirectTo: "/cart",
      };
    }

    if (!user.address) {
      return {
        success: false,
        message: "No shipping address",
        redirectTo: "/shipping-address",
      };
    }

    if (!user.paymentMethod) {
      return {
        success: false,
        message: "No payment method",
        redirectTo: "/payment-method",
      };
    }

    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
      totalPrice: cart.totalPrice,
    });

    const insertOrderId = await prisma.$transaction(async (tx) => {
      const insertedOrder = await tx.order.create({ data: order });

      for (const item of cart.items as CartItem[]) {
        await tx.orderItem.create({
          data: {
            ...item,
            price: item.price,
            orderId: insertedOrder.id,
          },
        });
      }

      //clear cart
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          items: [],
          totalPrice: 0,
          taxPrice: 0,
          shippingPrice: 0,
          itemsPrice: 0,
        },
      });

      return insertedOrder.id;
    });

    if (!insertOrderId) throw new Error("Failed to create order");

    return {
      success: true,
      message: "Order created",
      redirectTo: `/order/${insertOrderId}`,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false, message: formatErrorMessages(error) };
  }
}

export async function getOrderById(orderId: string) {
  const data = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      orderitems: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return convertToPlanObject(data);
}

// Create a new paypal Order
export async function createPaypalOrder(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (order) {
      //create paypal order
      const paypalOrder = await paypal.createOrder(Number(order.totalPrice));

      //Update order with paypal order id
      await prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          paymentResult: {
            id: paypalOrder.id,
            email_address: "",
            status: "",
            pricePaid: 0,
          },
        },
      });

      return {
        success: true,
        message: "Paypal order created",
        data: paypalOrder.id,
      };
    } else {
      throw new Error("Order not found");
    }
  } catch (error) {
    return { success: false, message: formatErrorMessages(error) };
  }
}

//approve paypal order and update order status
export async function approvePayPalOrder(
  orderId: string,
  data: { orderID: string }
) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
      },
    });

    if (!order) throw new Error("Order not found");

    const captureData = await paypal.capturePayment(data.orderID);

    if (
      !captureData ||
      captureData.id !== (order.paymentResult as PaymentResolve)?.id ||
      captureData.status !== "COMPLETED"
    ) {
      throw new Error("Failed to capture payment");
    }

    await updateOrderToPaid({
      orderId,
      paymentResult: {
        id: captureData.id,
        status: captureData.status,
        email_address: captureData.payer.email_address,
        price_paid:
          captureData.purchase_units[0]?.payments?.captures[0]?.amount?.value,
      },
    });

    revalidatePath(`/order/${orderId}`);

    return {
      success: true,
      message: "Payment approved",
    };
  } catch (error) {
    return { success: false, message: formatErrorMessages(error) };
  }
}

//update Order to paid
async function updateOrderToPaid({
  orderId,
  paymentResult,
}: {
  orderId: string;
  paymentResult?: PaymentResolve;
}) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
      },
      include: {
        orderitems: true,
      },
    });

    if (!order) throw new Error("Order not found");

    if (order.isPaid) throw new Error("Order already paid");

    //transaction to update order and account for product stock
    await prisma.$transaction(async (tx) => {
      //iterate over products and update stock
      for (const item of order.orderitems) {
        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              increment: -item.qty,
            },
          },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          isPaid: true,
          paidAt: new Date(),
          paymentResult,
        },
      });
    });

    //get updated order after transaction
    const updatedOrder = await prisma.order.findFirst({
      where: { id: orderId },
      include: {
        orderitems: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!updatedOrder) throw new Error("Order not found");

    //set the order to paid
  } catch (error) {
    return { success: false, message: formatErrorMessages(error) };
  }
}

//GET USERS ORDERS
export async function getMyOrders({
  limit = PAGE_SIZE,
  page,
}: {
  limit?: number;
  page: number;
}) {
  const session = await auth();

  if (!session) throw new Error("You need to be logged in to view orders");

  const data = await prisma.order.findMany({
    where: {
      userId: session?.user?.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.order.count({
    where: {
      userId: session?.user?.id,
    },
  });

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

type SalesDataType = {
  month: string;
  totalSales: number;
}[];

//get sales data and order summary
export async function getOrderSummary() {
  //get counts for each resource/
  const ordersCount = await prisma.order.count();
  const productsCount = await prisma.product.count();
  const usersCount = await prisma.user.count();

  //calculate the total sales
  const totalSales = await prisma.order.aggregate({
    _sum: { totalPrice: true },
  });

  //get monthly sales
  const salesDataRaw = await prisma.$queryRaw<
    Array<{ month: string; totalSales: Prisma.Decimal }>
  >`SELECT to_char("createdAt", 'MM/YY') as "month", sum("totalPrice") as "totalSales" FROM
  "Order" GROUP BY to_char("createdAt", 'MM/YY')`;

  const salesData: SalesDataType = salesDataRaw.map((item) => ({
    month: item.month,
    totalSales: Number(item.totalSales),
  }));

  //get the latest sales
  const latestSales = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  return {
    ordersCount,
    productsCount,
    usersCount,
    totalSales,
    salesData,
    latestSales,
  };
}

//Get all orders
export async function getAllOrders({
  limit = PAGE_SIZE,
  page,
}: {
  limit?: number;
  page: number;
}) {
  const data = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: (page - 1) * limit,
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  const dataCount = await prisma.order.count();

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}
