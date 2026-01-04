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

  // Extract bankAccountId and acc from URL
  const searchParams = useSearchParams();
  const bankAccountId = searchParams.get("bankAccountId") || undefined;
  const acc = searchParams.get("acc") || undefined;

  // Ensure acc and bankAccountId are available
  useEffect(() => {
    if (!bankTransaction && (!bankAccountId || !acc)) {
      toast.error("Missing required parameters");
      router.push("/dashboard/superAdmin/bank");
    }
  }, [bankAccountId, acc, bankTransaction, router]);

  // Initialize form with react-hook-form
  const form = useForm<z.infer<typeof bankTransactionSchema>>({
    resolver: zodResolver(bankTransactionSchema),
    defaultValues: {
      bankAccountId: bankTransaction?.bankAccountId || bankAccountId,
      acc: bankTransaction?.acc || (acc === "credit" ? "cr" : "dr"),
      accountId: bankTransaction?.accountId ?? undefined,
      cashBalance: bankTransaction?.cashBalance || 0,
      digitalBalance: bankTransaction?.digitalBalance || 0,
      details: bankTransaction?.details || "",
    },
  });


  // Prevent scroll on number inputs
  const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
  };


  const onSubmit = async (values: z.infer<typeof bankTransactionSchema>) => {
    console.log('🔵 [DEBT FORM] Submit button clicked');
    console.log('🔵 [DEBT FORM] Form values received:', JSON.stringify(values, null, 2));
    console.log('🔵 [DEBT FORM] Form state:', {
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      errors: form.formState.errors,
    });

    const totalAmount = parseFloat(values.cashBalance?.toString() || "0") || 0;
    console.log('🔵 [DEBT FORM] Parsed amount:', totalAmount);

    if (totalAmount <= 0) {
      console.error('❌ [DEBT FORM] Invalid amount:', totalAmount);
      toast.error("Amount must be greater than zero");
      return;
    }
    console.log('✅ [DEBT FORM] Amount validated:', totalAmount);

    const payload = {
      ...values,
      cashBalance: totalAmount,
      digitalBalance: 0,
    };
    console.log('🔵 [DEBT FORM] Prepared payload:', JSON.stringify(payload, null, 2));

    setLoading(true);
    console.log('🔵 [DEBT FORM] Loading state set to true');
    
    try {
      if (bankTransaction) {
        console.log('🔵 [DEBT FORM] Updating existing debt, ID:', bankTransaction.id);
        const response = await axios.patch(`${API}/superAdmin/bankTransaction/${bankTransaction.id}`, payload);
        console.log('✅ [DEBT FORM] Update successful:', response.data);
        toast.success(`Successfully Updated Debt`);
      } else {
        console.log('🔵 [DEBT FORM] Creating new debt');
        console.log('🔵 [DEBT FORM] API endpoint:', `${API}/superAdmin/bankTransaction`);
        const response = await axios.post(`${API}/superAdmin/bankTransaction`, payload);
        console.log('✅ [DEBT FORM] Creation successful:', response.data);
        toast.success(`Successfully Created Debt`);
      }

      console.log('🔵 [DEBT FORM] Invalidating cache queries');
      queryClient.invalidateQueries({ queryKey: ["bankPayment"] });
      
      const redirectUrl = `/dashboard/superAdmin/bank/view/${bankAccountId || bankTransaction?.bankAccountId}`;
      console.log('🔵 [DEBT FORM] Redirecting to:', redirectUrl);
      router.push(redirectUrl);
    } catch (error: any) {
      console.error('❌ [DEBT FORM] Error occurred:', error);
      console.error('❌ [DEBT FORM] Error response:', error.response?.data);
      console.error('❌ [DEBT FORM] Error status:', error.response?.status);
      console.error('❌ [DEBT FORM] Error message:', error.message);
      toast.error(error.response?.data?.error || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
      console.log('🔵 [DEBT FORM] Loading state set to false');
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
              
              {/* Total Amount Field */}
              <FormField
                control={form.control}
                name="cashBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Enter total debt amount"
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
