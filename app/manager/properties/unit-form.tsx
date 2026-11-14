"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import type { FormState } from "@/lib/form-state";

export function UnitForm({
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FormField label="Unit number" name="unitNumber" defaultValue={value("unitNumber")} errors={errors("unitNumber")} />
        <FormField label="Bedrooms" name="bedrooms" type="number" step="1" defaultValue={value("bedrooms")} errors={errors("bedrooms")} />
        <FormField label="Bathrooms" name="bathrooms" type="number" step="0.5" defaultValue={value("bathrooms")} errors={errors("bathrooms")} />
        <FormField label="Monthly rent ($)" name="monthlyRent" type="number" step="0.01" defaultValue={value("monthlyRent")} errors={errors("monthlyRent")} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Unit added.</p>}
      <button
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
