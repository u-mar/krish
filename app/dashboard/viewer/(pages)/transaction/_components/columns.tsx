import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";

interface Transaction {
  id: string;
  no: number;
  user: {
    name: string;
  };
  amount: number;
  cashAmount?: number;
  digitalAmount?: number;
  tranDate: string;
  details: string;
  createdAt: string;
}

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "no",
    header: "NO",
    cell: ({ row }) => {
      return <span>{row.index + 1}</span>;
    },
  },
  {
    accessorKey: "details",
    header: "Expense Details",
    cell: ({ row }) => {
      return <span>{row.original.details || "-"}</span>;
    },
  },
  {
    accessorKey: "cashAmount",
    header: "💵 Cash",
    cell: ({ row }) => {
      const cash = row.original.cashAmount || 0;
      return <span className="text-green-600 font-medium">{cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    },
  },
  {
    accessorKey: "digitalAmount",
    header: "💳 Digital",
    cell: ({ row }) => {
      const digital = row.original.digitalAmount || 0;
      return <span className="text-blue-600 font-medium">{digital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    },
  },
  {
    accessorKey: "amount",
    header: "Total Amount",
    cell: ({ row }) => {
      const formattedAmount = row.original.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return <span className="font-semibold text-red-600">{formattedAmount}</span>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return format(date, "PPpp"); // Format date to include full date and time
    },
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      const transaction = row.original;

      return (
        <div className="flex items-center space-x-2">
          {/* View Button */}
          <Link href={`/dashboard/viewer/transaction/view/${transaction.id}`}
          className="px-3 py-1 border border-gray-400 rounded hover:bg-gray-100">
              View
          </Link>
        </div>
      );
    },
  },
];


