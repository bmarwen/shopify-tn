// src/components/admin/sidebar.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Home,
  Package,
  List,
  ShoppingCart,
  Users,
  Settings,
  BarChart,
  Bell,
  Tag,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isPremium = session?.user?.planType === "PREMIUM";
  const isAdvanced = session?.user?.planType === "ADVANCED" || isPremium;

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Categories", href: "/admin/categories", icon: List },
    { name: "Discounts", href: "/admin/discounts", icon: Tag },
    { name: "Discount Codes", href: "/admin/discount-codes", icon: Ticket },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Customers", href: "/admin/customers", icon: Users },
    { name: "Settings", href: "/admin/settings", icon: Settings },
    // Advanced & Premium features
    {
      name: "Analytics",
      href: "/admin/analytics",
      icon: BarChart,
      requiredPlan: "ADVANCED",
    },
    {
      name: "Notifications",
      href: "/admin/notifications",
      icon: Bell,
      requiredPlan: "ADVANCED",
    },
  ];

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1 bg-gray-800">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <span className="text-xl font-bold text-gray-200">
                {session?.user?.shopName || "Shop Admin"}
              </span>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                // Skip if this feature requires a higher plan than the user has
                if (item.requiredPlan === "ADVANCED" && !isAdvanced)
                  return null;
                if (item.requiredPlan === "PREMIUM" && !isPremium) return null;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      pathname === item.href
                        ? "bg-gray-900 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white",
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md"
                    )}
                  >
                    <item.icon
                      className={cn(
                        pathname === item.href
                          ? "text-gray-300"
                          : "text-gray-400 group-hover:text-gray-300",
                        "mr-3 flex-shrink-0 h-6 w-6"
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
