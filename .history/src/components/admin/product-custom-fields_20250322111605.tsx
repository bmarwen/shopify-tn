// src/components/admin/product-custom-fields.tsx
"use client";

import { useState, useEffect } from "react";
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
  const [selectedField, setSelectedField] = useState<string>("");
  const [localFields, setLocalFields] = useState<CustomField[]>(customFields);

  // Sync local state with props
  useEffect(() => {
    setLocalFields(customFields);
  }, [customFields]);

  const handleAddCustomField = () => {
    if (customKey.trim()) {
      const newFields = [...localFields, { key: customKey.trim(), value: "" }];
      setLocalFields(newFields);
      onChange(newFields);
      setCustomKey("");
    }
  };

  const handleAddPredefinedField = () => {
    if (!selectedField) return;

    // Find the field in available fields
    const fieldToAdd = availableFields.find(
      (field) => field.id === selectedField
    );
    if (!fieldToAdd) return;

    // Check if field already exists
    if (localFields.some((field) => field.key === fieldToAdd.name)) {
      return;
    }

    const newFields = [...localFields, { key: fieldToAdd.name, value: "" }];

    setLocalFields(newFields);
    onChange(newFields);
    setSelectedField("");
  };

  const handleUpdateField = (index: number, value: string) => {
    const updatedFields = [...localFields];
    updatedFields[index].value = value;
    setLocalFields(updatedFields);
    onChange(updatedFields);
  };

  const handleRemoveField = (index: number) => {
    const updatedFields = [...localFields];
    updatedFields.splice(index, 1);
    setLocalFields(updatedFields);
    onChange(updatedFields);
  };

  // Filter out already added predefined fields
  const availablePredefinedFields = availableFields.filter(
    (field) => !localFields.some((cf) => cf.key === field.name)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Custom fields list */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium" style={{ color: "#2c3e50" }}>
            Custom Fields
          </h3>

          {localFields.length === 0 ? (
            <p style={{ color: "#2c3e50" }}>
              No custom fields added yet. Add fields to provide additional
              product information.
            </p>
          ) : (
            <div className="space-y-4">
              {localFields.map((field, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-1 space-y-1">
                    <Label style={{ color: "#2c3e50" }} className="font-medium">
                      {field.key}
                    </Label>
                    <Input
                      value={field.value}
                      onChange={(e) => handleUpdateField(index, e.target.value)}
                      placeholder={`Enter ${field.key}`}
                      className="text-gray-200 placeholder-gray-400 border-2"
                      style={{
                        borderColor: "#bdc3c7",
                        color: "#2c3e50",
                        backgroundColor: "white",
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    onClick={() => handleRemoveField(index)}
                    style={{ color: "#2c3e50" }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add fields section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium" style={{ color: "#2c3e50" }}>
            Add Fields
          </h3>

          {/* Add from predefined fields */}
          {availablePredefinedFields.length > 0 && (
            <div className="space-y-2">
              <Label style={{ color: "#2c3e50" }}>Add predefined field</Label>
              <div className="flex gap-2">
                <Select value={selectedField} onValueChange={setSelectedField}>
                  <SelectTrigger
                    className="text-gray-200 border-2"
                    style={{
                      borderColor: "#bdc3c7",
                      color: "#2c3e50",
                      backgroundColor: "white",
                    }}
                  >
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePredefinedFields.map((field) => (
                      <SelectItem
                        key={field.id}
                        value={field.id}
                        style={{ color: "#2c3e50" }}
                      >
                        {field.name}
                        {field.required && " (Required)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPredefinedField}
                  disabled={!selectedField}
                  style={{
                    backgroundColor: selectedField ? "#16a085" : "#f5f7fa",
                    color: selectedField ? "white" : "#bdc3c7",
                    borderColor: "#bdc3c7",
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Add custom field */}
          <div
            className="space-y-2 pt-4 border-t"
            style={{ borderColor: "#bdc3c7" }}
          >
            <Label style={{ color: "#2c3e50" }}>Add custom field</Label>
            <div className="flex gap-2">
              <Input
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Field name (e.g., Material, Origin)"
                className="flex-1 text-gray-200 placeholder-gray-400 border-2"
                style={{
                  borderColor: "#bdc3c7",
                  color: "#2c3e50",
                  backgroundColor: "white",
                }}
              />
              <Button
                type="button"
                onClick={handleAddCustomField}
                disabled={!customKey.trim()}
                style={{
                  backgroundColor: customKey.trim() ? "#16a085" : "#f5f7fa",
                  color: customKey.trim() ? "white" : "#bdc3c7",
                }}
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
