// src/app/admin/custom-fields/page.tsx (with improved contrast)
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import CustomFieldsTable from "@/components/admin/custom-fields-table";
import AddCustomFieldForm from "@/components/admin/add-custom-field-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function CustomFieldsPage() {
  // Check authentication and authorization
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/custom-fields");
  }

  const shopId = session.user.shopId;

  // Fetch all custom fields for this shop
  const customFields = await db.customField.findMany({
    where: { shopId },
    orderBy: { name: "asc" },
  });

  // Count products using each custom field
  const fieldsWithUsage = await Promise.all(
    customFields.map(async (field) => {
      const usageCount = await db.variantCustomFieldValue.count({
        where: { customFieldId: field.id },
      });

      return {
        ...field,
        usageCount,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-800">
          Custom Fields
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-zinc-800 border-b border-indigo-200">
              <CardTitle className="text-indigo-800 font-semibold">
                Custom Fields List
              </CardTitle>
              <CardDescription className="text-indigo-700">
                Manage custom fields for your products
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 bg-white">
              <CustomFieldsTable customFields={fieldsWithUsage} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50 border-b border-indigo-200">
              <CardTitle className="text-indigo-800 font-semibold">
                Add Custom Field
              </CardTitle>
              <CardDescription className="text-indigo-700">
                Create a new custom field for your products
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 bg-white">
              <AddCustomFieldForm />
            </CardContent>
          </Card>

          <div className="mt-6">
            <Card className="border-blue-300 shadow-sm">
              <CardHeader className="bg-blue-100 border-b border-blue-200">
                <CardTitle className="text-blue-800 text-lg font-semibold">
                  About Custom Fields
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-white">
                <p className="text-blue-800 text-sm">
                  Custom fields allow you to add additional information to your
                  products beyond the standard fields. This is useful for:
                </p>
                <ul className="list-disc list-inside mt-2 text-blue-800 text-sm space-y-1">
                  <li>Product specifications (material, dimensions, etc.)</li>
                  <li>
                    Technical information (compatibility, system requirements)
                  </li>
                  <li>Additional product details (origin, certification)</li>
                  <li>And any other product-specific information</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
