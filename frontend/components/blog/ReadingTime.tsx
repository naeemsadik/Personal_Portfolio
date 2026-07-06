import { Clock } from 'lucide-react';

type Props = {
  minutes: number;
};

export function ReadingTime({ minutes }: Props) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      <Clock className="size-3" />
      {minutes} min read
    </span>
  );
}
