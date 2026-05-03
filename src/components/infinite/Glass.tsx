import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function Glass({
  children,
  className,
  strong,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode; strong?: boolean }) {
  return (
    <div
      className={cn(strong ? "glass-strong" : "glass", "rounded-2xl", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
