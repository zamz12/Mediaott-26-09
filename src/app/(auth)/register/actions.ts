"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { registerViewer, EmailAlreadyRegisteredError, HandleTakenError } from "@/modules/auth/service";
import { registerSchema } from "@/modules/auth/schema";

export interface RegisterFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function registerAction(_prev: RegisterFormState, formData: FormData): Promise<RegisterFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
    handle: formData.get("handle"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as string] = issue.message;
    return { fieldErrors };
  }

  try {
    await registerViewer(parsed.data);
  } catch (err) {
    if (err instanceof EmailAlreadyRegisteredError || err instanceof HandleTakenError) {
      return { error: err.message };
    }
    throw err;
  }

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/",
  });
  redirect("/");
}
