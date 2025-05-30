// src/components/admin/customers/customer-form.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, User, Mail, Phone, MapPin, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Validation schema
const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface Customer {
  id: string;
  name: string;
  email: string;
  addresses: {
    id: string;
    name?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    isDefault: boolean;
  }[];
}

interface CustomerFormProps {
  customer?: Customer;
  shopId: string;
  isEditing?: boolean;
}

export default function CustomerForm({
  customer,
  shopId,
  isEditing = false,
}: CustomerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Get default address
  const defaultAddress = customer?.addresses?.find(addr => addr.isDefault) || customer?.addresses?.[0];

  // Default values for the form
  const defaultValues: CustomerFormValues = useMemo(() => {
    if (customer) {
      return {
        name: customer.name || "",
        email: customer.email,
        password: "", // Don't pre-fill password for editing
        phone: defaultAddress?.phone || "",
        address: {
          line1: defaultAddress?.line1 || "",
          line2: defaultAddress?.line2 || "",
          city: defaultAddress?.city || "",
          state: defaultAddress?.state || "",
          postalCode: defaultAddress?.postalCode || "",
          country: defaultAddress?.country || "Tunisia",
        },
      };
    }
    return {
      name: "",
      email: "",
      password: "",
      phone: "",
      address: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "Tunisia",
      },
    };
  }, [customer, defaultAddress]);

  // Create form
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  // Form submission handler
  const onSubmit = async (values: CustomerFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const url = isEditing ? `/api/customers/${customer?.id}` : "/api/customers";
      const method = isEditing ? "PUT" : "POST";

      // Prepare data
      const submitData = {
        ...values,
        shopId,
      };

      // Remove empty password for editing
      if (isEditing && !values.password) {
        delete submitData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save customer");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: result.message || `Customer ${isEditing ? "updated" : "created"} successfully`,
      });

      // Redirect to customers list or customer detail page
      if (isEditing) {
        router.push(`/admin/customers/${customer?.id}`);
      } else {
        router.push("/admin/customers");
      }
      router.refresh();
    } catch (error: any) {
      console.error("Error saving customer:", error);
      setSubmitError(error.message || "An error occurred while saving");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Information */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <CardTitle className="text-xl font-semibold flex items-center">
                <User className="mr-2 h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-blue-100">
                Basic customer details
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-6 bg-white">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Full Name *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter customer's full name"
                        className="border-gray-300 focus:border-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-gray-600">
                      Customer's full name as it should appear in orders
                    </FormDescription>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium flex items-center">
                      <Mail className="mr-2 h-4 w-4" />
                      Email Address *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="customer@example.com"
                        className="border-gray-300 focus:border-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-gray-600">
                      Used for login and order notifications
                    </FormDescription>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium flex items-center">
                      <Lock className="mr-2 h-4 w-4" />
                      Password {isEditing && "(Optional - leave blank to keep current)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isEditing ? "Leave blank to keep current password" : "Enter password"}
                        className="border-gray-300 focus:border-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-gray-600">
                      {isEditing 
                        ? "Only fill this if you want to change the password"
                        : "Minimum 6 characters. If left blank, a random password will be generated."
                      }
                    </FormDescription>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium flex items-center">
                      <Phone className="mr-2 h-4 w-4" />
                      Phone Number (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+216 XX XXX XXX"
                        className="border-gray-300 focus:border-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-gray-600">
                      Customer's contact phone number
                    </FormDescription>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
              <CardTitle className="text-xl font-semibold flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Address Information
              </CardTitle>
              <CardDescription className="text-green-100">
                Customer's address details (optional)
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-6 bg-white">
              <FormField
                control={form.control}
                name="address.line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Address Line 1
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Street address"
                        className="border-gray-300 focus:border-green-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address.line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      Address Line 2 (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Apartment, suite, unit, etc."
                        className="border-gray-300 focus:border-green-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">
                        City
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City"
                          className="border-gray-300 focus:border-green-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">
                        State/Governorate
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="State or Governorate"
                          className="border-gray-300 focus:border-green-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">
                        Postal Code
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Postal code"
                          className="border-gray-300 focus:border-green-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">
                        Country
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Country"
                          className="border-gray-300 focus:border-green-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/customers")}
            className="px-6"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 px-6"
          >
            {isSubmitting
              ? "Saving..."
              : isEditing
              ? "Update Customer"
              : "Create Customer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
