"use server";

import { CartItem } from "@/types";
import { cookies } from "next/headers";
import { convertToPlanObject, formatErrorMessages, round2 } from "../utils";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { cartItemSchema, insertCartSchema } from "../validators";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

//calculte cart prices
const calcPrice = (itemns: CartItem[]) => {
  const itemsPrice = round2(
      itemns.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
    ),
    shippingPrice = round2(itemsPrice > 100 ? 0 : 10),
    taxPrice = round2(0.15 * itemsPrice),
    totalPrice = round2(itemsPrice + taxPrice + shippingPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};

export async function addItemToCart(data: CartItem) {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;

    if (!sessionCartId) throw new Error("Cart session not found");

    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    const cart = await getMyCart();

    const item = cartItemSchema.parse(data);

    const product = await prisma.product.findFirst({
      where: { id: item.productId },
    });

    if (!product) throw new Error("Product not found");

    if (!cart) {
      const newCart = insertCartSchema.parse({
        userId: userId,
        items: [item],
        sessionCartId: sessionCartId,
        ...calcPrice([item]),
      });

      await prisma.cart.create({
        data: newCart,
      });

      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} added to cart`,
      };
    } else {
      // check if item already in cart
      const existItem = (cart.items as CartItem[]).find(
        (x) => x.productId === item.productId
      );

      //check if item exists
      if (existItem) {
        if (product.stock < existItem.qty + 1) {
          throw new Error("Product out of stock");
        }

        //increase the quantity
        (cart.items as CartItem[]).find(
          (x) => x.productId === item.productId
        )!.qty = existItem.qty + 1;
      } else {
        //if item doesnt not exist in cart
        //check stock

        if (product.stock < 1) throw new Error("Product out of stock");

        //add item to cart.itemns
        cart.items.push(item);
      }

      //save to database
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items: cart.items as Prisma.CartUpdateitemsInput[],
          ...calcPrice(cart.items as CartItem[]),
        },
      });

      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} ${existItem ? "quantity updated" : "added to cart"} cart`,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: formatErrorMessages(error),
    };
  }
}

export async function getMyCart() {
  const sessionCartId = (await cookies()).get("sessionCartId")?.value;

  if (!sessionCartId) throw new Error("Cart session not found");

  const session = await auth();
  const userId = session?.user?.id ? (session.user.id as string) : undefined;

  const cart = await prisma.cart.findFirst({
    where: userId ? { userId: userId } : { sessionCartId: sessionCartId },
  });

  if (!cart) return undefined;

  return convertToPlanObject({
    ...cart,
    items: cart.items as CartItem[],
    itemsPrice: cart.itemsPrice.toString(),
    totalPrice: cart.totalPrice.toString(),
    shippingPrice: cart.shippingPrice.toString(),
    taxPrice: cart.taxPrice.toString(),
  });
}


export async function removeItemFromCart(productId: string) {
  try {
    
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if(!sessionCartId) throw new Error("Cart session not found");

    const product = await prisma.product.findFirst({
      where: {id:productId}
    });
    if(!product) throw new Error("Product not found");

    const cart = await getMyCart();
    if(!cart) throw new Error("Cart not found");

    const exist = (cart.items as CartItem[]).find(x=> x.productId === productId);
    if(!exist) throw new Error("Product not in cart");

    //check if if only one item in cart
    if(exist.qty === 1){
      cart.items = (cart.items as CartItem[]).filter((x) => x.productId !== exist.productId);
    } else {
      (cart.items as CartItem[]).find((x) => x.productId === productId)!.qty = exist.qty - 1;
    }

    //Update Cart in database
    await prisma.cart.update({
      where: {id: cart.id},
      data: {
        items: cart.items as Prisma.CartUpdateitemsInput[],
        ...calcPrice(cart.items as CartItem[])
      }
    }); 

    revalidatePath(`/product/${product.slug}`);

    return {success:true, message:`${product.name} removed from cart`};

  } catch (error) {
    return {success:false, message:formatErrorMessages(error)}
  }
}