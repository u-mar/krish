"use client";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import DeleteAlertDialog from "@/app/dashboard/_components/DeleteAlertDialog";

export type Category = {
  no: number;
  id: string;
  name: number;
  products: [];
  createdAt: string;
};

export const columns: ColumnDef<Category>[] = [
  {
    accessorKey: "no",
    header: "NO",
    cell: ({ row }) => {
      return <span>{row.index + 1}</span>;
    },
  },
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",

    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "products",

    header: () => <div className="text-right">Products </div>,
    cell: ({ row }: { row: any }) => {
      const products = row.getValue("products");
      const productsLength = products?.length || 0;
      return <div className="text-right font-medium">{productsLength}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: () => <div className="text-right">Created At</div>,
    cell: ({ row }) => {
      const formattedDate = new Date(row.getValue("createdAt")).toDateString();
      return <div className="text-right font-medium">{formattedDate}</div>;
    },
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const category = row.original;

      return (
        <div className="flex items-center space-x-2">
          {/* View Button */}
          {/* <Link href={`/dashboard/superAdmin/product/category/view/${category.id}`}>
            <button className="px-3 py-1 border bg-gray-500 text-white border-gray-400 rounded hover:bg-gray-400">
              View
            </button>
          </Link> */}

          {/* Edit Button */}
          <Link
            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            href={`/dashboard/superAdmin/product/category/${category.id}`}>
            Edit
          </Link>
          {/* Delete Button */}
          <DeleteAlertDialog id={category.id} type="category" />
        </div>
      );
    },
  },
];
