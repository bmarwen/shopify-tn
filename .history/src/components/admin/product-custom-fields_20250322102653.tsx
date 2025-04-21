// src/components/admin/product-custom-fields.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash, Plus } from "lucide-react";

interface CustomField {
  id?: string;
  key: string;
  value: string;
}

interface AvailableField {
  id: string;
  name: string;
  type: string;
  required: boolean;
}

interface ProductCustomFieldsProps {
  customFields: CustomField[];
  availableFields: AvailableField[];
  onChange: (fields: CustomField[]) => void;
}

export default function ProductCustomFields({
  customFields = [],
  availableFields = [],
  onChange,
}: ProductCustomFieldsProps) {
  const [customKey, setCustomKey] = useState("");

  const handleAddCustomField = () => {
    if (customKey.trim()) {
      onChange([...customFields, { key: customKey.trim(), value: "" }]);
      setCustomKey("");
    }
  };

  const handleAddPredefinedField = (fieldName: string) => {
    // Check if field already exists
    if (customFields.some((field) => field.key === fieldName)) {
      return;
    }

    onChange([...customFields, { key: fieldName, value: "" }]);
  };

  const handleUpdateField = (index: number, value: string) => {
    const updatedFields = [...customFields];
    updatedFields[index].value = value;
    onChange(updatedFields);
  };

  const handleRemoveField = (index: number) => {
    const updatedFields = [...customFields];
    updatedFields.splice(index, 1);
    onChange(updatedFields);
  };

  // Filter out already added predefined fields
  const availablePredefinedFields = availableFields.filter(
    (field) => !customFields.some((cf) => cf.key === field.name)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Custom fields list */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Custom Fields</h3>

          {customFields.length === 0 ? (
            <p className="text-gray-500">
              No custom fields added yet. Add fields to provide additional
              product information.
            </p>
          ) : (
            <div className="space-y-4">
              {customFields.map((field, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-gray-700 font-medium">
                      {field.key}
                    </Label>
                    <Input
                      value={field.value}
                      onChange={(e) => handleUpdateField(index, e.target.value)}
                      placeholder={`Enter ${field.key}`}
                      className="border-gray-300 text-gray-800 placeholder:text-gray-400"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    onClick={() => handleRemoveField(index)}
                  >
                    <Trash className="h-4 w-4 text-gray-500 hover:text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add fields section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Add Fields</h3>

          {/* Add from predefined fields */}
          {availablePredefinedFields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-700">Add predefined field</Label>
              <div className="flex gap-2">
                <Select onValueChange={handleAddPredefinedField}>
                  <SelectTrigger className="border-gray-300 text-gray-800">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePredefinedFields.map((field) => (
                      <SelectItem key={field.id} value={field.name}>
                        {field.name}
                        {field.required && " (Required)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const selectElement =
                      document.querySelector("[data-value]");
                    if (selectElement) {
                      const value = selectElement.getAttribute("data-value");
                      if (value) handleAddPredefinedField(value);
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Add custom field */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <Label className="text-gray-700">Add custom field</Label>
            <div className="flex gap-2">
              <Input
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Field name (e.g., Material, Origin)"
                className="flex-1 border-gray-300 text-gray-800 placeholder:text-gray-400"
              />
              <Button
                type="button"
                onClick={handleAddCustomField}
                disabled={!customKey.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
