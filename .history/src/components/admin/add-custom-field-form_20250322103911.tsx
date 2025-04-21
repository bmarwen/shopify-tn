// src/components/admin/add-custom-field-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Form schema
const customFieldSchema = z.object({
  name: z.string().min(2, "Field name must be at least 2 characters"),
  type: z.string().min(1, "Field type is required"),
  required: z.boolean().default(false),
});

type CustomFieldFormValues = z.infer<typeof customFieldSchema>;

export default function AddCustomFieldForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      name: "",
      type: "TEXT",
      required: false,
    },
  });

  const onSubmit = async (values: CustomFieldFormValues) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/custom-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create custom field");
      }

      // Reset form and show success message
      form.reset();
      setSuccess(true);

      // Refresh to update the list
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      console.error("Error creating custom field:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldTypes = [
    { value: "TEXT", label: "Text (Single line)" },
    { value: "TEXTAREA", label: "Text (Multiple lines)" },
    { value: "NUMBER", label: "Number" },
    { value: "DATE", label: "Date" },
    { value: "BOOLEAN", label: "Yes/No" },
    { value: "SELECT", label: "Select (Dropdown)" },
  ];

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Custom field created successfully!
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Field Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Material, Color, Dimensions"
                    className="border-gray-300 text-gray-800 placeholder:text-gray-400"
                  />
                </FormControl>
                <FormDescription className="text-gray-600">
                  This name will appear as a label in product forms
                </FormDescription>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Field Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="border-gray-300 text-gray-800">
                      <SelectValue placeholder="Select field type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-gray-600">
                  This determines how the field will be displayed and what kind
                  of data it accepts
                </FormDescription>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="required"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-gray-700">
                    Required Field
                  </FormLabel>
                  <FormDescription className="text-gray-600">
                    Make this field mandatory when creating or editing products
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSubmitting ? "Creating..." : "Create Custom Field"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
