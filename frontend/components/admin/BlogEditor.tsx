'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Trash2,
  Save,
  Loader2,
  Loader2 as Loader2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RichText } from '@/components/admin/RichText';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { slugify } from '@/lib/cn';
import { toast } from 'sonner';
import type { BlogPost } from '@/lib/content/schema';

type Mode = 'create' | 'edit';

function blankPost(): Omit<BlogPost, 'id'> & { id?: number } {
  return {
    slug: '',
    title: '',
    excerpt: '',
    body: '',
    coverUrl: '',
    tags: [],
    status: 'draft',
    readingTimeMin: 1,
    order: 0,
    publishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; initial: BlogPost };

export function BlogEditor(props: Props) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost>(
    props.mode === 'edit'
      ? props.initial
      : ({ id: 0, ...blankPost() } as BlogPost),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function patch(p: Partial<BlogPost>) {
    setPost((cur) => ({ ...cur, ...p }));
  }

  async function save() {
    if (!post.title.trim() || !post.excerpt.trim() || !post.body.trim()) {
      toast.error('Title, excerpt, and body are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: post.id || undefined,
        slug: post.slug || slugify(post.title),
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        coverUrl: post.coverUrl || null,
        tags: post.tags,
        status: post.status,
        order: post.order,
      };
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Save failed');
      }
      const saved = (await res.json()) as BlogPost;
      setPost(saved);
      toast.success('Saved');
      if (props.mode === 'create') {
        // After creating, swap to the edit URL for the new post so a
        // page refresh keeps the user on the editor rather than the
        // blank "new" route.
        router.replace(`/admin/blog/${saved.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (props.mode !== 'edit') return;
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/blog/${post.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Delete failed');
      }
      toast.success('Deleted');
      router.replace('/admin/blog');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to list">
            <Link href="/admin/blog">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {props.mode === 'create' ? 'New post' : 'Edit post'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {props.mode === 'create'
                ? 'Drafts are private until you publish.'
                : 'Changes save to the database and revalidate the public blog.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {props.mode === 'edit' && (
            <Button
              variant="outline"
              className="rounded-full text-destructive"
              onClick={() => void remove()}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              Delete
            </Button>
          )}
          <Button className="rounded-full" onClick={() => void save()} disabled={saving}>
            {saving ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            Save
          </Button>
        </div>
      </header>

      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={post.title}
                onChange={(ev) =>
                  setPost((p) => ({
                    ...p,
                    title: ev.target.value,
                    slug: p.slug || slugify(ev.target.value),
                  }))
                }
                placeholder="Post title"
              />
            </div>
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input
                value={post.slug}
                onChange={(ev) => patch({ slug: ev.target.value })}
                placeholder="my-post-slug"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Excerpt</Label>
              <Input
                value={post.excerpt}
                onChange={(ev) => patch({ excerpt: ev.target.value })}
                placeholder="One-sentence summary"
              />
            </div>
            <div className="grid gap-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={post.tags.join(', ')}
                onChange={(ev) =>
                  patch({
                    tags: ev.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="python, fastapi"
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <div className="flex h-9 items-center gap-3 rounded-md border border-input bg-background px-3">
                <Switch
                  checked={post.status === 'published'}
                  onCheckedChange={(v) =>
                    patch({ status: v ? 'published' : 'draft' })
                  }
                />
                <span className="text-sm">
                  {post.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Body (Markdown)</Label>
            <RichText
              value={post.body}
              onChange={(v) => patch({ body: v })}
              rows={14}
            />
          </div>

          <ImageUploader
            label="Cover image"
            hint="Optional. 16:9 looks best (e.g. 1600x900)."
            value={post.coverUrl ?? ''}
            onChange={(url) => patch({ coverUrl: url })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
