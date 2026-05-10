import type { ComponentPropsWithoutRef } from "react";

type CardProps = ComponentPropsWithoutRef<"div"> & {
  padding?: boolean;
};

export function Card({ children, className = "", padding = true, ...rest }: CardProps) {
  const pad = padding ? "p-4 sm:p-5" : "";
  return (
    <div
      className={`rounded-card border border-aqua-deep/10 bg-white shadow-card ${pad} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
