// src/app/admin/layout.tsx
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminSidebar from "@/components/admin/sidebar";
import AdminHeader from "@/components/admin/header";
import { ToastsProvider } from "@/components/providers/toast-provider";
import { ShopSettingsProvider } from "@/contexts/shop-settings.context";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and has proper role
  if (
    !session ||
    (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
  ) {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <ShopSettingsProvider>
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 bg-gray-100 p-6">
            <div className="max-w-none">
              {children}
            </div>
          </main>
          <ToastsProvider />
        </div>
      </div>
    </ShopSettingsProvider>
  );
}
