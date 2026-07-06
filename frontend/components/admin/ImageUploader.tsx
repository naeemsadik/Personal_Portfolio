'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  className?: string;
};

export function ImageUploader({ value, onChange, label, hint, className }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    setPending(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Upload failed');
      }
      const data = (await res.json()) as { url: string };
      onChange(data.url);
      toast.success('Uploaded');
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
          'relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-lg border border-dashed bg-card/40 transition-colors',
          dragOver ? 'border-accent/60 bg-accent/5' : 'border-border',
        )}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt="Upload preview"
              fill
              unoptimized
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur transition hover:border-destructive hover:text-destructive"
              aria-label="Remove image"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            {pending ? (
              <Loader2 className="size-6 animate-spin text-accent" />
            ) : (
              <Upload className="size-6 text-accent/80" />
            )}
            <div>
              <span className="text-foreground">Drop an image</span> or click to
              browse
            </div>
            <div className="text-xs">PNG, JPG, WebP · up to 8 MB</div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
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
          placeholder="… or paste an image URL"
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
        >
          Upload
        </Button>
      </div>
    </div>
  );
}
