// src/app/admin/customers/new/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import CustomerForm from "@/components/admin/customers/customer-form";

export default async function NewCustomerPage() {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/customers/new");
  }

  const shopId = session.user.shopId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-800">
          Add New Customer
        </h1>
        <p className="text-gray-500">
          Create a new customer account for your shop
        </p>
      </div>

      <CustomerForm shopId={shopId} />
    </div>
  );
}
