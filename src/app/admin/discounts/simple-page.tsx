// src/app/admin/discounts/page.tsx - Simple version
import { getServerSession } from \"next-auth/next\";
import Link from \"next/link\";
import { redirect } from \"next/navigation\";
import { authOptions } from \"@/lib/auth\";
import { db } from \"@/lib/prisma\";
import { Button } from \"@/components/ui/button\";
import { Plus } from \"lucide-react\";

export default async function DiscountsPage() {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect(\"/login?callbackUrl=/admin/discounts\");
  }
  const shopId = session.user.shopId;

  // Get discounts without pagination for now
  const discounts = await db.discount.findMany({
    where: {
      product: {
        shopId,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          variants: {
            select: {
              price: true,
            },
            take: 1,
            orderBy: {
              price: 'asc',
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: \"desc\",
    },
    take: 50, // Hard limit for now
  });

  return (
    <div className=\"space-y-6\">
      <div className=\"flex justify-between items-center\">
        <h1 className=\"text-2xl font-bold\">Discounts ({discounts.length})</h1>
        <Link href=\"/admin/discounts/new\">
          <Button>
            <Plus className=\"mr-2 h-4 w-4\" />
            Add Discount
          </Button>
        </Link>
      </div>

      <div className=\"bg-white rounded-lg border p-6\">
        {discounts.length === 0 ? (
          <p className=\"text-center text-gray-500\">
            No discounts found.{\" \"}\n            <Link href=\"/admin/discounts/new\" className=\"text-blue-600 hover:underline\">\n              Add your first discount\n            </Link>\n          </p>\n        ) : (\n          <div className=\"space-y-4\">\n            {discounts.map((discount) => (\n              <div key={discount.id} className=\"border rounded p-4\">\n                <div className=\"flex justify-between items-center\">\n                  <div>\n                    <h3 className=\"font-semibold\">{discount.product.name}</h3>\n                    <p className=\"text-sm text-gray-600\">                      {discount.percentage}% off\n                      {discount.product.variants[0] && (\n                        <span className=\"ml-2\">\n                          ${discount.product.variants[0].price.toFixed(2)} →{\" \"}\n                          ${((discount.product.variants[0].price * (100 - discount.percentage)) / 100).toFixed(2)}\n                        </span>\n                      )}\n                    </p>\n                    <p className=\"text-xs text-gray-500\">\n                      {new Date(discount.startDate).toLocaleDateString()} to{\" \"}\n                      {new Date(discount.endDate).toLocaleDateString()}\n                    </p>\n                  </div>\n                  <div className=\"flex items-center space-x-2\">\n                    <span className={`px-2 py-1 rounded text-xs ${\n                      discount.enabled ? \"bg-green-100 text-green-800\" : \"bg-gray-100 text-gray-800\"\n                    }`}>\n                      {discount.enabled ? \"Active\" : \"Inactive\"}\n                    </span>\n                  </div>\n                </div>\n              </div>\n            ))}\n          </div>\n        )}\n      </div>\n    </div>\n  );\n}\n