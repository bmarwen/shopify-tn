// src/components/admin/product-variants-form.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash, Plus, ChevronDown, ChevronUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Variant {
  id?: string;
  name: string;
  price: number;
  inventory: number;
  sku?: string;
  barcode?: string;
  options: Record<string, string>;
}

interface ProductVariantsFormProps {
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
}

export default function ProductVariantsForm({
  variants = [],
  onChange,
}: ProductVariantsFormProps) {
  // Local state to ensure we don't lose changes when switching tabs
  const [localVariants, setLocalVariants] = useState<Variant[]>(variants);
  const [expandedVariants, setExpandedVariants] = useState<Set<number>>(
    new Set()
  );
  const [optionTypes, setOptionTypes] = useState<string[]>(
    // Extract unique option types from existing variants or provide defaults
    Array.from(
      new Set(
        localVariants.flatMap((variant) => Object.keys(variant.options || {}))
      )
    ).length > 0
      ? Array.from(
          new Set(
            localVariants.flatMap((variant) =>
              Object.keys(variant.options || {})
            )
          )
        )
      : ["Color", "Size"] // Default option types
  );

  // Sync with parent when props change
  useEffect(() => {
    setLocalVariants(variants);
  }, [variants]);

  // Toggle variant expanded/collapsed state
  const toggleVariant = (index: number) => {
    const newExpandedVariants = new Set(expandedVariants);
    if (expandedVariants.has(index)) {
      newExpandedVariants.delete(index);
    } else {
      newExpandedVariants.add(index);
    }
    setExpandedVariants(newExpandedVariants);
  };

  // Add a new variant
  const addVariant = () => {
    // Create a new variant with empty values for each option type
    const newVariant: Variant = {
      name: "",
      price: 0,
      inventory: 0,
      sku: "",
      options: optionTypes.reduce((acc, type) => {
        acc[type] = "";
        return acc;
      }, {} as Record<string, string>),
    };

    const updatedVariants = [...localVariants, newVariant];
    setLocalVariants(updatedVariants);
    onChange(updatedVariants);

    // Auto-expand the newly added variant
    setExpandedVariants(new Set([...expandedVariants, localVariants.length]));
  };

  // Update a variant
  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const updatedVariants = [...localVariants];

    if (field === "options") {
      updatedVariants[index].options = {
        ...updatedVariants[index].options,
        ...value,
      };

      // Auto-generate name from options if it hasn't been manually set
      const currentName = updatedVariants[index].name;
      const generatedName = Object.values(updatedVariants[index].options)
        .filter(Boolean)
        .join(" / ");

      // Only update name if it appears to be auto-generated or empty
      if (
        !currentName ||
        currentName ===
          Object.values({ ...updatedVariants[index].options, ...value })
            .filter(Boolean)
            .join(" / ")
      ) {
        updatedVariants[index].name = generatedName;
      }
    } else {
      // @ts-ignore - We know this is a valid field
      updatedVariants[index][field] = value;
    }

    setLocalVariants(updatedVariants);
    onChange(updatedVariants);
  };

  // Remove a variant
  const removeVariant = (index: number) => {
    const updatedVariants = [...localVariants];
    updatedVariants.splice(index, 1);

    // Update expanded variants set
    const newExpandedVariants = new Set<number>();
    expandedVariants.forEach((expandedIndex) => {
      if (expandedIndex < index) {
        newExpandedVariants.add(expandedIndex);
      } else if (expandedIndex > index) {
        newExpandedVariants.add(expandedIndex - 1);
      }
    });

    setExpandedVariants(newExpandedVariants);
    setLocalVariants(updatedVariants);
    onChange(updatedVariants);
  };

  // Add a new option type (e.g., Color, Size)
  const addOptionType = () => {
    let newOptionName = "New Option";
    let counter = 1;

    // Make sure the name is unique
    while (optionTypes.includes(newOptionName)) {
      newOptionName = `New Option ${counter}`;
      counter++;
    }

    // Add to option types
    const newOptionTypes = [...optionTypes, newOptionName];
    setOptionTypes(newOptionTypes);

    // Add this option to all variants with empty value
    const updatedVariants = localVariants.map((variant) => ({
      ...variant,
      options: {
        ...variant.options,
        [newOptionName]: "",
      },
    }));

    setLocalVariants(updatedVariants);
    onChange(updatedVariants);
  };

  // Update option type name
  const updateOptionType = (oldType: string, newType: string) => {
    // Prevent duplicate option types
    if (optionTypes.includes(newType) && oldType !== newType) {
      return;
    }

    // Update option type
    const newOptionTypes = optionTypes.map((type) =>
      type === oldType ? newType : type
    );
    setOptionTypes(newOptionTypes);

    // Update option keys in all variants
    const updatedVariants = localVariants.map((variant) => {
      const updatedOptions = { ...variant.options };
      if (oldType in updatedOptions) {
        updatedOptions[newType] = updatedOptions[oldType];
        delete updatedOptions[oldType];
      }

      return {
        ...variant,
        options: updatedOptions,
      };
    });

    setLocalVariants(updatedVariants);
    onChange(updatedVariants);
  };

  // Remove an option type
  const removeOptionType = (typeToRemove: string) => {
    // Remove from option types
    const newOptionTypes = optionTypes.filter((type) => type !== typeToRemove);
    setOptionTypes(newOptionTypes);

    // Remove this option from all variants
    const updatedVariants = localVariants.map((variant) => {
      const updatedOptions = { ...variant.options };
      delete updatedOptions[typeToRemove];

      return {
        ...variant,
        options: updatedOptions,
      };
    });

    setLocalVariants(updatedVariants);
    onChange(updatedVariants);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium" style={{ color: "#2c3e50" }}>
            Option Types
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOptionType}
            style={{
              borderColor: "#bdc3c7",
              color: "#2c3e50",
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Option Type
          </Button>
        </div>

        <div
          className="border rounded-lg p-4"
          style={{ borderColor: "#bdc3c7" }}
        >
          <p className="text-sm mb-4" style={{ color: "#7f8c8d" }}>
            Define the option types for your variants (e.g., Color, Size,
            Material). Each variant can have different values for these options.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optionTypes.map((type, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={type}
                  onChange={(e) => updateOptionType(type, e.target.value)}
                  placeholder="e.g., Color, Size, Material"
                  className="border-2"
                  style={{
                    borderColor: "#bdc3c7",
                    color: "#2c3e50",
                    backgroundColor: "white",
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOptionType(type)}
                  disabled={optionTypes.length <= 1}
                  style={{
                    color: optionTypes.length <= 1 ? "#bdc3c7" : "#e74c3c",
                  }}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium" style={{ color: "#2c3e50" }}>
            Product Variants
          </h3>
          <Button
            type="button"
            onClick={addVariant}
            style={{
              backgroundColor: "#16a085",
              color: "white",
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>
        </div>

        {localVariants.length === 0 ? (
          <div
            className="border rounded-lg p-6 text-center"
            style={{ borderColor: "#bdc3c7" }}
          >
            <p style={{ color: "#2c3e50" }}>
              No variants yet. Add variants to create different versions of your
              product (e.g., different colors, sizes).
            </p>
            <Button
              type="button"
              onClick={addVariant}
              style={{
                backgroundColor: "#16a085",
                color: "white",
                marginTop: "1rem",
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Variant
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {localVariants.map((variant, index) => (
              <Card
                key={index}
                className="border overflow-hidden"
                style={{ borderColor: "#bdc3c7" }}
              >
                <CardHeader
                  className="flex flex-row items-center justify-between cursor-pointer p-4"
                  style={{
                    backgroundColor: expandedVariants.has(index)
                      ? "#f5f7fa"
                      : "white",
                  }}
                  onClick={() => toggleVariant(index)}
                >
                  <div className="flex items-center">
                    {expandedVariants.has(index) ? (
                      <ChevronUp
                        className="h-4 w-4 mr-2"
                        style={{ color: "#2c3e50" }}
                      />
                    ) : (
                      <ChevronDown
                        className="h-4 w-4 mr-2"
                        style={{ color: "#2c3e50" }}
                      />
                    )}
                    <CardTitle
                      className="text-base font-medium"
                      style={{ color: "#2c3e50" }}
                    >
                      {variant.name || `Variant ${index + 1}`}
                    </CardTitle>
                  </div>
                  <div className="flex items-center">
                    <span style={{ color: "#2c3e50" }}>
                      ${variant.price.toFixed(2)}
                    </span>
                    <span className="mx-2 text-sm" style={{ color: "#7f8c8d" }}>
                      |
                    </span>
                    <span style={{ color: "#2c3e50" }}>
                      {variant.inventory} in stock
                    </span>
                  </div>
                </CardHeader>

                {expandedVariants.has(index) && (
                  <CardContent
                    className="p-4 border-t"
                    style={{ borderColor: "#bdc3c7" }}
                  >
                    <div className="space-y-4">
                      {/* Option values section */}
                      <div>
                        <h4
                          className="font-medium mb-2"
                          style={{ color: "#2c3e50" }}
                        >
                          Options
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {optionTypes.map((optionType) => (
                            <div key={optionType} className="space-y-2">
                              <Label style={{ color: "#2c3e50" }}>
                                {optionType}
                              </Label>
                              <Input
                                value={variant.options[optionType] || ""}
                                onChange={(e) =>
                                  updateVariant(index, "options", {
                                    [optionType]: e.target.value,
                                  })
                                }
                                placeholder={`Enter ${optionType.toLowerCase()}`}
                                className="border-2"
                                style={{
                                  borderColor: "#bdc3c7",
                                  color: "#2c3e50",
                                  backgroundColor: "white",
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Basic info section */}
                      <div>
                        <h4
                          className="font-medium mb-2"
                          style={{ color: "#2c3e50" }}
                        >
                          Variant Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label style={{ color: "#2c3e50" }}>
                              Variant Name
                            </Label>
                            <Input
                              value={variant.name}
                              onChange={(e) =>
                                updateVariant(index, "name", e.target.value)
                              }
                              placeholder="Auto-generated from options if empty"
                              className="border-2"
                              style={{
                                borderColor: "#bdc3c7",
                                color: "#2c3e50",
                                backgroundColor: "white",
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: "#2c3e50" }}>Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.price}
                              onChange={(e) =>
                                updateVariant(
                                  index,
                                  "price",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="border-2"
                              style={{
                                borderColor: "#bdc3c7",
                                color: "#2c3e50",
                                backgroundColor: "white",
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: "#2c3e50" }}>
                              Inventory
                            </Label>
                            <Input
                              type="number"
                              value={variant.inventory}
                              onChange={(e) =>
                                updateVariant(
                                  index,
                                  "inventory",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="border-2"
                              style={{
                                borderColor: "#bdc3c7",
                                color: "#2c3e50",
                                backgroundColor: "white",
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Extra fields */}
                      <div>
                        <h4
                          className="font-medium mb-2"
                          style={{ color: "#2c3e50" }}
                        >
                          Additional Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label style={{ color: "#2c3e50" }}>SKU</Label>
                            <Input
                              value={variant.sku || ""}
                              onChange={(e) =>
                                updateVariant(index, "sku", e.target.value)
                              }
                              placeholder="Optional"
                              className="border-2"
                              style={{
                                borderColor: "#bdc3c7",
                                color: "#2c3e50",
                                backgroundColor: "white",
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: "#2c3e50" }}>Barcode</Label>
                            <Input
                              value={variant.barcode || ""}
                              onChange={(e) =>
                                updateVariant(index, "barcode", e.target.value)
                              }
                              placeholder="Optional"
                              className="border-2"
                              style={{
                                borderColor: "#bdc3c7",
                                color: "#2c3e50",
                                backgroundColor: "white",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeVariant(index)}
                        style={{
                          backgroundColor: "#e74c3c",
                          color: "white",
                        }}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Remove Variant
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
