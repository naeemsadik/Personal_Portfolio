'use client';

import { useState } from 'react';
import { FileDown, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  /** When set, a "Download CV" button is rendered. */
  cvUrl?: string;
};

export function ContactSection({ cvUrl }: Props) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setPending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to send');
      }
      setSent(true);
      form.reset();
      toast.success("Message sent — thanks! I'll get back to you soon.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="contact" className="py-24 md:py-32">
      <div className="container">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-xs uppercase tracking-[0.3em] text-accent/80">
              Contact
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Let's build something.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Have an idea, an opportunity, or just want to say hi? Drop a
              message and I'll get back to you.
            </p>
            <div className="mt-8 flex flex-col gap-3 text-sm text-muted-foreground">
              <div>
                Or email me directly at{' '}
                <a
                  className="text-accent underline-offset-4 hover:underline"
                  href="mailto:naeemabdullahsadik@gmail.com"
                >
                  naeemabdullahsadik@gmail.com
                </a>
                .
              </div>
              {cvUrl ? (
                <Button
                  asChild
                  variant="outline"
                  className="self-start rounded-full"
                >
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                  >
                    <FileDown data-icon="inline-start" /> Download CV
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-8">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                  <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" required maxLength={120} placeholder="Your name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      maxLength={5000}
                      placeholder="Tell me about your project, idea, or question…"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2">
                    <p className="text-xs text-muted-foreground">
                      I usually reply within a day or two.
                    </p>
                    <Button type="submit" disabled={pending || sent} className="rounded-full">
                      {sent ? (
                        <>
                          <CheckCircle2 data-icon="inline-start" /> Sent
                        </>
                      ) : (
                        <>
                          <Send data-icon="inline-start" />
                          {pending ? 'Sending…' : 'Send message'}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
