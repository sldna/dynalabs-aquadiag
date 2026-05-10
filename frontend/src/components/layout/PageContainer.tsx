import type { ReactNode } from "react";

/** Mobile-first Breite: Tablet ~840px, Desktop bis ~1200px, immer seitlicher Innenabstand. */
export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full px-4 py-6 sm:px-5 md:max-w-[840px] md:py-8 lg:max-w-[1160px] xl:max-w-[1200px] lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}
