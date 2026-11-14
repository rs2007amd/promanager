"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import type { FormState } from "@/lib/form-state";

type Option = { value: string; label: string };

export function LeaseForm({
  action,
  tenants,
  units,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  tenants: Option[];
  units: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (name: string) => state.values?.[name];
  const errors = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4">
      <FormField
        label="Tenant"
        name="tenantId"
        options={[{ value: "", label: "Choose a tenant..." }, ...tenants]}
        defaultValue={value("tenantId")}
        errors={errors("tenantId")}
      />
      <FormField
        label="Unit (vacant units only)"
        name="unitId"
        options={[{ value: "", label: "Choose a unit..." }, ...units]}
        defaultValue={value("unitId")}
        errors={errors("unitId")}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Start date" name="startDate" type="date" defaultValue={value("startDate")} errors={errors("startDate")} />
        <FormField label="End date" name="endDate" type="date" defaultValue={value("endDate")} errors={errors("endDate")} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Monthly rent ($)" name="rentAmount" type="number" step="0.01" defaultValue={value("rentAmount")} errors={errors("rentAmount")} />
        <FormField label="Security deposit ($)" name="securityDeposit" type="number" step="0.01" defaultValue={value("securityDeposit")} errors={errors("securityDeposit")} />
        <FormField label="Rent due day (1-28)" name="dueDay" type="number" step="1" defaultValue={value("dueDay") ?? "1"} errors={errors("dueDay")} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create lease"}
      </button>
    </form>
  );
}
