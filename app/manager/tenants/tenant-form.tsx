"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import type { FormState } from "@/lib/form-state";

export function TenantForm({
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
      <FormField label="Full name" name="name" defaultValue={value("name")} errors={errors("name")} />
      <FormField label="Email" name="email" type="email" defaultValue={value("email")} errors={errors("email")} />
      <FormField label="Phone (optional)" name="phone" type="tel" required={false} defaultValue={value("phone")} errors={errors("phone")} />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.message && (
        <p className="rounded border border-green-600 p-3 text-sm">{state.message}</p>
      )}
      {state.ok && !state.message && <p className="text-sm text-green-600">Saved.</p>}
      <button
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
