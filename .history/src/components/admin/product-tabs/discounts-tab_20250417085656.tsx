// src/components/admin/product-tabs/discounts-tab.tsx
import { useState, useEffect } from "react";
import { Control } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash, Edit } from "lucide-react";
import { ProductFormValues, Discount } from "../product-form-types";

interface DiscountsTabProps {
  control: Control<ProductFormValues>;
  productId?: string;
  shopId: string;
}

export default function DiscountsTab({
  control,
  productId,
  shopId,
}: DiscountsTabProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [currentDiscount, setCurrentDiscount] = useState<Discount>({
    percentage: 0,
    enabled: true,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    productId: productId || "",
  });

  // Fetch discounts for this product when component mounts
  useEffect(() => {
    if (productId) {
      fetchDiscounts();
    } else {
      setIsLoading(false);
    }
  }, [productId]);

  const fetchDiscounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/discounts?productId=${productId}`);
      if (response.ok) {
        const data = await response.json();
        setDiscounts(data);
      }
    } catch (error) {
      console.error("Error fetching discounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDiscount = async () => {
    try {
      const payload = {
        ...currentDiscount,
        productId,
      };

      const url = editingDiscount
        ? `/api/discounts/${editingDiscount.id}`
        : "/api/discounts";
      const method = editingDiscount ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchDiscounts();
        setIsDialogOpen(false);
        resetDiscountForm();
      }
    } catch (error) {
      console.error("Error saving discount:", error);
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    try {
      const response = await fetch(`/api/discounts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchDiscounts();
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error("Error deleting discount:", error);
    }
  };

  const resetDiscountForm = () => {
    setEditingDiscount(null);
    setCurrentDiscount({
      percentage: 0,
      enabled: true,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      productId: productId || "",
    });
  };

  const handleEditDiscount = (discount: Discount) => {
    setEditingDiscount(discount);
    setCurrentDiscount({
      ...discount,
      startDate: new Date(discount.startDate).toISOString().split("T")[0],
      endDate: new Date(discount.endDate).toISOString().split("T")[0],
    });
    setIsDialogOpen(true);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card className="border-0 shadow">
      <CardHeader
        style={{ backgroundColor: "#2c3e50" }}
        className="text-white rounded-t-lg"
      >
        <CardTitle className="text-xl font-medium">Product Discounts</CardTitle>
        <CardDescription
          style={{ color: "#bdc3c7" }}
          className="mt-1 text-base"
        >
          Manage price discounts for this product
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 bg-white">
        {isLoading ? (
          <div className="text-center py-4">Loading discounts...</div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium" style={{ color: "#2c3e50" }}>
                Active Discounts
              </h3>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    style={{
                      backgroundColor: "#16a085",
                      color: "white",
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Discount
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDiscount ? "Edit Discount" : "Add New Discount"}
                    </DialogTitle>
                    <DialogDescription>
                      Create a discount for this product.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="percentage"
                        className="text-right"
                        style={{ color: "#2c3e50" }}
                      >
                        Discount %
                      </Label>
                      <Input
                        id="percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={currentDiscount.percentage}
                        onChange={(e) =>
                          setCurrentDiscount({
                            ...currentDiscount,
                            percentage: Number(e.target.value),
                          })
                        }
                        className="col-span-3 border-2"
                        style={{
                          borderColor: "#bdc3c7",
                          color: "#2c3e50",
                          backgroundColor: "white",
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="startDate"
                        className="text-right"
                        style={{ color: "#2c3e50" }}
                      >
                        Start Date
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={currentDiscount.startDate}
                        onChange={(e) =>
                          setCurrentDiscount({
                            ...currentDiscount,
                            startDate: e.target.value,
                          })
                        }
                        className="col-span-3 border-2"
                        style={{
                          borderColor: "#bdc3c7",
                          color: "#2c3e50",
                          backgroundColor: "white",
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="endDate"
                        className="text-right"
                        style={{ color: "#2c3e50" }}
                      >
                        End Date
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={currentDiscount.endDate}
                        onChange={(e) =>
                          setCurrentDiscount({
                            ...currentDiscount,
                            endDate: e.target.value,
                          })
                        }
                        className="col-span-3 border-2"
                        style={{
                          borderColor: "#bdc3c7",
                          color: "#2c3e50",
                          backgroundColor: "white",
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="enabled"
                        className="text-right"
                        style={{ color: "#2c3e50" }}
                      >
                        Enabled
                      </Label>
                      <div className="flex items-center space-x-2 col-span-3">
                        <Switch
                          id="enabled"
                          checked={currentDiscount.enabled}
                          onCheckedChange={(checked) =>
                            setCurrentDiscount({
                              ...currentDiscount,
                              enabled: checked,
                            })
                          }
                        />
                        <Label htmlFor="enabled" style={{ color: "#2c3e50" }}>
                          {currentDiscount.enabled ? "Active" : "Inactive"}
                        </Label>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetDiscountForm();
                      }}
                      style={{
                        borderColor: "#bdc3c7",
                        color: "#2c3e50",
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateDiscount}
                      style={{
                        backgroundColor: "#16a085",
                        color: "white",
                      }}
                    >
                      {editingDiscount ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {discounts.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p style={{ color: "#2c3e50" }}>
                  No discounts have been created for this product yet.
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  type="button"
                  className="mt-4"
                  style={{
                    backgroundColor: "#16a085",
                    color: "white",
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Discount
                </Button>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.map((discount) => (
                      <TableRow key={discount.id}>
                        <TableCell className="font-medium">
                          {discount.percentage}%
                        </TableCell>
                        <TableCell>{formatDate(discount.startDate)}</TableCell>
                        <TableCell>{formatDate(discount.endDate)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              discount.enabled
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {discount.enabled ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditDiscount(discount)}
                            className="text-gray-500 hover:text-indigo-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog
                            open={deleteDialogOpen}
                            onOpenChange={setDeleteDialogOpen}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingDiscount(discount);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-gray-500 hover:text-red-600"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Discount
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this discount?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (editingDiscount?.id) {
                                      handleDeleteDiscount(editingDiscount.id);
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
