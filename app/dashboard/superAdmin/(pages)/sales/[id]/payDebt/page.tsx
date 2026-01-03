"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { API } from "@/lib/config";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Order {
  id: string;
  orderId: string;
  total: number;
  isDebt: boolean;
  debtAmount: number;
  debtPaid: number;
  cashAmount?: number;
  digitalAmount?: number;
  items: {
    product: {
      name: string;
    };
    price: number;
    quantity: number;
  }[];
}

export default function PayDebtPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [digitalAmount, setDigitalAmount] = useState(0);

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`${API}/superAdmin/sell/${orderId}`);
        setOrder(response.data);
      } catch (error: any) {
        toast.error(error.response?.data?.error || "Failed to load order");
        router.push("/dashboard/superAdmin/sales");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, router]);

  const totalPayment = cashAmount + digitalAmount;
  const remainingDebt = order ? order.debtAmount - order.debtPaid : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalPayment <= 0) {
      toast.error("Payment amount must be greater than 0");
      return;
    }

    if (totalPayment > remainingDebt) {
      toast.error(`Payment cannot exceed remaining debt of ${remainingDebt.toFixed(2)}`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(`${API}/superAdmin/sell/${orderId}/payDebt`, {
        cashAmount,
        digitalAmount,
      });

      toast.success(response.data.message);
      
      setTimeout(() => {
        router.push("/dashboard/superAdmin/sales");
      }, 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to process payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  if (!order.isDebt || remainingDebt <= 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No Debt to Pay</h2>
          <p className="text-gray-600 mb-6">This order has been fully paid.</p>
          <Link href="/dashboard/superAdmin/sales">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sales
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Toaster />
      
      <div className="mb-6">
        <Link href="/dashboard/superAdmin/sales">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6">Pay Debt</h1>

        {/* Order Summary */}
        <div className="bg-gray-50 p-6 rounded-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-semibold">{order.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold">{order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Already Paid:</span>
              <span className="font-semibold text-green-600">{order.debtPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-700 font-semibold">Remaining Debt:</span>
              <span className="font-bold text-red-600 text-lg">{(order.debtAmount - order.debtPaid).toFixed(2)}</span>
            </div>
          </div>

          {/* Items */}
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Items:</h3>
            <ul className="space-y-1">
              {order.items.map((item, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {item.product.name} x{item.quantity} = {(item.price * item.quantity).toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                💵 Cash Payment
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={order.debtAmount}
                value={cashAmount}
                onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-400 focus:outline-none"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                💳 Digital Payment
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={order.debtAmount}
                value={digitalAmount}
                onChange={(e) => setDigitalAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-semibold">Total Payment:</span>
              <span className="text-2xl font-bold text-blue-600">{totalPayment.toFixed(2)}</span>
            </div>
            {totalPayment > 0 && (
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-gray-600">Remaining After Payment:</span>
                <span className="font-semibold text-gray-700">
                  {(order.debtAmount - totalPayment).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {totalPayment > order.debtAmount && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
              ⚠️ Payment amount exceeds remaining debt!
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || totalPayment <= 0 || totalPayment > order.debtAmount}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-md"
          >
            {submitting ? (
              <Loader2 className="animate-spin h-5 w-5 mx-auto" />
            ) : (
              "Process Payment"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
