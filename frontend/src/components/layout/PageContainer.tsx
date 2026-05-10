import type { HTMLAttributes, ReactNode } from "react";

export type PageContainerVariant = "default" | "wide" | "readable";

const variantMax: Record<PageContainerVariant, string> = {
  /** Long-form & detail: ~1040–1200px */
  default: "max-w-[1200px]",
  /** Dashboard-style lists / grids */
  wide: "max-w-[1320px]",
  /** Diagnose & dense forms: readable column */
  readable: "max-w-[920px]",
};

type PageContainerProps = {
  children: ReactNode;
  variant?: PageContainerVariant;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">;

/**
 * Required outer wrapper for dashboard page bodies (horizontal padding + max width).
 */
export function PageContainer({
  children,
  variant = "default",
  className = "",
  ...rest
}: PageContainerProps) {
  const max = variantMax[variant];
  return (
    <main
      className={`mx-auto flex min-h-0 w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8 ${max} ${className}`.trim()}
      {...rest}
    >
      {children}
    </main>
  );
}
