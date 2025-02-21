"use client";

import { useToast } from "@/hooks/use-toast";
import { productDefaultValues } from "@/lib/constants";
import { insertProductSchema, updateProductSchema } from "@/lib/validators";
import { Product } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "../ui/form";

const ProductForm = ({
  type,
  product,
  productId,
}: {
  type: "create" | "update";
  product: Product;
  productId?: string;
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof insertProductSchema>>({
    resolver:
      type === "update"
        ? zodResolver(updateProductSchema)
        : zodResolver(insertProductSchema),
    defaultValues: product && type === "update" ? productDefaultValues : {},
  });

  return (
    <Form {...form}>
      <form className="space-y-8">
        <div className="flex flex-col md:flex-row gap-5">
          {/* NAME */}
          {/* NAME */}
        </div>
        <div className="flex flex-col md:flex-row gap-5">
          {/* category */}
          {/* brand */}
        </div>
        <div className="flex flex-col md:flex-row gap-5">
          {/* price */}
          {/* stock */}
        </div>
        <div className="upload-field flex flex-col md:flex-row gap-5">
          {/* images*/}
        </div>
        <div className="upload-field">{/* isFeatured */}</div>
        <div>{/* description */}</div>
        <div>{/* submit */}</div>
      </form>
    </Form>
  );
};

export default ProductForm;
