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
  const [cashAmount, setCashAmount] = useState<string>("");
  const [digitalAmount, setDigitalAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const remainingBalance = amount - amountPaid;

  const handlePayment = async () => {
    const cash = parseFloat(cashAmount) || 0;
    const digital = parseFloat(digitalAmount) || 0;
    const totalPayment = cash + digital;

    if (totalPayment <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (totalPayment > remainingBalance) {
      toast.error("Payment amount exceeds remaining balance");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/${role}/bankTransaction/pay/${transactionId}`, {
        cashAmount: cash,
        digitalAmount: digital,
      });

      toast.success("Payment recorded successfully");
      setOpen(false);
      setCashAmount("");
      setDigitalAmount("");
      
      // Invalidate queries to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ["bankPayment"] });
      queryClient.invalidateQueries({ queryKey: ["bank"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      
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
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cash">💵 Cash Payment</Label>
              <Input
                id="cash"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="digital">💳 Digital Payment</Label>
              <Input
                id="digital"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={digitalAmount}
                onChange={(e) => setDigitalAmount(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Total Payment: <span className="font-semibold">{((parseFloat(cashAmount) || 0) + (parseFloat(digitalAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
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
