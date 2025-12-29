"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Transfer = {
  id: string;
  fromType: string;
  fromStore?: { name: string };
  fromShop?: { name: string };
  toType: string;
  toStore?: { name: string };
  toShop?: { name: string };
  sku: {
    sku: string;
    variant: {
      color: string;
      product: {
        name: string;
      };
    };
    size: string;
  };
  quantity: number;
  notes?: string;
  user: {
    name?: string;
    email?: string;
  };
  transferDate: Date;
};

export const columns: ColumnDef<Transfer>[] = [
  {
    accessorKey: "transferDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return new Date(row.original.transferDate).toLocaleDateString();
    },
  },
  {
    accessorKey: "from",
    header: "From",
    cell: ({ row }) => {
      const { fromType, fromStore, fromShop } = row.original;
      const location = fromType === "store" ? fromStore?.name : fromShop?.name;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{location}</span>
          <span className="text-xs text-gray-500">({fromType})</span>
        </div>
      );
    },
  },
  {
    id: "arrow",
    cell: () => <ArrowRight className="h-4 w-4 text-gray-400" />,
  },
  {
    accessorKey: "to",
    header: "To",
    cell: ({ row }) => {
      const { toType, toStore, toShop } = row.original;
      const location = toType === "store" ? toStore?.name : toShop?.name;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{location}</span>
          <span className="text-xs text-gray-500">({toType})</span>
        </div>
      );
    },
  },
  {
    accessorKey: "product",
    header: "Product",
    cell: ({ row }) => {
      const { sku } = row.original;
      return (
        <div>
          <div className="font-medium">{sku.variant.product.name}</div>
          <div className="text-sm text-gray-500">
            {sku.variant.color} - {sku.size}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "sku.sku",
    header: "SKU",
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Quantity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span className="font-semibold">{row.original.quantity}</span>;
    },
  },
  {
    accessorKey: "user.name",
    header: "By",
    cell: ({ row }) => {
      return row.original.user.name || row.original.user.email || "-";
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      return row.original.notes || "-";
    },
  },
];
