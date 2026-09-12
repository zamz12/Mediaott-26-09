import { clsx } from "clsx";

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "gold" | "danger" | "success";
  className?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-white/10 text-[var(--color-fg)]",
    accent: "bg-[var(--color-accent)]/20 text-[var(--color-accent)]",
    gold: "bg-[var(--color-gold)]/20 text-[var(--color-gold)]",
    danger: "bg-[var(--color-danger)]/20 text-[var(--color-danger)]",
    success: "bg-[var(--color-success)]/20 text-[var(--color-success)]",
  };

  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", toneClasses[tone], className)}>
      {children}
    </span>
  );
}
