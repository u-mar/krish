"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { API } from "@/lib/config";
import { useQueryClient } from "@tanstack/react-query";

interface PayDebtDialogProps {
  transactionId: string;
  amount: number;
  amountPaid: number;
  role: "superAdmin" | "admin";
}

const PayDebtDialog = ({
  transactionId,
  amount,
  amountPaid,
  role,
}: PayDebtDialogProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const remainingBalance = amount - amountPaid;

  const handlePayment = async () => {
    const payment = parseFloat(paymentAmount);

    if (!payment || payment <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (payment > remainingBalance) {
      toast.error("Payment amount exceeds remaining balance");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/${role}/bankTransaction/pay/${transactionId}`, {
        paymentAmount: payment,
      });

      toast.success("Payment recorded successfully");
      setOpen(false);
      setPaymentAmount("");
      
      // Invalidate queries to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ["bankPayment"] });
      queryClient.invalidateQueries({ queryKey: ["bank"] });
      
      router.refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
          Pay
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Enter the amount being paid towards this debt.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Total Amount</Label>
            <Input
              value={amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              disabled
            />
          </div>
          <div className="grid gap-2">
            <Label>Amount Already Paid</Label>
            <Input
              value={amountPaid.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              disabled
            />
          </div>
          <div className="grid gap-2">
            <Label>Remaining Balance</Label>
            <Input
              value={remainingBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              disabled
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment">Payment Amount</Label>
            <Input
              id="payment"
              type="number"
              step="0.01"
              placeholder="Enter payment amount"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={loading}>
            {loading ? "Processing..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayDebtDialog;
