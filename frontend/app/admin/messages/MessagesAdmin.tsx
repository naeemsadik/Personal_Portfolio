'use client';

import { useMemo, useState } from 'react';
import { Mail, Trash2, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/cn';
import { toast } from 'sonner';
import type { StoredMessage } from '@/lib/content/schema';

export function MessagesAdmin({ initial }: { initial: StoredMessage[] }) {
  const [messages, setMessages] = useState<StoredMessage[]>(initial);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selected, setSelected] = useState<StoredMessage | null>(null);

  const filtered = useMemo(() => {
    return messages
      .filter((m) =>
        filter === 'all' ? true : filter === 'unread' ? !m.read : m.read,
      )
      .filter((m) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q)
        );
      });
  }, [messages, query, filter]);

  async function toggleRead(m: StoredMessage) {
    const res = await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: m.id, read: !m.read }),
    });
    if (!res.ok) {
      toast.error('Update failed');
      return;
    }
    setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, read: !m.read } : x)));
    if (selected?.id === m.id) setSelected({ ...m, read: !m.read });
  }

  async function remove(m: StoredMessage) {
    const res = await fetch('/api/messages', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: m.id }),
    });
    if (!res.ok) {
      toast.error('Delete failed');
      return;
    }
    setMessages((ms) => ms.filter((x) => x.id !== m.id));
    if (selected?.id === m.id) setSelected(null);
    toast.success('Deleted');
  }

  function exportCsv() {
    const rows = [
      ['id', 'name', 'email', 'receivedAt', 'read', 'message'],
      ...filtered.map((m) => [
        m.id,
        m.name,
        m.email,
        m.receivedAt,
        String(m.read),
        m.message.replaceAll('"', '""'),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c)}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Messages
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact-form submissions from your portfolio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-border bg-card/40 p-1 text-xs">
            {(['all', 'unread', 'read'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  'rounded-full px-3 py-1 capitalize transition ' +
                  (filter === f
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground hover:text-foreground')
                }
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="outline" className="rounded-full" onClick={exportCsv}>
            <Download data-icon="inline-start" /> CSV
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/40 md:col-span-2">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or message…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="overflow-hidden rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="hidden md:table-cell">Preview</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No messages match.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((m) => (
                      <TableRow
                        key={m.id}
                        className={
                          'cursor-pointer ' +
                          (selected?.id === m.id ? 'bg-accent/5' : '')
                        }
                        onClick={() => setSelected(m)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                'inline-block size-2 shrink-0 rounded-full ' +
                                (m.read ? 'bg-border' : 'bg-accent shadow-[0_0_8px_2px] shadow-accent/40')
                              }
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{m.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDate(m.receivedAt)}
                        </TableCell>
                        <TableCell className="hidden max-w-[260px] truncate text-xs text-muted-foreground md:table-cell">
                          {m.message}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              void remove(m);
                            }}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete"
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex h-full flex-col gap-3 p-5">
            {selected ? (
              <>
                <div>
                  <div className="font-display text-lg font-semibold">
                    {selected.name}
                  </div>
                  <a
                    className="text-xs text-accent hover:underline"
                    href={`mailto:${selected.email}`}
                  >
                    {selected.email}
                  </a>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDate(selected.receivedAt)}
                  </div>
                </div>
                <div className="whitespace-pre-wrap rounded-md border border-border/60 bg-card/40 p-3 text-sm text-foreground/90">
                  {selected.message}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selected.read}
                      onCheckedChange={() => void toggleRead(selected)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {selected.read ? 'Read' : 'Unread'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void remove(selected)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid flex-1 place-items-center text-center text-sm text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Mail className="size-5 text-accent/70" />
                  Select a message to view it.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
