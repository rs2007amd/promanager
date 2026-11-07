"use server";

import { put } from "@vercel/blob";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { RequestStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at ~4.5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
});

type FormState = { error?: string; ok?: boolean };

export async function submitMaintenanceRequest(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (!session || session.user.role !== "TENANT") {
    return { error: "Not allowed" };
  }

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: "Add a title (3+ characters) and a description (10+)." };
  }

  // The unit comes from the tenant's own active lease, never from the form
  const lease = await prisma.lease.findFirst({
    where: { status: "ACTIVE", tenant: { userId: session.user.id } },
    select: { unitId: true, tenantId: true },
  });
  if (!lease) return { error: "You don't have an active lease." };

  let photoUrl: string | undefined;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: "Photo must be a JPG, PNG, or WebP image." };
    }
    if (file.size > MAX_BYTES) {
      return { error: "Photo must be under 4 MB." };
    }
    const ext = file.type.split("/")[1];
    // Random filename, so the original name is never trusted or exposed
    const blob = await put(`maintenance/${crypto.randomUUID()}.${ext}`, file, {
      access: "public",
    });
    photoUrl = blob.url;
  }

  await prisma.maintenanceRequest.create({
    data: {
      unitId: lease.unitId,
      tenantId: lease.tenantId,
      title: parsed.data.title,
      description: parsed.data.description,
      photoUrl,
    },
  });

  revalidatePath("/tenant/maintenance");
  revalidatePath("/manager/maintenance");
  return { ok: true };
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  await requireManager();
  const safeStatus = z.nativeEnum(RequestStatus).parse(status);
  await prisma.maintenanceRequest.update({
    where: { id },
    data: { status: safeStatus },
  });
  revalidatePath("/manager/maintenance");
  revalidatePath("/tenant/maintenance");
}
