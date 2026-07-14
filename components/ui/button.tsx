import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/design/cn";

/**
 * Button — pill-shaped, uppercase tracked label per the brief §7. Variants map
 * to the sd-btn-* classes in globals.css. Press dips 1px (transform 100ms);
 * there is no hover-scale, by design law.
 */
type Variant = "primary" | "ghost" | "quiet";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "sd-btn-primary",
  ghost: "sd-btn-ghost",
  quiet: "sd-btn-quiet",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("sd-btn", VARIANT_CLASS[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
