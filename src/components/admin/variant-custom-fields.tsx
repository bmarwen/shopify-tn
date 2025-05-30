// src/components/admin/variant-custom-fields.tsx
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
import { Trash, Plus, Calendar, RefreshCw, Search, Settings } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface VariantCustomFieldValue {
  id?: string;
  customFieldId: string;
  value: string;
}

interface AvailableCustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
}

interface VariantCustomFieldsProps {
  customFieldValues: VariantCustomFieldValue[];
  availableCustomFields: AvailableCustomField[];
  onChange: (fields: VariantCustomFieldValue[]) => void;
  onRefreshCustomFields?: () => Promise<void>;
}

export default function VariantCustomFields({
  customFieldValues = [],
  availableCustomFields = [],
  onChange,
  onRefreshCustomFields,
}: VariantCustomFieldsProps) {
  const { toast } = useToast();
  const [localFieldValues, setLocalFieldValues] =
    useState<VariantCustomFieldValue[]>(customFieldValues);
  const [selectedCustomFieldId, setSelectedCustomFieldId] =
    useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false); // Collapsed by default for variants
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  console.log("VariantCustomFields - availableCustomFields:", availableCustomFields);
  console.log("VariantCustomFields - customFieldValues:", customFieldValues);

  // Sync with parent component when props change
  useEffect(() => {
    setLocalFieldValues(customFieldValues);
  }, [customFieldValues]);

  // Handle refresh custom fields
  const handleRefreshCustomFields = async () => {
    if (!onRefreshCustomFields) return;
    
    setIsRefreshing(true);
    try {
      await onRefreshCustomFields();
      toast({
        title: "Custom Fields Refreshed",
        description: "Custom fields list has been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh custom fields. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add a custom field value
  const handleAddCustomField = () => {
    if (!selectedCustomFieldId) return;

    console.log("Adding custom field:", selectedCustomFieldId);
    console.log("Current field values:", localFieldValues);

    // Allow multiple instances of the same custom field type
    // Remove the duplicate check - users should be able to add the same field multiple times

    const newFieldValues = [
      ...localFieldValues,
      {
        customFieldId: selectedCustomFieldId,
        value: "",
      },
    ];

    console.log("New field values:", newFieldValues);

    setLocalFieldValues(newFieldValues);
    onChange(newFieldValues);
    setSelectedCustomFieldId("");
  };

  // Update a custom field value
  const handleUpdateField = (index: number, value: string) => {
    console.log(`Updating field at index ${index} to value:`, value);
    
    const updatedFields = [...localFieldValues];
    updatedFields[index].value = value;
    
    console.log("Updated field values:", updatedFields);
    
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

  // All custom fields are always available to add (allow multiple instances)
  const availableFieldsToAdd = availableCustomFields;

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
    const inputStyle = {
      borderColor: "#bdc3c7",
      color: "#2c3e50",
      backgroundColor: "white",
    };

    switch (fieldType) {
      case "TEXT":
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border-2 text-sm"
            style={inputStyle}
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border-2 min-h-[80px] text-sm"
            style={inputStyle}
          />
        );

      case "NUMBER":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border-2 text-sm"
            style={inputStyle}
          />
        );

      case "DATE":
        return (
          <div className="relative">
            <Input
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="border-2 text-sm"
              style={inputStyle}
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
        const options = ["Option 1", "Option 2", "Option 3"];
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger
              className="border-2 text-sm"
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
            className="border-2 text-sm"
            style={inputStyle}
          />
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Custom Fields Management Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-400">
          Custom Fields ({availableCustomFields.length} available)
        </h4>
        <div className="flex gap-2">
          {onRefreshCustomFields && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshCustomFields}
              disabled={isRefreshing}
              className="text-xs"
              style={{
                borderColor: "#bdc3c7",
                color: "#2c3e50",
              }}
            >
              <RefreshCw className={`text-gray-400 h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-gray-200">Refresh</span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open("/admin/custom-fields", "_blank")}
            size="sm"
            className="text-xs"
            style={{
              borderColor: "#16a085",
              color: "#16a085",
            }}
          >
            <Settings className="h-3 w-3 mr-1" />
            Manage
          </Button>
        </div>
      </div>
      {/* Existing custom field values */}
      {localFieldValues.length > 0 && (
        <div className="space-y-2">
          {localFieldValues.map((fieldValue, index) => (
            <Card
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle
                    className="text-sm font-medium"
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
                  size="sm"
                  onClick={() => handleRemoveField(index)}
                  className="text-gray-500 hover:text-red-600 h-8 w-8 p-0"
                >
                  <Trash className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-3 pt-0">
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

      {/* Add custom fields section - Always show if custom fields exist */}
      {availableCustomFields.length > 0 && (
        <div className="border rounded-lg overflow-hidden border-gray-200">
          <div 
            className="p-3 flex items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="text-sm font-medium" style={{ color: "#2c3e50" }}>
              Add Custom Field ({availableCustomFields.length} types available)
            </span>
            <Plus className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
          </div>
          {isOpen && (
            <div className="p-3 border-t border-gray-200">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={selectedCustomFieldId}
                    onValueChange={setSelectedCustomFieldId}
                  >
                    <SelectTrigger
                      className="border-2 text-sm"
                      style={{
                        borderColor: "#bdc3c7",
                        color: "#2c3e50",
                        backgroundColor: "white",
                      }}
                    >
                      <SelectValue placeholder="Select a custom field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCustomFields.map((field) => (
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
                  size="sm"
                  style={{
                    backgroundColor: selectedCustomFieldId
                      ? "#16a085"
                      : "#f5f7fa",
                    color: selectedCustomFieldId ? "white" : "#bdc3c7",
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                💡 Tip: You can add the same custom field multiple times with different values.
              </div>
            </div>
          )}
        </div>
      )}

      {availableCustomFields.length === 0 && (
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs" style={{ color: "#7f8c8d" }}>
            No custom fields available. Use the "Manage" button above to create custom fields.
          </p>
        </div>
      )}
    </div>
  );
}
