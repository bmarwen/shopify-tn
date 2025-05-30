"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Plus, Globe, Store, Calendar } from "lucide-react";
import { DiscountForm } from "./DiscountForm";

interface Discount {
  id: string;
  percentage: number;
  enabled: boolean;
  startDate: string;
  endDate: string;
  availableOnline: boolean;
  availableInStore: boolean;
  product: {
    id: string;
    name: string;
    images: string[];
  };
  createdAt: string;
}

export function DiscountsList() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [limits, setLimits] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/discounts");
      if (response.ok) {
        const data = await response.json();
        setDiscounts(data.discounts || []);
        setLimits(data.limits);
      } else {
        setError("Failed to fetch discounts");
      }
    } catch (error) {
      setError("An error occurred while fetching discounts");
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscount = async (discountId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/discounts/${discountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        fetchDiscounts();
      } else {
        setError("Failed to update discount");
      }
    } catch (error) {
      setError("An error occurred while updating the discount");
    }
  };

  const deleteDiscount = async (discountId: string) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;

    try {
      const response = await fetch(`/api/discounts/${discountId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchDiscounts();
      } else {
        setError("Failed to delete discount");
      }
    } catch (error) {
      setError("An error occurred while deleting the discount");
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDiscount(null);
    fetchDiscounts();
  };

  const startEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setShowForm(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const isActive = (discount: Discount) => {
    const now = new Date();
    const start = new Date(discount.startDate);
    const end = new Date(discount.endDate);
    return discount.enabled && now >= start && now <= end;
  };

  if (showForm) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => { setShowForm(false); setEditingDiscount(null); }}>
          ← Back to Discounts
        </Button>
        <DiscountForm
          onSuccess={handleFormSuccess}
          initialData={editingDiscount}
          isEdit={!!editingDiscount}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Product Discounts</h2>
          <p className="text-gray-600">
            Manage discounts for your products with online/in-store targeting
          </p>
          {limits && (
            <div className="text-sm text-gray-500 mt-1">
              Plan: {limits.planType} | Active: {limits.current}/{limits.limit === -1 ? "∞" : limits.limit}
            </div>
          )}
        </div>
        <Button
          onClick={() => setShowForm(true)}
          disabled={limits && !limits.allowed}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Discount
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {limits && !limits.allowed && (
        <Alert variant="destructive">
          <AlertDescription>
            You have reached the maximum number of discounts for your {limits.planType.toLowerCase()} plan.
            Upgrade to create more discounts.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Discounts ({discounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading discounts...</div>
          ) : discounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No discounts created yet. Create your first discount to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {discount.product.images[0] && (
                          <img
                            src={discount.product.images[0]}
                            alt={discount.product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">{discount.product.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-lg">
                        {discount.percentage}% OFF
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDate(discount.startDate)} - {formatDate(discount.endDate)}
                        </span>
                      </div>
                      {isExpired(discount.endDate) && (
                        <Badge variant="destructive" className="mt-1">
                          Expired
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        {discount.availableOnline && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Globe className="h-3 w-3 text-blue-500" />
                            <span>Online</span>
                          </div>
                        )}
                        {discount.availableInStore && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Store className="h-3 w-3 text-green-500" />
                            <span>In-Store</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={discount.enabled}
                          onCheckedChange={(checked) => toggleDiscount(discount.id, checked)}
                        />
                        {isActive(discount) ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : discount.enabled ? (
                          <Badge variant="secondary">Scheduled</Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(discount)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteDiscount(discount.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
