// src/components/admin/custom-fields-table.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pencil, Trash, Info, Filter } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  usageCount?: number;
}

interface CustomFieldsTableProps {
  customFields: CustomField[];
}

export default function CustomFieldsTable({
  customFields = [],
}: CustomFieldsTableProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [deleteField, setDeleteField] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editRequired, setEditRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [fieldTypeFilter, setFieldTypeFilter] = useState<string>("all");

  // Start editing a field
  const handleEdit = (field: CustomField) => {
    setIsEditing(field.id);
    setEditName(field.name);
    setEditType(field.type);
    setEditRequired(field.required);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(null);
  };

  // Save edited field
  const handleSaveEdit = async () => {
    if (!isEditing) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/custom-fields/${isEditing}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          type: editType,
          required: editRequired,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update custom field");
      }

      setIsEditing(null);
      router.refresh();
    } catch (error) {
      console.error("Error updating custom field:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a field
  const handleDelete = async () => {
    if (!deleteField) return;

    try {
      const response = await fetch(`/api/custom-fields/${deleteField}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete custom field");
      }

      setDeleteField(null);
      router.refresh();
    } catch (error) {
      console.error("Error deleting custom field:", error);
    }
  };

  // Filter and search custom fields
  const filteredFields = customFields.filter((field) => {
    const matchesSearch = field.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType =
      fieldTypeFilter === "all" || field.type === fieldTypeFilter;
    return matchesSearch && matchesType;
  });

  const fieldTypes = [
    { value: "TEXT", label: "Text" },
    { value: "NUMBER", label: "Number" },
    { value: "BOOLEAN", label: "Yes/No" },
    { value: "DATE", label: "Date" },
    { value: "TEXTAREA", label: "Long Text" },
    { value: "SELECT", label: "Select" },
  ];

  // Get readable field type
  const getFieldTypeLabel = (type: string) => {
    const fieldType = fieldTypes.find((t) => t.value === type);
    return fieldType ? fieldType.label : type;
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-200">
        <div className="relative flex-1">
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 border-gray-300 text-gray-800 placeholder:text-gray-400"
          />
          <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <div className="w-full sm:w-48">
          <Select value={fieldTypeFilter} onValueChange={setFieldTypeFilter}>
            <SelectTrigger className="border-gray-300 text-gray-800">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {fieldTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-gray-700">Name</TableHead>
              <TableHead className="text-gray-700">Type</TableHead>
              <TableHead className="text-gray-700">Required</TableHead>
              <TableHead className="text-gray-700">Usage</TableHead>
              <TableHead className="text-gray-700">Created</TableHead>
              <TableHead className="text-right text-gray-700">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFields.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-gray-500"
                >
                  {customFields.length === 0
                    ? "No custom fields found. Add your first custom field to get started."
                    : "No custom fields match your search criteria."}
                </TableCell>
              </TableRow>
            ) : (
              filteredFields.map((field) => (
                <TableRow key={field.id} className="hover:bg-gray-50">
                  {isEditing === field.id ? (
                    // Editing row
                    <>
                      <TableCell>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border-gray-300 text-gray-800 w-full max-w-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={editType} onValueChange={setEditType}>
                          <SelectTrigger className="border-gray-300 text-gray-800 w-full max-w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Switch
                            checked={editRequired}
                            onCheckedChange={setEditRequired}
                            className="data-[state=checked]:bg-indigo-600"
                          />
                        </div>
                      </TableCell>
                      <TableCell>{field.usageCount || 0} products</TableCell>
                      <TableCell>{formatDate(field.createdAt)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="border-gray-300 text-gray-700"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={isSubmitting}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          Save
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    // Normal row
                    <>
                      <TableCell className="font-medium text-gray-800">
                        {field.name}
                      </TableCell>
                      <TableCell>{getFieldTypeLabel(field.type)}</TableCell>
                      <TableCell>
                        {field.required ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Optional
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-700">
                          {field.usageCount || 0} products
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(field.createdAt)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(field)}
                          className="text-gray-700 hover:text-indigo-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteField(field.id)}
                          className="text-gray-700 hover:text-red-600"
                          disabled={
                            field.usageCount ? field.usageCount > 0 : false
                          }
                          title={
                            field.usageCount && field.usageCount > 0
                              ? "Cannot delete fields in use"
                              : "Delete field"
                          }
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteField}
        onOpenChange={() => setDeleteField(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              custom field and may affect products using it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
