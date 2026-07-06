'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onSave: () => Promise<void>;
  label?: string;
};

export function SaveBar({ onSave, label = 'Save changes' }: Props) {
  const [pending, setPending] = useState(false);
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          Changes are validated, saved to Firestore, and trigger an ISR
          revalidation.
        </div>
        <Button
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await onSave();
              toast.success('Saved');
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Save failed');
            } finally {
              setPending(false);
            }
          }}
          className="rounded-full"
        >
          {pending ? (
            <>
              <Loader2 data-icon="inline-start" className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save data-icon="inline-start" />
              {label}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
