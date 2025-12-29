"use client";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart2,
  Settings,
  User,
  HelpCircle,
  Store,
  Send,
  Group,
  MonitorUp,
  ArrowRightLeft,
  Landmark,
  PackagePlus,
} from "lucide-react";
// import SidebarItem from "./item";
import Link from "next/link";
import SidebarItem from "./sub-item";
import LogoutDialog from "./LogoutDialog";
import { COMPANY_NAME } from "@/lib/config";


const superAdminRoutes = [
  {
    title: "DISCOVER",
    items: [
      {
        name: "Dashboard",
        path: "/dashboard/superAdmin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        name: "Products",
        path: "/dashboard/superAdmin/product",
        icon: Package,
      },
      {
        name: "Category",
        path: "/dashboard/superAdmin/product/category",
        icon: Group,
      },
      {
        name: "Stores",
        path: "/dashboard/superAdmin/store",
        icon: Store,
        new: true,
      },
      {
        name: "Shops",
        path: "/dashboard/superAdmin/shop",
        icon: MonitorUp,
        new: true,
      },
      {
        name: "Orders",
        path: "/dashboard/superAdmin/sales",
        icon: ShoppingCart,
      },
      {
        name: "Transfers",
        path: "/dashboard/superAdmin/transfer",
        icon: ArrowRightLeft,
        new: true,
      },
    ],
  },
  {
    title: "FINANCES",
    items: [
      {
        name: "Transactions",
        path: "/dashboard/superAdmin/transaction",
        icon: Send,
      },
      {
        name: "Customers",
        path: "/dashboard/superAdmin/bank",
        icon: Landmark,
      },
      {
        name: "Report",
        icon: BarChart2,
        subItems: [ // Add sub-items directly within the route
          {
            name: "Orders Report",
            path: "/dashboard/superAdmin/report",
          },
          {
            name: "Products Report",
            path: "/dashboard/superAdmin/report/product",
          },
          {
            name: "Transactions Report",
            path: "/dashboard/superAdmin/report/transaction",
          },
          {
            name: "Exchange Report",
            path: "/dashboard/superAdmin/report/exchange",
          },
          {
            name: "Account Report",
            path: "/dashboard/superAdmin/report/account/history",
            new: true,
          },
        ],
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        name: "User",
        path: "/dashboard/superAdmin/user",
        icon: User,
      },
      {
        name: "Settings",
        path: "/dashboard/superAdmin/setting",
        icon: Settings,
      },
      {
        name: "Help",
        path: "/help",
        icon: HelpCircle,
      },
    ],
  },
];
const adminRoutes = [
  {
    title: "DISCOVER",
    items: [
      {
        name: "Dashboard",
        path: "/dashboard/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        name: "Products",
        path: "/dashboard/admin/product",
        icon: Package,
      },
      {
        name: "Category",
        path: "/dashboard/admin/product/category",
        icon: Group,
      },
      {
        name: "Orders",
        path: "/dashboard/admin/sales",
        icon: ShoppingCart,
      },
    ],
  },
  {
    title: "FINANCES",
    items: [
      {
        name: "Transactions",
        path: "/dashboard/admin/transaction",
        icon: Send,
      },
      {
        name: "Customers",
        path: "/dashboard/admin/bank",
        icon: Landmark,
      },
      {
        name: "Report",
        icon: BarChart2,
        subItems: [ // Add sub-items directly within the route
          {
            name: "Orders Report",
            path: "/dashboard/admin/report",
          },
          {
            name: "Products Report",
            path: "/dashboard/admin/report/product",
          },
          {
            name: "Transactions Report",
            path: "/dashboard/admin/report/transaction",
          },
          {
            name: "Exchange Report",
            path: "/dashboard/admin/report/exchange",
          },
          {
            name: "Account Report",
            path: "/dashboard/admin/report/account/history",
            new: true,
          },
        ],
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        name: "User",
        path: "/dashboard/admin/user",
        icon: User,
      },
      {
        name: "Settings",
        path: "/dashboard/admin/setting",
        icon: Settings,
      },
      {
        name: "Help",
        path: "/help",
        icon: HelpCircle,
      },
    ],
  },
];


const viewerRoutes = [
  {
    title: "DISCOVER",
    items: [
      {
        name: "Dashboard",
        path: "/dashboard/viewer",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        name: "Products",
        path: "/dashboard/viewer/product",
        icon: Package,
      },
      {
        name: "Category",
        path: "/dashboard/viewer/product/category",
        icon: Group,
      },
      {
        name: "Orders",
        path: "/dashboard/viewer/sales",
        icon: ShoppingCart,
      },
    ],
  },
  {
    title: "FINANCES",
    items: [
      {
        name: "Transactions",
        path: "/dashboard/viewer/transaction",
        icon: Send,
      },
      {
        name: "Customers",
        path: "/dashboard/viewer/bank",
        icon: Landmark,
      },
      {
        name: "Report",
        icon: BarChart2,
        subItems: [ // Add sub-items directly within the route
          {
            name: "Orders Report",
            path: "/dashboard/viewer/report",
          },
          {
            name: "Products Report",
            path: "/dashboard/viewer/report/product",
          },
          {
            name: "Transactions Report",
            path: "/dashboard/viewer/report/transaction",
          },
          {
            name: "Exchange Report",
            path: "/dashboard/viewer/report/exchange",
          },
          {
            name: "Account Report",
            path: "/dashboard/viewer/report/account/history",
            new: true,
          },
        ],
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        name: "User",
        path: "/dashboard/viewer/user",
        icon: User,
      },
      {
        name: "Settings",
        path: "/dashboard/viewer/setting",
        icon: Settings,
      },
      {
        name: "Help",
        path: "/help",
        icon: HelpCircle,
      },
    ],
  },
];


const employeeRoutes = [
  {
    title: "DISCOVER",
    items: [
      {
        name: "Dashboard",
        path: "/dashboard/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        name: "Products",
        path: "/dashboard/employee/product",
        icon: Package,
      },
      {
        name: "Orders",
        path: "/dashboard/employee/sales",
        icon: ShoppingCart,
      }, {
        name: "Transactions",
        path: "/dashboard/employee/transaction",
        icon: Send,
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        name: "Settings",
        path: "/dashboard/employee/setting",
        icon: Settings,
      },
      {
        name: "Help",
        path: "/dashboard/employee/help",
        icon: HelpCircle,
      },
    ],
  },
];


const SidebarRoutes = ({ role }: { role: string }) => {
  const routes = role === "superAdmin" ? superAdminRoutes : role === "admin" ? adminRoutes : role === "employee" ? employeeRoutes : viewerRoutes;


  return (
    <div className="relative h-full flex flex-col bg-[#0a0a0a] text-white">
      {/* Sidebar Header */}
      <div className="p-6">
        <Link href="/" className="h-10 w-fit text-2xl font-bold text-green-500">
          {COMPANY_NAME}
        </Link>
      </div>

      {/* Sidebar Sections */}
      <div className="flex flex-col w-full overflow-y-auto pb-32 sidebar">
        {routes.map((section, index) => (
          <div key={index} className="mb-6">
            {/* Section Title */}
            <h4 className="pl-6 mb-2 text-xs font-bold text-gray-400 uppercase">
              {section.title}
            </h4>
            {/* Sidebar Items */}
            <div className="flex flex-col space-y-1">
              {section.items.map((item, idx) => (
                <SidebarItem key={idx} item={item} />
              ))}

            </div>
          </div>
        ))}

        <LogoutDialog />
      </div>
    </div>
  );
};

export default SidebarRoutes;
