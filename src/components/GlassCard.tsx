import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function GlassCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "glass rounded-3xl shadow-card p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
