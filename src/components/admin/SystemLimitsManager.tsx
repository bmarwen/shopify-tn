"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SystemLimit {
  id: string;
  codeName: string;
  name: string;
  description: string;
  value: number;
  category: string;
  planType: string;
  isActive: boolean;
}

export function SystemLimitsManager() {
  const [limits, setLimits] = useState<SystemLimit[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLimit, setNewLimit] = useState({
    codeName: "",
    name: "",
    description: "",
    value: "",
    category: "",
    planType: "",
  });

  useEffect(() => {
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      const response = await fetch("/api/admin/system-limits");
      if (response.ok) {
        const data = await response.json();
        setLimits(data.limits || []);
      }
    } catch (error) {
      console.error("Error fetching limits:", error);
      setError("Failed to fetch system limits");
    }
  };

  const startEdit = (limit: SystemLimit) => {
    setEditingId(limit.id);
    setEditValues({ value: limit.value });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (limitId: string, codeName: string) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/system-limits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeName,
          value: parseInt(editValues.value),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("System limit updated successfully");
        setEditingId(null);
        setEditValues({});
        fetchLimits();
      } else {
        setError(data.error || "Failed to update system limit");
      }
    } catch (error) {
      setError("An error occurred while updating the system limit");
    } finally {
      setLoading(false);
    }
  };

  const createLimit = async () => {
    if (!newLimit.codeName || !newLimit.name || !newLimit.value || !newLimit.category) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/system-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLimit,
          value: parseInt(newLimit.value),
          planType: newLimit.planType || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("System limit created successfully");
        setNewLimit({
          codeName: "",
          name: "",
          description: "",
          value: "",
          category: "",
          planType: "",
        });
        setShowAddForm(false);
        fetchLimits();
      } else {
        setError(data.error || "Failed to create system limit");
      }
    } catch (error) {
      setError("An error occurred while creating the system limit");
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case "STANDARD": return "bg-blue-100 text-blue-800";
      case "ADVANCED": return "bg-purple-100 text-purple-800";
      case "PREMIUM": return "bg-gold-100 text-gold-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatValue = (value: number) => {
    return value === -1 ? "Unlimited" : value.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Limits Configuration</h2>
          <p className="text-gray-600">Manage plan-based limits for all shops</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Limit
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

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New System Limit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codeName">Code Name *</Label>
                <Input
                  id="codeName"
                  value={newLimit.codeName}
                  onChange={(e) => setNewLimit(prev => ({ ...prev, codeName: e.target.value }))}
                  placeholder="e.g., STANDARD_DISCOUNTS_LIMIT"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name *</Label>
                <Input
                  id="name"
                  value={newLimit.name}
                  onChange={(e) => setNewLimit(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Plan - Discounts Limit"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={newLimit.category} onValueChange={(value) => setNewLimit(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISCOUNTS">Discounts</SelectItem>
                    <SelectItem value="DISCOUNT_CODES">Discount Codes</SelectItem>
                    <SelectItem value="PRODUCTS">Products</SelectItem>
                    <SelectItem value="ORDERS">Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planType">Plan Type</Label>
                <Select value={newLimit.planType} onValueChange={(value) => setNewLimit(prev => ({ ...prev, planType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                    <SelectItem value="PREMIUM">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Limit Value *</Label>
                <Input
                  id="value"
                  type="number"
                  value={newLimit.value}
                  onChange={(e) => setNewLimit(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Enter limit (-1 for unlimited)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newLimit.description}
                  onChange={(e) => setNewLimit(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description of this limit"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={createLimit} disabled={loading}>
                {loading ? "Creating..." : "Create Limit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current System Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code Name</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Plan Type</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {limits.map((limit) => (
                <TableRow key={limit.id}>
                  <TableCell className="font-mono text-sm">{limit.codeName}</TableCell>
                  <TableCell>{limit.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{limit.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {limit.planType ? (
                      <Badge className={getPlanBadgeColor(limit.planType)}>
                        {limit.planType}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Global</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === limit.id ? (
                      <Input
                        type="number"
                        value={editValues.value}
                        onChange={(e) => setEditValues(prev => ({ ...prev, value: e.target.value }))}
                        className="w-24"
                      />
                    ) : (
                      <span className="font-medium">{formatValue(limit.value)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === limit.id ? (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(limit.id, limit.codeName)}
                          disabled={loading}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(limit)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {limits.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No system limits configured. Create your first limit above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
