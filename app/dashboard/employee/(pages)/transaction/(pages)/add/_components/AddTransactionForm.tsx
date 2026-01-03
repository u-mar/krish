"use client";
import { z } from "zod";
import React, { useRef, useState } from "react";
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
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { transactionSchema } from "@/app/validationSchema/transactionSchema";

const AddTransactionForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const adjustToEastAfricaTime = (date: Date) => {
    const offset = 3 * 60 * 60 * 1000;
    const eastAfricaDate = new Date(date.getTime() + offset);
    return eastAfricaDate.toISOString().slice(0, 19);
  };

  const handleEnterPress = (
    event: React.KeyboardEvent,
    nextRef: React.RefObject<any>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (nextRef.current && typeof nextRef.current.focus === "function") {
        nextRef.current.focus();
      }
    }
  };

  const cashAmountRef = useRef<HTMLInputElement | null>(null);
  const digitalAmountRef = useRef<HTMLInputElement | null>(null);
  const transactionDetailsRef = useRef<HTMLTextAreaElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      cashAmount: 0,
      digitalAmount: 0,
      details: "",
      tranDate: adjustToEastAfricaTime(new Date()),
    },
  });

  const onSubmit = async (values: z.infer<typeof transactionSchema>) => {
    const formattedDate = values.tranDate
      ? new Date(values.tranDate).toISOString()
      : new Date().toISOString();
    
    setLoading(true);
    try {
      await axios.post(`${API}/employee/transaction`, {
        ...values,
        tranDate: formattedDate,
      });
      
      queryClient.invalidateQueries({ queryKey: ["transaction"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      
      toast.success("Successfully Created Expense");
      router.push("/dashboard/employee/transaction");
    } catch (error) {
      console.error("Error creating transaction", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="max-w-2xl mx-auto my-10 p-4 shadow-lg rounded-lg">
        <CardHeader className="mb-6">
          <CardTitle className="text-2xl font-bold">Add Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cashAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>💵 Cash Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Enter cash amount"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                          onKeyDown={(e) => handleEnterPress(e, digitalAmountRef)}
                          onWheel={(e) => e.currentTarget.blur()}
                          ref={cashAmountRef}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="digitalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>💳 Digital Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Enter digital amount"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                          onKeyDown={(e) => handleEnterPress(e, transactionDetailsRef)}
                          onWheel={(e) => e.currentTarget.blur()}
                          ref={digitalAmountRef}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Expense:</span>
                  <span className="text-xl font-bold text-red-600">
                    {((form.watch("cashAmount") || 0) + (form.watch("digitalAmount") || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter expense details (what was this for?)"
                        {...field}
                        rows={3}
                        ref={(e) => {
                          field.ref(e);
                          transactionDetailsRef.current = e;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            handleEnterPress(e, submitButtonRef);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tranDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SubmitButtonWithContent
                loading={loading}
                ref={submitButtonRef}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
      <Toaster />
    </>
  );
};

export default AddTransactionForm;

export const SubmitButtonWithContent = React.forwardRef<HTMLButtonElement, { loading: boolean }>(
  ({ loading }, ref) => {
    if (loading) {
      return (
        <Button className="space-x-2 gap-x-1 bg-gray-400" disabled ref={ref}>
          Submitting Expense
          <Loader2 className="animate-spin h-5 w-5 text-white mx-2" />
        </Button>
      );
    }

    return (
      <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" ref={ref}>
        Submit Expense
      </Button>
    );
  }
);

SubmitButtonWithContent.displayName = "SubmitButtonWithContent";
