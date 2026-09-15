"use client";

import type { ButtonHTMLAttributes } from "react";
import { Button } from "./button";

interface ConfirmSubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  confirmMessage: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
}

// Thin client wrapper so a destructive action inside a server-rendered
// <form action={serverAction}> gets a native confirm() prompt without
// converting the whole page to a client component.
export function ConfirmSubmitButton({ confirmMessage, onClick, ...props }: ConfirmSubmitButtonProps) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    />
  );
}
