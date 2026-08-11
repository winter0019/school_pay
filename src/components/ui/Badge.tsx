import { cn } from "@/lib/cn";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700",
        className
      )}
    >
      {children}
    </span>
  );
}