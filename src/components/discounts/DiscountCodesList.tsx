"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Plus, Globe, Store, Calendar, Tag, Copy, Check } from "lucide-react";
import { DiscountCodeForm } from "./DiscountCodeForm";

interface DiscountCode {
  id: string;
  code: string;
  percentage: number;
  startDate: string;
  endDate: string;
  availableOnline: boolean;
  availableInStore: boolean;
  isActive: boolean;
  products: Array<{ id: string; name: string; images: string[] }>;
  category: { id: string; name: string } | null;
  user: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export function DiscountCodesList() {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [limits, setLimits] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  const fetchDiscountCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/discount-codes");
      if (response.ok) {
        const data = await response.json();
        setDiscountCodes(data.discountCodes || []);
        setLimits(data.limits);
      } else {
        setError("Failed to fetch discount codes");
      }
    } catch (error) {
      setError("An error occurred while fetching discount codes");
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscountCode = async (codeId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/discount-codes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: codeId, isActive }),
      });

      if (response.ok) {
        fetchDiscountCodes();
      } else {
        setError("Failed to update discount code");
      }
    } catch (error) {
      setError("An error occurred while updating the discount code");
    }
  };

  const deleteDiscountCode = async (codeId: string) => {
    if (!confirm("Are you sure you want to delete this discount code?")) return;

    try {
      const response = await fetch(`/api/discount-codes/${codeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchDiscountCodes();
        setSuccess("Discount code deleted successfully");
      } else {
        setError("Failed to delete discount code");
      }
    } catch (error) {
      setError("An error occurred while deleting the discount code");
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCode(null);
    fetchDiscountCodes();
    setSuccess(editingCode ? "Discount code updated successfully" : "Discount code created successfully");
  };

  const startEdit = (discountCode: DiscountCode) => {
    setEditingCode(discountCode);
    setShowForm(true);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const isActive = (discountCode: DiscountCode) => {
    const now = new Date();
    const start = new Date(discountCode.startDate);
    const end = new Date(discountCode.endDate);
    return discountCode.isActive && now >= start && now <= end;
  };

  const getTargetingInfo = (discountCode: DiscountCode) => {
    if (discountCode.category) {
      return `Category: ${discountCode.category.name}`;
    } else if (discountCode.products.length > 0) {
      return `${discountCode.products.length} specific product(s)`;
    } else {
      return "All products";
    }
  };

  if (showForm) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => { setShowForm(false); setEditingCode(null); }}>
          ← Back to Discount Codes
        </Button>
        <DiscountCodeForm
          onSuccess={handleFormSuccess}
          initialData={editingCode}
          isEdit={!!editingCode}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Discount Codes</h2>
          <p className="text-gray-600">
            Create and manage discount codes with flexible targeting options
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
          Create Code
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {limits && !limits.allowed && (
        <Alert variant="destructive">
          <AlertDescription>
            You have reached the maximum number of discount codes for your {limits.planType.toLowerCase()} plan.
            Upgrade to create more discount codes.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Discount Codes ({discountCodes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading discount codes...</div>
          ) : discountCodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No discount codes created yet. Create your first discount code to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Targeting</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discountCodes.map((discountCode) => (
                  <TableRow key={discountCode.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <Tag className="h-4 w-4 text-gray-500" />
                          <span className="font-mono font-bold text-lg">{discountCode.code}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyCode(discountCode.code)}
                          className="h-6 w-6 p-0"
                        >
                          {copiedCode === discountCode.code ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-lg">
                        {discountCode.percentage}% OFF
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDate(discountCode.startDate)} - {formatDate(discountCode.endDate)}
                        </span>
                      </div>
                      {isExpired(discountCode.endDate) && (
                        <Badge variant="destructive" className="mt-1">
                          Expired
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {getTargetingInfo(discountCode)}
                      </div>
                      {discountCode.products.length > 0 && discountCode.products.length <= 3 && (
                        <div className="mt-1">
                          {discountCode.products.map((product) => (
                            <Badge key={product.id} variant="outline" className="text-xs mr-1">
                              {product.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        {discountCode.availableOnline && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Globe className="h-3 w-3 text-blue-500" />
                            <span>Online</span>
                          </div>
                        )}
                        {discountCode.availableInStore && (
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
                          checked={discountCode.isActive}
                          onCheckedChange={(checked) => toggleDiscountCode(discountCode.id, checked)}
                        />
                        {isActive(discountCode) ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : discountCode.isActive ? (
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
                          onClick={() => startEdit(discountCode)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteDiscountCode(discountCode.id)}
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
