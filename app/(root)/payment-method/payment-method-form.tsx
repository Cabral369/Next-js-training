"use client";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useTransition } from "react";
import { paymentMethodSchema } from "@/lib/validators";
import CheckOutSteps from "@/components/shared/checkout-steps";
import { Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_PAYMENT_METHOD } from "@/lib/constants";
import { z } from "zod";

const PaymentMethodForm = ({
  preferredPaymentType,
}: {
  preferredPaymentType: string | null;
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof paymentMethodSchema>>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type: preferredPaymentType || DEFAULT_PAYMENT_METHOD,
    },
  });

  const [isPending, startTransition] = useTransition();

  return (
    <>
      <CheckOutSteps current={2} />
    </>
  );
};

export default PaymentMethodForm;
