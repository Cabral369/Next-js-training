import Pagination from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteOrder, getAllOrders } from "@/lib/actions/order.actions";
import { formatCurrency, formatDate, formatId } from "@/lib/utils";
import { Metadata } from "next";
import Link from "next/link";
import DeleteDialog from "@/components/shared/delete-dialog";

export const metadata: Metadata = {
  title: "Orders",
};

const AdminOrdersPage = async (props: {
  searchParams: Promise<{ page: string }>;
}) => {
  const { page = "1" } = await props.searchParams;

  const orders = await getAllOrders({
    page: Number(page),
    limit: 8,
  });

  return (
    <>
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
                  <TableCell className="space-x-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/order/${item.id}`}>Details</Link>
                    </Button>
                    <DeleteDialog id={item.id} action={deleteOrder} />
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
    </>
  );
};

export default AdminOrdersPage;
