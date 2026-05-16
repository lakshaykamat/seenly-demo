import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
        success: "bg-positive/10 text-positive",
        warning: "bg-warning/10 text-warning",
        danger: "bg-destructive/10 text-destructive",
        primary: "bg-primary/10 text-primary",
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
