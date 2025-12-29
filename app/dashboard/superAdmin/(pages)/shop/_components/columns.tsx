"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, ShoppingBag, Package, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import DeleteAlertDialog from "@/app/dashboard/_components/DeleteAlertDialog";

export type Shop = {
  id: string;
  name: string;
  description?: string;
  _count?: {
    inventory: number;
    sells: number;
  };
  createdAt: Date;
};

export const columns: ColumnDef<Shop>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Shop Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded">
            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const desc = row.original.description;
      return (
        <span className={desc ? "text-sm" : "text-sm text-muted-foreground italic"}>
          {desc || "No description"}
        </span>
      );
    },
  },
  {
    accessorKey: "_count.inventory",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <Package className="mr-2 h-4 w-4" />
          Products
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const count = row.original._count?.inventory || 0;
      return (
        <Badge variant={count > 0 ? "default" : "secondary"} className="font-mono">
          {count}
        </Badge>
      );
    },
  },
  {
    accessorKey: "_count.sells",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Total Orders
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const count = row.original._count?.sells || 0;
      return (
        <Badge variant={count > 0 ? "default" : "outline"} className="font-mono">
          {count}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const shop = row.original;

      return (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/superAdmin/shop/view/${shop.id}`}>
            <Button variant="outline" size="sm">
              View
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href={`/dashboard/superAdmin/shop/edit/${shop.id}`}>
                <DropdownMenuItem>Edit</DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DeleteAlertDialog id={shop.id} type="shop" inDropdown={true} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
