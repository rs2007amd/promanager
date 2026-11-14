"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import type { FormState } from "@/lib/form-state";
import { PROPERTY_TYPES } from "@/lib/validation/property";

export function PropertyForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (name: string) => state.values?.[name] ?? defaults?.[name];
  const errors = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4">
      <FormField label="Property name" name="name" defaultValue={value("name")} errors={errors("name")} />
      <FormField label="Street address" name="address" defaultValue={value("address")} errors={errors("address")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="City" name="city" defaultValue={value("city")} errors={errors("city")} />
        <FormField label="State" name="state" defaultValue={value("state")} errors={errors("state")} />
        <FormField label="ZIP code" name="zip" defaultValue={value("zip")} errors={errors("zip")} />
      </div>
      <FormField
        label="Property type"
        name="propertyType"
        options={PROPERTY_TYPES}
        defaultValue={value("propertyType")}
        errors={errors("propertyType")}
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Saved.</p>}
      <button
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
