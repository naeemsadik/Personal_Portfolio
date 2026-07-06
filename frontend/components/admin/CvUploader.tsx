'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  className?: string;
};

/**
 * CV / Resume uploader for the admin Settings page.
 *
 * Modeled on `ImageUploader` but PDF-only. Drops or selects a `.pdf`,
 * uploads to `/api/upload/cv` (which forwards to FastAPI
 * `POST /uploads?kind=cv`), and stores the returned URL in
 * `settings.cvUrl`. The public hero / nav / contact page renders a
 * "Download CV" button only when this URL is set.
 */
export function CvUploader({ value, onChange, label, hint, className }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    // Client-side guard — keeps the round-trip snappy and avoids
    // 415s for obvious wrong types. The backend re-validates.
    if (file.type && file.type !== 'application/pdf') {
      toast.error('CV uploads must be PDF');
      return;
    }
    setPending(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/cv', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Upload failed');
      }
      const data = (await res.json()) as { url: string };
      onChange(data.url);
      toast.success('CV uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'relative flex min-h-[140px] items-center justify-center overflow-hidden rounded-lg border border-dashed bg-card/40 transition-colors',
          dragOver ? 'border-accent/60 bg-accent/5' : 'border-border',
        )}
      >
        {value ? (
          <div className="flex w-full items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-md bg-accent/10 text-accent">
                <FileText className="size-5" />
              </div>
              <div className="flex min-w-0 flex-col">
                <div className="truncate text-sm font-medium text-foreground">
                  CV uploaded
                </div>
                <code className="truncate rounded bg-card/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {value}
                </code>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur transition hover:border-destructive hover:text-destructive"
              aria-label="Remove CV"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            {pending ? (
              <Loader2 className="size-6 animate-spin text-accent" />
            ) : (
              <FileText className="size-6 text-accent/80" />
            )}
            <div>
              <span className="text-foreground">Drop a PDF</span> or click to
              browse
            </div>
            <div className="text-xs">PDF only · up to 10 MB</div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => void handleFiles(e.target.files)}
          disabled={pending}
        />
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      <div className="flex items-center justify-between gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="… or paste a CV URL"
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
        >
          <Upload data-icon="inline-start" /> {value ? 'Replace' : 'Upload'}
        </Button>
      </div>
    </div>
  );
}
