import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: number | string;
  hint?: string;
  Icon?: React.ComponentType<{ className?: string }>;
  accent?: boolean;
};

export function StatCard({ label, value, hint, Icon, accent }: Props) {
  return (
    <Card
      className={cn(
        'border-border/60 bg-card/40 backdrop-blur-sm',
        accent && 'border-accent/30 bg-accent/5',
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'grid size-10 place-items-center rounded-lg',
              accent
                ? 'bg-accent/15 text-accent'
                : 'bg-card text-muted-foreground',
            )}
          >
            <Icon />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
