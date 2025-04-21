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

// Structure matching the database model
interface CustomFieldValue {
  id?: string;
  customFieldId: string; // This links to the custom field definition
  value: string;
}

// This represents the available custom fields from the database
interface AvailableCustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
}

interface ProductCustomFieldsProps {
  customFieldValues: CustomFieldValue[];
  availableCustomFields: AvailableCustomField[];
  onChange: (fields: CustomFieldValue[]) => void;
}

export default function ProductCustomFields({
  customFieldValues = [],
  availableCustomFields = [],
  onChange,
}: ProductCustomFieldsProps) {
  const [localFieldValues, setLocalFieldValues] =
    useState<CustomFieldValue[]>(customFieldValues);
  const [selectedCustomFieldId, setSelectedCustomFieldId] =
    useState<string>("");

  // Sync with parent component
  useEffect(() => {
    setLocalFieldValues(customFieldValues);
  }, [customFieldValues]);

  // Add a custom field value
  const handleAddCustomField = () => {
    if (!selectedCustomFieldId) return;

    // Check if field already exists for this product
    if (
      localFieldValues.some(
        (field) => field.customFieldId === selectedCustomFieldId
      )
    ) {
      // Could show an error "This field has already been added"
      return;
    }

    const newFieldValues = [
      ...localFieldValues,
      {
        customFieldId: selectedCustomFieldId,
        value: "",
      },
    ];

    setLocalFieldValues(newFieldValues);
    onChange(newFieldValues);
    setSelectedCustomFieldId("");
  };

  // Update a custom field value
  const handleUpdateField = (index: number, value: string) => {
    const updatedFields = [...localFieldValues];
    updatedFields[index].value = value;
    setLocalFieldValues(updatedFields);
    onChange(updatedFields);
  };

  // Remove a custom field value
  const handleRemoveField = (index: number) => {
    const updatedFields = [...localFieldValues];
    updatedFields.splice(index, 1);
    setLocalFieldValues(updatedFields);
    onChange(updatedFields);
  };

  // Filter out already added custom fields
  const availableFieldsToAdd = availableCustomFields.filter(
    (field) =>
      !localFieldValues.some((value) => value.customFieldId === field.id)
  );

  // Get field name from ID
  const getFieldNameById = (fieldId: string): string => {
    const field = availableCustomFields.find((f) => f.id === fieldId);
    return field ? field.name : "Unknown Field";
  };

  // Get field type from ID
  const getFieldTypeById = (fieldId: string): string => {
    const field = availableCustomFields.find((f) => f.id === fieldId);
    return field ? field.type : "TEXT";
  };

  // Is field required
  const isFieldRequired = (fieldId: string): boolean => {
    const field = availableCustomFields.find((f) => f.id === fieldId);
    return field ? field.required : false;
  };

  return (
    <div className="space-y-6">
      {/* Custom field values list */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium" style={{ color: "#2c3e50" }}>
          Product Custom Fields
        </h3>

        {localFieldValues.length === 0 ? (
          <p style={{ color: "#2c3e50" }}>
            No custom fields added yet. Add fields below to provide additional
            product information.
          </p>
        ) : (
          <div className="space-y-4">
            {localFieldValues.map((fieldValue, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 border rounded-lg"
                style={{ borderColor: "#bdc3c7" }}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label style={{ color: "#2c3e50" }} className="font-medium">
                      {getFieldNameById(fieldValue.customFieldId)}
                      {isFieldRequired(fieldValue.customFieldId) && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: "#f5f7fa",
                        color: "#2c3e50",
                      }}
                    >
                      {getFieldTypeById(fieldValue.customFieldId)}
                    </span>
                  </div>

                  {/* Render different input types based on field type */}
                  {getFieldTypeById(fieldValue.customFieldId) === "TEXT" && (
                    <Input
                      value={fieldValue.value}
                      onChange={(e) => handleUpdateField(index, e.target.value)}
                      placeholder={`Enter ${getFieldNameById(
                        fieldValue.customFieldId
                      )}`}
                      className="border-2"
                      style={{
                        borderColor: "#bdc3c7",
                        color: "#2c3e50",
                        backgroundColor: "white",
                      }}
                    />
                  )}

                  {getFieldTypeById(fieldValue.customFieldId) === "NUMBER" && (
                    <Input
                      type="number"
                      value={fieldValue.value}
                      onChange={(e) => handleUpdateField(index, e.target.value)}
                      placeholder={`Enter ${getFieldNameById(
                        fieldValue.customFieldId
                      )}`}
                      className="border-2"
                      style={{
                        borderColor: "#bdc3c7",
                        color: "#2c3e50",
                        backgroundColor: "white",
                      }}
                    />
                  )}

                  {getFieldTypeById(fieldValue.customFieldId) === "DATE" && (
                    <Input
                      type="date"
                      value={fieldValue.value}
                      onChange={(e) => handleUpdateField(index, e.target.value)}
                      className="border-2"
                      style={{
                        borderColor: "#bdc3c7",
                        color: "#2c3e50",
                        backgroundColor: "white",
                      }}
                    />
                  )}

                  {/* Can add more field types as needed */}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
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

      {/* Add custom fields section */}
      <div className="border-t pt-6 mt-6" style={{ borderColor: "#bdc3c7" }}>
        <h3 className="text-lg font-medium mb-4" style={{ color: "#2c3e50" }}>
          Add Custom Field
        </h3>

        {availableFieldsToAdd.length === 0 ? (
          <p className="text-sm" style={{ color: "#7f8c8d" }}>
            All available custom fields have been added to this product. Create
            more custom fields in the Custom Fields section.
          </p>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={selectedCustomFieldId}
                onValueChange={setSelectedCustomFieldId}
              >
                <SelectTrigger
                  className="border-2"
                  style={{
                    borderColor: "#bdc3c7",
                    color: "#2c3e50",
                    backgroundColor: "white",
                  }}
                >
                  <SelectValue placeholder="Select a custom field to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableFieldsToAdd.map((field) => (
                    <SelectItem
                      key={field.id}
                      value={field.id}
                      style={{ color: "#2c3e50" }}
                    >
                      {field.name}
                      {field.required && " (Required)"}
                      <span className="ml-2 text-xs text-gray-500">
                        ({field.type})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={handleAddCustomField}
              disabled={!selectedCustomFieldId}
              style={{
                backgroundColor: selectedCustomFieldId ? "#16a085" : "#f5f7fa",
                color: selectedCustomFieldId ? "white" : "#bdc3c7",
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
