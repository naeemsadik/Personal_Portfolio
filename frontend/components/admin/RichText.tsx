'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
};

export function RichText({ value, onChange, rows = 8 }: Props) {
  const [tab, setTab] = useState('write');
  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList>
        <TabsTrigger value="write">Write</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write" className="mt-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder="Markdown supported (headings, lists, links, code)…"
          className="font-mono text-sm"
        />
      </TabsContent>
      <TabsContent value="preview" className="mt-2">
        <div className="min-h-[180px] rounded-md border border-border bg-card/30 p-4 text-sm">
          {value.trim() ? (
            <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-accent prose-strong:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-muted-foreground">Nothing to preview yet.</div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
