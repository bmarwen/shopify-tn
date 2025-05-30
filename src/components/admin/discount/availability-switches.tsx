// src/components/admin/discount/availability-switches.tsx
"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

interface AvailabilitySwitchesProps {
  control: any;
}

export default function AvailabilitySwitches({ control }: AvailabilitySwitchesProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="availableOnline"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-gray-700 font-medium">
                Available Online
              </FormLabel>
              <FormDescription className="text-gray-600">
                Enable for e-commerce orders
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="availableInStore"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-gray-700 font-medium">
                Available In Store
              </FormLabel>
              <FormDescription className="text-gray-600">
                Enable for POS/in-store orders
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="enabled"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-gray-700 font-medium">
                Active
              </FormLabel>
              <FormDescription className="text-gray-600">
                Enable or disable this discount
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
