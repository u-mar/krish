"use client";
import { z } from "zod";
import React, { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";
import { API } from "@/lib/config";
import toast, { Toaster } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { bankTransactionSchema } from "@/app/validationSchema/bankTransactionSchema";
import { Loader2 } from "lucide-react";
import { BankTransaction } from "@prisma/client";
import AccountIdSelect from "./AccountIdSelect";

const AddPaymentForm = ({ bankTransaction }: { bankTransaction?: BankTransaction }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState<string>("");

  // Extract bankAccountId and acc from URL
  const searchParams = useSearchParams();
  const bankAccountId = searchParams.get("bankAccountId") || undefined;
  const acc = searchParams.get("acc") || undefined;

  // Fetch first account on mount
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await axios.get(`${API}/admin/account`);
        if (response.data && response.data.length > 0) {
          setAccountId(response.data[0].id);
        }
      } catch (error) {
        console.error("Error fetching account:", error);
      }
    };
    if (!bankTransaction) {
      fetchAccount();
    } else {
      setAccountId(bankTransaction.accountId);
    }
  }, [bankTransaction]);

  // Ensure acc and bankAccountId are available
  useEffect(() => {
    if (!bankTransaction && (!bankAccountId || !acc)) {
      toast.error("Missing required parameters");
      router.push("/dashboard/admin/bank");
    }
  }, [bankAccountId, acc, bankTransaction, router]);

  // Initialize form with react-hook-form
  const form = useForm<z.infer<typeof bankTransactionSchema>>({
    resolver: zodResolver(bankTransactionSchema),
    defaultValues: {
      bankAccountId: bankTransaction?.bankAccountId || bankAccountId,
      acc: bankTransaction?.acc || (acc === "credit" ? "cr" : "dr"),
      accountId: bankTransaction?.accountId || "",
      cashBalance: bankTransaction?.cashBalance || 0,
      digitalBalance: bankTransaction?.digitalBalance || 0,
      details: bankTransaction?.details || "",
    },
  });

  // Update accountId when fetched
  useEffect(() => {
    if (accountId && !bankTransaction) {
      form.setValue("accountId", accountId);
    }
  }, [accountId, bankTransaction, form]);


  // Prevent scroll on number inputs
  const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
  };


  const onSubmit = async (values: z.infer<typeof bankTransactionSchema>) => {
    const amount = parseFloat(values.cashBalance?.toString() || "0") || 0;

    if (amount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    if (!values.accountId) {
      toast.error("Account not loaded. Please wait or refresh the page.");
      return;
    }

    setLoading(true);
    try {
      if (bankTransaction) {
        await axios.patch(`${API}/admin/bankTransaction/${bankTransaction.id}`, {
          ...values,
          cashBalance: amount,
          digitalBalance: 0,
        });
        toast.success(`Successfully Updated Debt`);
      } else {
        await axios.post(`${API}/admin/bankTransaction`, {
          ...values,
          cashBalance: amount,
          digitalBalance: 0,
        });
        toast.success(`Successfully Created Debt`);
      }

      queryClient.invalidateQueries({ queryKey: ["bankPayment"] });
      router.push(`/dashboard/admin/bank/view/${bankAccountId || bankTransaction?.bankAccountId}`);
    } catch (error: any) {
      console.error("Error handling payment request", error);
      toast.error(error.response?.data?.error || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="max-w-4xl mx-auto my-10 p-6 shadow-lg rounded-lg bg-white">
        <CardHeader className="mb-6">
          <CardTitle className="text-2xl font-bold text-gray-700">
            {bankTransaction ? `Edit Debt` : `Add Debt`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Details - First */}
              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter debt details (optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Amount - Single Field */}
              <FormField
                control={form.control}
                name="cashBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Enter amount"
                        {...field}
                        onWheel={handleWheel}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-center">
                <SubmitButtonWithContent loading={loading} isEdit={!!bankTransaction} />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Toaster />
    </>
  );
};

export default AddPaymentForm;

// Submit Button Component
export const SubmitButtonWithContent = React.forwardRef<
  HTMLButtonElement,
  { loading: boolean; isEdit: boolean }
>(({ loading, isEdit }, ref) => {
  return loading ? (
    <Button className="space-x-2 bg-gray-400" disabled ref={ref}>
      {isEdit ? "Updating Payment" : "Submitting Payment"}
      <Loader2 className="animate-spin h-5 w-5 text-white mx-2" />
    </Button>
  ) : (
    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" ref={ref}>
      {isEdit ? "Update Payment" : "Submit Payment"}
    </Button>
  );
});

SubmitButtonWithContent.displayName = "SubmitButtonWithContent";
