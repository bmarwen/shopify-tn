import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import POSSystem from "@/components/admin/pos-system";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Point of Sale | Admin",
  description: "Process in-store orders and manage sales",
};

export default async function POSPage() {
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/pos");
  }

  // Only allow shop admins and staff
  if (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Point of Sale
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Scan products, process orders, and manage in-store sales
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 font-medium">
            Staff: {session.user.name}
          </p>
          <p className="text-sm text-gray-500">
            Shop: {session.user.shopName}
          </p>
        </div>
      </div>
      
      {/* POS System */}
      <POSSystem />
    </div>
  );
}
