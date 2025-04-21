// src/components/admin/product-tabs/discount-codes-tab.tsx
import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash, Edit, SearchIcon } from "lucide-react";
import { DiscountCode } from "../product-form-types";

interface DiscountCodesTabProps {
  shopId: string;
  productId?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function DiscountCodesTab({
  shopId,
  productId,
}: DiscountCodesTabProps) {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentCode, setCurrentCode] = useState<Partial<DiscountCode>>({
    code: "",
    percentage: 10,
    shopId,
    productId: productId || null,
    userId: null,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    isActive: true,
  });

  useEffect(() => {
    fetchDiscountCodes();
  }, [shopId, productId]);

  const fetchDiscountCodes = async () => {
    try {
      setIsLoading(true);
      let url = `/api/discount-codes?shopId=${shopId}`;
      if (productId) {
        url += `&productId=${productId}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDiscountCodes(data);
      }
    } catch (error) {
      console.error("Error fetching discount codes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery || searchQuery.length < 2) return;

    try {
      setIsSearching(true);
      const response = await fetch(
        `/api/users/search?q=${searchQuery}&shopId=${shopId}`
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateDiscountCode = async () => {
    try {
      const payload = {
        ...currentCode,
        shopId,
      };

      const url = editingCode
        ? `/api/discount-codes/${editingCode.id}`
        : "/api/discount-codes";
      const method = editingCode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchDiscountCodes();
        setIsDialogOpen(false);
        resetCodeForm();
      }
    } catch (error) {
      console.error("Error saving discount code:", error);
    }
  };

  const handleDeleteDiscountCode = async (id: string) => {
    try {
      const response = await fetch(`/api/discount-codes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchDiscountCodes();
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error("Error deleting discount code:", error);
    }
  };

  const resetCodeForm = () => {
    setEditingCode(null);
    setCurrentCode({
      code: "",
      percentage: 10,
      shopId,
      productId: productId || null,
      userId: null,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      isActive: true,
    });
    setUsers([]);
    setSearchQuery("");
  };

  const handleEditDiscountCode = (code: DiscountCode) => {
    setEditingCode(code);
    setCurrentCode({
      ...code,
      startDate: new Date(code.startDate).toISOString().split("T")[0],
      endDate: new Date(code.endDate).toISOString().split("T")[0],
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
        <CardTitle className="text-xl font-medium">Discount Codes</CardTitle>
        <CardDescription
          style={{ color: "#bdc3c7" }}
          className="mt-1 text-base"
        >
          Create promotional codes for your customers
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 bg-white">
        {isLoading ? (
          <div className="text-center py-4">Loading discount codes...</div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium" style={{ color: "#2c3e50" }}>
                Available Discount Codes
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
                    Add Discount Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCode
                        ? "Edit Discount Code"
                        : "Add New Discount Code"}
                    </DialogTitle>
                    <DialogDescription>
                      Create a discount code for customers to use at checkout.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="code"
                        className="text-right"
                        style={{ color: "#2c3e50" }}
                      >
                        Code
                      </Label>
                      <Input
                        id="code"
                        value={currentCode.code}
                        onChange={(e) =>
                          setCurrentCode({
                            ...currentCode,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="e.g., SUMMER10"
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
                        htmlFor="percentage"
                        className="text-right"
                        style={{ color: "#2c3e50" }}
                      >
                        Discount %
                      </Label>
                      <Input
                        id="percentage"
                        type="number"
                        min="1"
                        max="100"
                        value={currentCode.percentage}
                        onChange={(e) =>
                          setCurrentCode({
                            ...currentCode,
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
                        htmlFor="productSelection"
                        className="text-right"
                        style={{ color: "#2c3e50" }}
                      >
                        For Product
                      </Label>
                      <div className="col-span-3">
                        <Select
                          value={currentCode.productId ? "specific" : "all"}
                          onValueChange={(value) =>
                            setCurrentCode({
                              ...currentCode,
                              productId:
                                value === "specific" ? productId : null,
                            })
                          }
                        >
                          <SelectTrigger
                            className="border-2"
                            style={{
                              borderColor: "#bdc3c7",
                              color: "#2c3e50",
                            }}
                          >
                            <SelectValue placeholder="Select product scope" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Products</SelectItem>
                            {productId && (
                              <SelectItem value="specific">
                                This Product Only
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="userSearch"
                        className="text-right"
                        style={{ color: "#2c3e50" }}
                      >
                        For User
                      </Label>
                      <div className="col-span-3 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            id="userSearch"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email"
                            className="flex-1 border-2"
                            style={{
                              borderColor: "#bdc3c7",
                              color: "#2c3e50",
                              backgroundColor: "white",
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={searchUsers}
                            disabled={isSearching}
                            className="border-2"
                            style={{
                              borderColor: "#bdc3c7",
                              color: "#2c3e50",
                            }}
                          >
                            <SearchIcon className="h-4 w-4" />
                          </Button>
                        </div>

                        {users.length > 0 && (
                          <Select
                            value={currentCode.userId || ""}
                            onValueChange={(value) =>
                              setCurrentCode({
                                ...currentCode,
                                userId: value === "" ? null : value,
                              })
                            }
                          >
                            <SelectTrigger
                              className="border-2"
                              style={{
                                borderColor: "#bdc3c7",
                                color: "#2c3e50",
                              }}
                            >
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All Users</SelectItem>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {!users.length && !isSearching && (
                          <p className="text-xs text-gray-500">
                            Search for a user or leave blank for all users
                          </p>
                        )}

                        {isSearching && (
                          <p className="text-xs text-gray-500">Searching...</p>
                        )}
                      </div>
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
                        value={currentCode.startDate}
                        onChange={(e) =>
                          setCurrentCode({
                            ...currentCode,
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
                        value={currentCode.endDate}
                        onChange={(e) =>
                          setCurrentCode({
                            ...currentCode,
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
                        htmlFor="isActive"
                        className="text-right"
                        style={{ color: "#2c3e50" }}
                      >
                        Active
                      </Label>
                      <div className="flex items-center space-x-2 col-span-3">
                        <Switch
                          id="isActive"
                          checked={currentCode.isActive}
                          onCheckedChange={(checked) =>
                            setCurrentCode({
                              ...currentCode,
                              isActive: checked,
                            })
                          }
                        />
                        <Label htmlFor="isActive" style={{ color: "#2c3e50" }}>
                          {currentCode.isActive ? "Active" : "Inactive"}
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
                        resetCodeForm();
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
                      onClick={handleCreateDiscountCode}
                      style={{
                        backgroundColor: "#16a085",
                        color: "white",
                      }}
                    >
                      {editingCode ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {discountCodes.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p style={{ color: "#2c3e50" }}>
                  No discount codes have been created yet.
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
                  Create Your First Discount Code
                </Button>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Valid Period</TableHead>
                      <TableHead>Applied To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discountCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-medium uppercase">
                          {code.code}
                        </TableCell>
                        <TableCell>{code.percentage}% OFF</TableCell>
                        <TableCell>
                          {formatDate(code.startDate)} -{" "}
                          {formatDate(code.endDate)}
                        </TableCell>
                        <TableCell>
                          {code.productId ? "Specific Product" : "All Products"}
                          <br />
                          {code.userId ? "Specific User" : "All Users"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              code.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {code.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditDiscountCode(code)}
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
                                setEditingCode(code);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-gray-500 hover:text-red-600"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Discount Code
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this discount
                                  code? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (editingCode?.id) {
                                      handleDeleteDiscountCode(editingCode.id);
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
