import { Metadata } from "next";
import { getMyOrders } from "@/lib/actions/order.actions";
import { formatCurrency, formatDate, formatId } from "@/lib/utils";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/shared/pagination";

export const metadata: Metadata = {
  title: "My Orders",
};

const OrdersPage = async (props: {
  searchParams: Promise<{ page: string }>;
}) => {
  const { page } = await props.searchParams;

  const orders = await getMyOrders({
    page: Number(page) || 1,
  });

  return (
    <div className="space-y-2">
      <h2 className="h2-bold">Orders</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>DATE</TableHead>
              <TableHead>TOTAL</TableHead>
              <TableHead>PAID</TableHead>
              <TableHead>DELIVERED</TableHead>
              <TableHead>ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{formatId(item.id)}</TableCell>
                <TableCell>{formatDate(item.createdAt).dateTime}</TableCell>
                <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
                <TableCell>
                  {item.isPaid && item.paidAt
                    ? formatDate(item.paidAt).dateTime
                    : "Not Paid"}
                </TableCell>
                <TableCell>
                  {item.isDelivered && item.deliveredAt
                    ? formatDate(item.deliveredAt).dateTime
                    : "Not Delivered"}
                </TableCell>
                <TableCell>
                  <Link href={`/order/${item.id}`}>
                    <span className="px-2">Details</span>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.totalPages > 1 && (
          <Pagination
            page={Number(page) || 1}
            totalPages={orders?.totalPages}
          />
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
