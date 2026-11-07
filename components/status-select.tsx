"use client";

import { RequestStatus } from "@prisma/client";
import { updateRequestStatus } from "@/app/tenant/maintenance/actions";

export function StatusSelect({ id, current }: { id: string; current: RequestStatus }) {
  return (
    <select
      defaultValue={current}
      onChange={(e) => updateRequestStatus(id, e.target.value as RequestStatus)}
      className="rounded border p-1 text-sm"
    >
      <option value="OPEN">Open</option>
      <option value="IN_PROGRESS">In progress</option>
      <option value="RESOLVED">Resolved</option>
    </select>
  );
}
