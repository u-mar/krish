"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowUpDown, User, CreditCard, DollarSign, Calendar, MoreHorizontal, Eye, Edit } from "lucide-react";
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
import DeleteAlertDialog from "@/app/dashboard/superAdmin/_components/DeleteAlertDialog";

// Extended Bank interface to match all column fields
interface Bank {
  id: string;
  no?: number; // Optional, since "no" is dynamically generated in the cell
  accountNumber: string;
  name: string;
  createdAt: string; // ISO date string, expected to be present
  balance: number; // Balance calculated from transactions
  debtOwed: number; // Debt owed after payments
}

// Updated columns to match the Bank type
export const columns: ColumnDef<Bank>[] = [
  {
    accessorKey: "no",
    header: "NO",
    cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.index + 1}</span>, // Generate row number dynamically
  },
  {
    accessorKey: "accountNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Account Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono">
        {row.original.accountNumber}
      </Badge>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <User className="mr-2 h-4 w-4" />
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary/10 rounded">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "debtOwed",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Debt Owed
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const debtOwed = row.original.debtOwed || 0;
      const hasDebt = debtOwed > 0;
      return (
        <Badge 
          variant={hasDebt ? "destructive" : "default"} 
          className="font-mono"
        >
          KSH {debtOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      const date = new Date(row.original.createdAt);
      return (
        <span className="text-sm text-muted-foreground">
          {format(date, "MMM dd, yyyy")}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const bank = row.original;

      return (
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
            <Link href={`/dashboard/superAdmin/bank/view/${bank.id}`}>
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            </Link>
            <Link href={`/dashboard/superAdmin/bank/edit/${bank.id}`}>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DeleteAlertDialog id={bank.id} type="bank" />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
