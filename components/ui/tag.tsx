import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        info: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
        success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        danger: "bg-red-500/10 text-red-700 dark:text-red-300",
        violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
        outline: "border border-border text-muted-foreground bg-transparent",
        custom: "",
      },
      size: {
        sm: "h-5",
        md: "h-6 px-2 text-xs",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "sm",
    },
  }
);

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {}

export function Tag({ className, tone, size, ...props }: TagProps) {
  return (
    <span className={cn(tagVariants({ tone, size }), className)} {...props} />
  );
}

export { tagVariants };
