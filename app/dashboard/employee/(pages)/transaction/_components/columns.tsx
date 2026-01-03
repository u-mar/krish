import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";
import DeleteAlertDialog from "../../../_components/DeleteAlertDialog";

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

      const HOURS_48_IN_MILLISECONDS = 48 * 60 * 60 * 1000;

      function isWithin48Hours(date: Date): boolean {
        const currentTime = new Date().getTime();
        const createdTime = new Date(date).getTime();
        return currentTime - createdTime <= HOURS_48_IN_MILLISECONDS;
      }

      const within48Hours = isWithin48Hours(new Date(transaction.createdAt));

      return (
        <div className="flex items-center space-x-2">
          {/* View Button */}
          <Link href={`/dashboard/employee/transaction/view/${transaction.id}`}>
            <button className="px-3 py-1 border border-gray-400 rounded hover:bg-gray-100">
              View
            </button>
          </Link>

          {/* Edit Button */}
          <div
            className={`${within48Hours ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
            title={
              within48Hours
                ? "Edit this transaction"
                : "Editing disabled for transactions older than 48 hours"
            }
          >
            {within48Hours ? (
              <Link href={`/dashboard/employee/transaction/edit/${transaction.id}`}>
                <button className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                  Edit
                </button>
              </Link>
            ) : (
              <button className="px-3 py-1 bg-yellow-500 text-white rounded">
                Edit
              </button>
            )}
          </div>

          {/* Delete Button */}
          <div
            className={`${within48Hours ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
            title={
              within48Hours
                ? "Delete this transaction"
                : "Deleting disabled for transactions older than 48 hours"
            }
          >
            {within48Hours ? (
              <DeleteAlertDialog id={transaction.id} type="transaction" />
            ) : (
              <button className="px-3 py-1 bg-red-500 text-white rounded">
                Delete
              </button>
            )}
          </div>
        </div>
      );
    },
  }
];


