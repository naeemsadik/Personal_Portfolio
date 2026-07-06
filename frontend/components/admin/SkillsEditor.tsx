'use client';

import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Skills = {
  languages: string[];
  frameworks: string[];
  tools: string[];
  frontend: string[];
  backend: string[];
  infrastructure: string[];
};

const GROUPS: Array<{
  key: keyof Skills;
  label: string;
  hint: string;
}> = [
  { key: 'languages', label: 'Languages', hint: 'Programming languages' },
  { key: 'frameworks', label: 'Frameworks', hint: 'Libraries and frameworks' },
  { key: 'tools', label: 'Tools', hint: 'IDEs, design tools, etc.' },
  { key: 'frontend', label: 'Frontend', hint: 'Frontend-specific skills' },
  { key: 'backend', label: 'Backend', hint: 'Backend-specific skills' },
  { key: 'infrastructure', label: 'Infrastructure', hint: 'DevOps and infra' },
];

type Props = {
  value: Skills;
  onChange: (next: Skills) => void;
};

export function SkillsEditor({ value, onChange }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {GROUPS.map((g) => (
        <GroupEditor
          key={g.key}
          label={g.label}
          hint={g.hint}
          items={value[g.key]}
          onChange={(next) => onChange({ ...value, [g.key]: next })}
        />
      ))}
    </div>
  );
}

function GroupEditor({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (items.includes(v)) {
      toast.error(`"${v}" is already in ${label}`);
      return;
    }
    onChange([...items, v]);
    setDraft('');
  }

  function remove(item: string) {
    onChange(items.filter((x) => x !== item));
  }

  async function pasteBulk(raw: string) {
    const list = raw
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    setPending(true);
    try {
      const next = [...items];
      for (const v of list) {
        if (!next.includes(v)) next.push(v);
      }
      onChange(next);
      setDraft('');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-card/40 p-3">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</div>
        </div>
        <div className="text-[10px] text-muted-foreground">{items.length} item(s)</div>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="gap-1 pr-1 text-[11px]"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label={`Remove ${item}`}
                className="ml-0.5 grid size-4 place-items-center rounded-sm text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground/70">
          No items yet.
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            } else if (e.key === ',' && draft.trim()) {
              e.preventDefault();
              void pasteBulk(draft);
            }
          }}
          placeholder="Add item (Enter to add, comma to bulk-add)"
          className="h-8 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={pending || !draft.trim()}
          className="h-8 shrink-0"
          aria-label={`Add to ${label}`}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
