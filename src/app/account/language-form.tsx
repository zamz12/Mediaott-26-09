"use client";

import { useRef } from "react";
import { updatePreferredLanguageAction } from "./actions";

export function LanguageForm({ languages, selectedId }: { languages: { id: string; label: string }[]; selectedId: string | null | undefined }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updatePreferredLanguageAction} className="flex flex-wrap gap-2">
      {languages.map((lang) => (
        <label key={lang.id} className="cursor-pointer">
          <input
            type="radio"
            name="languageId"
            value={lang.id}
            defaultChecked={selectedId === lang.id}
            className="peer sr-only"
            onChange={() => formRef.current?.requestSubmit()}
          />
          <span className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm peer-checked:border-[var(--color-accent)] peer-checked:text-[var(--color-accent)]">
            {lang.label}
          </span>
        </label>
      ))}
    </form>
  );
}
