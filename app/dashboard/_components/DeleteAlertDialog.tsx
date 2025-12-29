"use client";
import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/config";
import { HiOutlineTrash } from "react-icons/hi";

import { useQueryClient } from "@tanstack/react-query";

const DeleteAlertDialog = ({ id, type, inDropdown = false }: { id: string; type: string; inDropdown?: boolean }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (type === "product") {
        await axios.delete(`${API}/admin/product/${id}`);
        queryClient.invalidateQueries({ queryKey: [`product`] });
      } else if (type === "category") {
        await axios.delete(`${API}/admin/category/${id}`);
        queryClient.invalidateQueries({ queryKey: [`category`] });
      } else if (type === "order") {
        await axios.delete(`${API}/admin/sell/${id}`);
        queryClient.invalidateQueries({ queryKey: [`order`] });
      } else if (type === "user") {
        await axios.delete(`${API}/admin/user/${id}`);
        queryClient.invalidateQueries({ queryKey: [`user`] });
      } else if (type === "transaction") {
        await axios.delete(`${API}/admin/transaction/${id}`);
        queryClient.invalidateQueries({ queryKey: [`transaction`] });
      } else if (type === "transactionCategory") {
        await axios.delete(`${API}/admin/transaction/category/${id}`);
        queryClient.invalidateQueries({ queryKey: [`transactionCategory`] });
      }
       else if (type === "customer" || type === "bank") {
        await axios.delete(`${API}/admin/bank/${id}`);
        queryClient.invalidateQueries({ queryKey: [`bank`] });
      }
       else if (type === "bankPayment") {
        await axios.delete(`${API}/admin/bankTransaction/${id}`);
        queryClient.invalidateQueries({ queryKey: [`bankPayment`] });
      }
       else if (type === "stock") {
        await axios.delete(`${API}/admin/product/stock/${id}`);
        queryClient.invalidateQueries({ queryKey: [`StockProduct`] });
      }
       else if (type === "store") {
        await axios.delete(`${API}/superAdmin/store/${id}`);
        queryClient.invalidateQueries({ queryKey: [`stores`] });
      }
       else if (type === "shop") {
        await axios.delete(`${API}/superAdmin/shop/${id}`);
        queryClient.invalidateQueries({ queryKey: [`shops`] });
      }
  
      // Successful deletion
      router.refresh();
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
      setOpen(false);
    } catch (error: any) {
      console.error("Error during deletion:", error);
  
      // Check if the error response contains a specific message
      const errorMessage = error?.response?.data?.error || "Something went wrong";
      
      // Show more detailed error messages if available
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  if (inDropdown) {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {loading ? (
          <div className="px-3 py-1 border bg-red-600 text-white flex border-gray-400 rounded hover:bg-red-500 cursor-pointer items-center">
            Delete
            <Loader2 className="animate-spin h-4 w-4 text-white mx-2" />
          </div>
        ) : (
          <div className="px-3 py-1 border bg-red-600 text-white border-gray-400 rounded hover:bg-red-500 cursor-pointer">
            Delete
          </div>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
export default DeleteAlertDialog;
