import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

const buttonStyles = cva(
  "focus-ring inline-flex items-center justify-center gap-2 rounded-full font-medium transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-strong)]",
        secondary: "bg-white/10 text-[var(--color-fg)] hover:bg-white/20",
        ghost: "bg-transparent text-[var(--color-fg)] hover:bg-white/10",
        danger: "bg-[var(--color-danger)] text-black hover:opacity-90",
        gold: "bg-[var(--color-gold)] text-black hover:opacity-90",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  href?: string;
}

export function Button({ className, variant, size, href, ...props }: ButtonProps) {
  const classes = clsx(buttonStyles({ variant, size }), className);
  if (href) {
    return (
      <Link href={href} className={classes}>
        {props.children}
      </Link>
    );
  }
  return <button className={classes} {...props} />;
}
