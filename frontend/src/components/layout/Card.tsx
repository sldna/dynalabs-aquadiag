import type { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  as?: "div" | "section";
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">;

/**
 * Shared elevated surface (CD: rounded-card, ring, shadow-card).
 */
export function Card({ as: Tag = "div", className = "", children, ...rest }: CardProps) {
  return (
    <Tag
      className={`rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card ring-1 ring-aqua-deep/10 ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
