"use client";

import { useActionState } from "react";
import { submitMaintenanceRequest } from "./actions";

export function RequestForm() {
  const [state, action, pending] = useActionState(submitMaintenanceRequest, {});

  return (
    <form action={action} className="space-y-4">
      <input
        name="title"
        placeholder="What's the problem?"
        required
        className="w-full rounded border p-2"
      />
      <textarea
        name="description"
        placeholder="Describe the issue and where it is"
        required
        rows={4}
        className="w-full rounded border p-2"
      />
      <input
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Request sent.</p>}
      <button
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Sending..." : "Submit request"}
      </button>
    </form>
  );
}
