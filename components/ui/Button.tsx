import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-900 disabled:bg-brand-250",
  secondary:
    "bg-white text-brand-900 border border-brand-250 hover:bg-brand-100 disabled:opacity-50",
  ghost: "bg-transparent text-brand-900 hover:bg-brand-100 disabled:opacity-50",
  danger:
    "bg-status-critical/15 text-white hover:bg-status-critical/25 disabled:opacity-50",
  success:
    "bg-status-good/15 text-white hover:bg-status-good/25 disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
});
