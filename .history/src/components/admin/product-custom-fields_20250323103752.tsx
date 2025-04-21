// src/components/admin/product-custom-fields.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash, Plus, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  const [isOpen, setIsOpen] = useState<boolean>(false);

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

  // Render custom field input based on type
  const renderFieldInput = (
    fieldType: string,
    value: string,
    onChange: (value: string) => void
  ) => {
    switch (fieldType) {
      case "TEXT":
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border-2"
            style={{
              borderColor: "#bdc3c7",
              color: "#2c3e50",
              backgroundColor: "white",
            }}
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border-2 min-h-[100px]"
            style={{
              borderColor: "#bdc3c7",
              color: "#2c3e50",
              backgroundColor: "white",
            }}
          />
        );

      case "NUMBER":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border-2"
            style={{
              borderColor: "#bdc3c7",
              color: "#2c3e50",
              backgroundColor: "white",
            }}
          />
        );

      case "DATE":
        return (
          <div className="relative">
            <Input
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="border-2"
              style={{
                borderColor: "#bdc3c7",
                color: "#2c3e50",
                backgroundColor: "white",
              }}
            />
            <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        );

      case "BOOLEAN":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value === "true"}
              onCheckedChange={(checked) =>
                onChange(checked ? "true" : "false")
              }
            />
            <span className="text-sm text-gray-500">
              {value === "true" ? "Yes" : "No"}
            </span>
          </div>
        );

      case "SELECT":
        // In a real app, you'd get options from somewhere
        const options = ["Option 1", "Option 2", "Option 3"];
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger
              className="border-2"
              style={{ borderColor: "#bdc3c7", color: "#2c3e50" }}
            >
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border-2"
            style={{
              borderColor: "#bdc3c7",
              color: "#2c3e50",
              backgroundColor: "white",
            }}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Custom field values list */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium" style={{ color: "#2c3e50" }}>
          Product Custom Fields
        </h3>

        {localFieldValues.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p style={{ color: "#2c3e50" }}>
              No custom fields added yet. Add fields below to provide additional
              product information.
            </p>
            <Button
              onClick={() => setIsOpen(true)}
              type="button"
              className="mt-4"
              style={{
                backgroundColor: "#16a085",
                color: "white",
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Field
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {localFieldValues.map((fieldValue, index) => (
              <Card
                key={index}
                className="border rounded-lg overflow-hidden"
                style={{ borderColor: "#bdc3c7" }}
              >
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle
                      className="text-base font-medium"
                      style={{ color: "#2c3e50" }}
                    >
                      {getFieldNameById(fieldValue.customFieldId)}
                      {isFieldRequired(fieldValue.customFieldId) && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "#f5f7fa",
                          color: "#2c3e50",
                        }}
                      >
                        {getFieldTypeById(fieldValue.customFieldId)}
                      </span>
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveField(index)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {renderFieldInput(
                    getFieldTypeById(fieldValue.customFieldId),
                    fieldValue.value,
                    (value) => handleUpdateField(index, value)
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add custom fields section */}
      <Collapsible
        open={isOpen || localFieldValues.length === 0}
        onOpenChange={setIsOpen}
        className="border rounded-lg overflow-hidden"
        style={{ borderColor: "#bdc3c7" }}
      >
        <CollapsibleTrigger asChild>
          <div className="p-4 flex items-center justify-between cursor-pointer bg-gray-50">
            <h3 className="text-lg font-medium" style={{ color: "#2c3e50" }}>
              Add Custom Field
            </h3>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent
          className="p-4 border-t"
          style={{ borderColor: "#bdc3c7" }}
        >
          {availableFieldsToAdd.length === 0 ? (
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm" style={{ color: "#7f8c8d" }}>
                All available custom fields have been added to this product.
                Create more custom fields in the Custom Fields section.
              </p>
              <Button
                type="button"
                className="mt-3"
                variant="outline"
                onClick={() => window.open("/admin/custom-fields", "_blank")}
                style={{
                  borderColor: "#16a085",
                  color: "#16a085",
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Manage Custom Fields
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "#7f8c8d" }}>
                Select a custom field to add additional information to this
                product.
              </p>
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
                    backgroundColor: selectedCustomFieldId
                      ? "#16a085"
                      : "#f5f7fa",
                    color: selectedCustomFieldId ? "white" : "#bdc3c7",
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>

              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open("/admin/custom-fields", "_blank")}
                  size="sm"
                  className="text-sm"
                  style={{
                    borderColor: "#bdc3c7",
                    color: "#7f8c8d",
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create New Custom Field
                </Button>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
