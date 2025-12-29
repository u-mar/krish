"use client";
import { z } from "zod";
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { bankSchema } from "@/app/validationSchema/bankSchema";
import { BankAccount } from "@prisma/client";



const AddBankForm = ({ bank }: { bank?: BankAccount }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { control, setValue, getValues } = useForm();

  const form = useForm<z.infer<typeof bankSchema>>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      name: bank?.name || "",
      userId: bank?.userId || undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof bankSchema>) => {
    setLoading(true);
    try {
      const response = bank
        ? await axios.patch(`${API}/superAdmin/bank/${bank.id}`, values)
        : await axios.post(`${API}/superAdmin/bank`, values);

      queryClient.invalidateQueries({ queryKey: ["bank"] });
      toast.success(`Successfully ${bank ? "Updated" : "Created"} Customer`);
      router.push("/dashboard/superAdmin/bank");
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="max-w-4xl mx-auto my-10 p-6 shadow-lg rounded-lg bg-white">
        <CardHeader className="mb-4">
          <CardTitle className="text-3xl font-semibold text-gray-700">Add Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Customer Name */}
              <div className="grid grid-cols-1  gap-4 border-b pb-4">

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input
                          aria-autocomplete="none"
                          autoComplete="off"
                          placeholder="Enter customer name"
                          type="text"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>


              {/* Submit Button */}
              <div className="flex justify-center">
                <SubmitButtonWithContent loading={form.formState.isSubmitting || loading} />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Toaster />
    </>
  );
};

export default AddBankForm;

// Submit Button Component
export const SubmitButtonWithContent = React.forwardRef<HTMLButtonElement, { loading: boolean }>(
  ({ loading }, ref) => {
    if (loading) {
      return (
        <Button className="space-x-2 gap-x-1 bg-gray-400" disabled ref={ref}>
          Submitting Customer
          <Loader2 className="animate-spin h-5 w-5 text-white mx-2" />
        </Button>
      );
    }
    return (
      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" ref={ref}>
        Submit Customer
      </Button>
    );
  }
);
SubmitButtonWithContent.displayName = "SubmitButtonWithContent";



