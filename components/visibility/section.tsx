import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: SectionProps) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl bg-card ring-1 ring-border",
        className
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/60">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className={cn("flex-1 min-h-0 p-5", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
