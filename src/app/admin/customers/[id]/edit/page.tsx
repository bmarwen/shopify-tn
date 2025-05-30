// src/app/admin/customers/[id]/edit/page.tsx
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CustomerForm from "@/components/admin/customers/customer-form";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditCustomerPage({ params }: PageProps) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/customers");
  }

  const shopId = session.user.shopId;
  const customerId = params.id;

  // Get customer details
  const customer = await db.user.findFirst({
    where: {
      id: customerId,
      shopId,
      role: "CUSTOMER",
    },
    include: {
      addresses: true,
    },
  });

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/admin/customers/${customerId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customer
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Edit Customer
          </h1>
          <p className="text-gray-500">
            Update {customer.name}'s information
          </p>
        </div>
      </div>

      <CustomerForm 
        customer={customer} 
        shopId={shopId} 
        isEditing={true} 
      />
    </div>
  );
}
