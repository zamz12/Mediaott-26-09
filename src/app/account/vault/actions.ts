"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { confirmVaultUpload, deleteVaultItem, requestVaultUpload } from "@/modules/vault/service";

export async function requestVaultUploadAction(fileName: string, contentType: string, sizeBytes: number) {
  const user = await requireSessionUser();
  return requestVaultUpload(user.id, fileName, contentType, sizeBytes);
}

export async function confirmVaultUploadAction(uploadSessionId: string) {
  const user = await requireSessionUser();
  await confirmVaultUpload(user.id, uploadSessionId);
  revalidatePath("/account/vault");
}

export async function deleteVaultItemAction(formData: FormData) {
  const user = await requireSessionUser();
  await deleteVaultItem(user.id, formData.get("itemId") as string);
  revalidatePath("/account/vault");
}
