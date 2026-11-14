"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form-state";

// A button that runs a Server Action and shows its result message or error
export function ActionButton({
  action,
  label,
  confirmMessage,
}: {
  action: (prev: FormState) => Promise<FormState>;
  label: string;
  confirmMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-2">
      <button
        disabled={pending}
        onClick={(e) => {
          if (confirmMessage && !confirm(confirmMessage)) e.preventDefault();
        }}
        className="rounded border px-3 py-1 text-sm disabled:opacity-50"
      >
        {pending ? "Working..." : label}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.message && (
        <p className="rounded border border-green-600 p-2 text-sm">{state.message}</p>
      )}
    </form>
  );
}
