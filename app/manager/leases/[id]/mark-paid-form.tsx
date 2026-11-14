"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form-state";
import { PAYMENT_METHODS } from "@/lib/validation/tenant-lease";

export function MarkPaidForm({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <select name="method" defaultValue="check" className="rounded border p-1 text-sm">
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <button disabled={pending} className="rounded border px-2 py-1 text-sm disabled:opacity-50">
        {pending ? "Saving..." : "Mark paid"}
      </button>
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
