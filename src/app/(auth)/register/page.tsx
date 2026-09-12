"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerAction, type RegisterFormState } from "./actions";

const initialState: RegisterFormState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <div>
      <h1 className="text-2xl font-bold">Create your free account</h1>
      <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
        Watch Malaysian stories, follow creators, and pick up where you left off.
      </p>

      <form action={formAction} className="mt-6 space-y-4" noValidate>
        {state.error && <p className="rounded-lg bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">{state.error}</p>}

        <div>
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" name="displayName" required autoComplete="name" />
          {state.fieldErrors?.displayName && <p className="mt-1 text-xs text-[var(--color-danger)]">{state.fieldErrors.displayName}</p>}
        </div>

        <div>
          <Label htmlFor="handle">Handle</Label>
          <Input id="handle" name="handle" placeholder="e.g. jejakmelaka_fan" required />
          {state.fieldErrors?.handle && <p className="mt-1 text-xs text-[var(--color-danger)]">{state.fieldErrors.handle}</p>}
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
          {state.fieldErrors?.email && <p className="mt-1 text-xs text-[var(--color-danger)]">{state.fieldErrors.email}</p>}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required autoComplete="new-password" />
          {state.fieldErrors?.password && <p className="mt-1 text-xs text-[var(--color-danger)]">{state.fieldErrors.password}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-fg-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-accent)]">
          Log in
        </Link>
      </p>
    </div>
  );
}
