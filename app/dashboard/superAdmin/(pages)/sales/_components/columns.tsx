import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";
import DeleteAlertDialog from "@/app/dashboard/superAdmin/_components/DeleteAlertDialog";
import { useRouter } from "next/navigation";
import { Tooltip } from "react-tooltip"; // Assuming a tooltip library, or create your own if needed.

interface Order {
  id: string;
  orderId: string;
  total: number;
  type: string;
  status: string;
  discount: number;
  isDebt: boolean;
  debtAmount: number;
  debtPaid: number;
  createdAt: string;
  items: {
    id: string;
    price: number;
    quantity: number;
    sku: {
      size: string;
      sku: string;
      stockQuantity: number;
      variant: {
        color: string;
      };
    };
    product: {
      name: string;
    };
  }[];
}

export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "orderId",
    header: "Order ID",
    cell: ({ row }) => {
      return <span className="text-gray-700 font-medium">{row.original.orderId}</span>;
    },
  },
  {
    id: "items",
    header: "Items",
    cell: ({ row }) => {
      const order = row.original;
      const [firstItem, ...otherItems] = order.items;

      return (
        <div className="text-gray-700 font-medium">
          <span>
            {firstItem.product.name}
          </span>
          {otherItems.length > 0 && (
            <span
              data-tooltip-id={`tooltip-${order.id}`}
              className="text-blue-500 cursor-pointer ml-2"
            >
              +{otherItems.length} more
            </span>
          )}
          {otherItems.length > 0 && (
            <Tooltip id={`tooltip-${order.id}`} place="top">
              {otherItems.map((item, index) => (
                <div key={index}>
                  {item.product.name}
                </div>
              ))}
            </Tooltip>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "total",
    header: "Total Price",
    cell: ({ row }) => {
      return <span className="text-gray-700 font-semibold">{row.original.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>; // Format total price
    },
  },
  {
    accessorKey: "isDebt",
    header: "Payment Status",
    cell: ({ row }) => {
      const order = row.original;
      
      if (!order.isDebt) {
        return <span className="px-2 py-1 rounded font-semibold bg-green-100 text-green-800">✓ Paid</span>;
      }
      
      if (order.debtAmount <= 0) {
        return <span className="px-2 py-1 rounded font-semibold bg-green-100 text-green-800">✓ Debt Cleared</span>;
      }
      
      return (
        <div className="flex flex-col gap-1">
          <span className="px-2 py-1 rounded font-semibold bg-red-100 text-red-800">
            📋 Debt: {order.debtAmount.toFixed(2)}
          </span>
          {order.debtPaid > 0 && (
            <span className="text-xs text-gray-600">
              Paid: {order.debtPaid.toFixed(2)}
            </span>
          )}
        </div>
      );
    },
  },
  
  // {
  //   accessorKey: "status",
  //   header: "Status",
  //   cell: ({ row }) => {
  //     const statusClass =
  //       row.original.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800";
  //     return (
  //       <span className={`px-2 py-1 rounded font-semibold ${statusClass}`}>
  //         {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
  //       </span>
  //     );
  //   },
  // },
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
      const order = row.original;
      const router = useRouter();

      return (
        <div className="flex items-center space-x-2">
          {/* View Button */}
          <Link href={`/dashboard/superAdmin/sales/view/${order.id}`}>
            <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              View
            </button>
          </Link>

          {/* Pay Debt Button - only show if it's a debt with remaining balance */}
          {order.isDebt && order.debtAmount > 0 && (
            <Link href={`/dashboard/superAdmin/sales/${order.id}/payDebt`}>
              <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                Pay Debt
              </button>
            </Link>
          )}

          {/* Edit Button */}
          <Link href={`/dashboard/superAdmin/sales/edit/${order.id}`}>
            <button className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">
              Edit
            </button>
          </Link>

          {/* Delete Button */}
          <DeleteAlertDialog id={order.id} type="order" />
        </div>
      );
    },
  },
];
