'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setPending(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: String(data.email),
          password: String(data.password),
        }),
      });
      if (!res.ok) {
        toast.error('Invalid email or password');
        return;
      }
      toast.success('Welcome back');
      router.replace(params.get('callbackUrl') ?? '/admin');
      router.refresh();
    } catch {
      toast.error('Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-bg mask-fade-b opacity-40" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/30">
            <Lock />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold">
            Admin login
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage your portfolio.
          </p>
        </div>
        <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" disabled={pending} className="rounded-full">
                {pending ? (
                  <>
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
