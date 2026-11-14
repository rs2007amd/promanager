"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form-state";

export function DeleteButton({
  action,
  label,
  confirmMessage,
}: {
  action: (prev: FormState) => Promise<FormState>;
  label: string;
  confirmMessage: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-2">
      <button
        disabled={pending}
        onClick={(e) => {
          if (!confirm(confirmMessage)) e.preventDefault();
        }}
        className="rounded border border-red-600 px-3 py-1 text-sm text-red-600 disabled:opacity-50"
      >
        {pending ? "Deleting..." : label}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
