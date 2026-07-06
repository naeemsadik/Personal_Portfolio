'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileDown, Github, Linkedin, Mail, Menu, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';


// Map a `navOrder` slug from Settings.navOrder to a (path, label) pair.
// The slug is the route segment; the label is the visible text.
const NAV_LABELS: Record<string, { href: string; label: string }> = {
  home: { href: '/', label: 'Home' },
  experience: { href: '/experience', label: 'Experience' },
  projects: { href: '/projects', label: 'Projects' },
  blog: { href: '/blog', label: 'Blog' },
  contact: { href: '/contact', label: 'Contact' },
};

const FALLBACK_LINKS = [
  NAV_LABELS.home,
  NAV_LABELS.experience,
  NAV_LABELS.projects,
  NAV_LABELS.blog,
  NAV_LABELS.contact,
];

export function StickyNav() {
  const [scrolled, setScrolled] = useState(false);
  const [links, setLinks] = useState(FALLBACK_LINKS);
  const [cvUrl, setCvUrl] = useState<string>('');
  const [socials, setSocials] = useState<{ href: string; icon: 'github' | 'linkedin' | 'leetcode' | 'email'; title: string }[]>([
    { href: 'mailto:naeemabdullahsadik@gmail.com', icon: 'email', title: 'Email' },
    { href: 'https://github.com/naeemsadik', icon: 'github', title: 'GitHub' },
    { href: 'https://leetcode.com/naeemsadik', icon: 'leetcode', title: 'LeetCode' },
  ]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/content/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((settings) => {
        if (cancelled || !settings) return;
        if (settings?.navOrder?.length) {
          const mapped = settings.navOrder
            .map((slug: string) => NAV_LABELS[slug])
            .filter((l: { href: string; label: string } | undefined): l is { href: string; label: string } => Boolean(l));
          if (mapped.length) setLinks(mapped);
        }
        // Refresh socials from settings if available.
        if (settings) {
          const items: { href: string; icon: 'github' | 'linkedin' | 'leetcode' | 'email'; title: string }[] = [];
          if (settings.email) items.push({ href: `mailto:${settings.email}`, icon: 'email', title: 'Email' });
          if (settings.github) items.push({ href: settings.github, icon: 'github', title: 'GitHub' });
          if (settings.linkedin) items.push({ href: settings.linkedin, icon: 'linkedin', title: 'LinkedIn' });
          if (settings.leetcode) items.push({ href: settings.leetcode, icon: 'leetcode', title: 'LeetCode' });
          if (items.length) setSocials(items);
          if (settings.cvUrl) setCvUrl(settings.cvUrl);
        }
      })
      .catch(() => {
        // ignore — keep fallback
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    email: Mail,
    github: Github,
    linkedin: Linkedin,
    leetcode: LeetCodeIcon,
  };

  return (
    <header
      className={
        'fixed inset-x-0 top-0 z-50 transition-all duration-300 ' +
        (scrolled
          ? 'border-b border-border/60 bg-background/70 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent')
      }
    >
      <nav className="container flex h-16 items-center justify-between">
        {/* Wordmark — plain text, display font */}
        <Link
          href="/"
          className="font-display text-base font-semibold tracking-tight text-foreground/90 transition hover:text-foreground"
        >
          Naeem Abdullah Sadik
        </Link>

        {/* Center / right — nav links + social icons */}
        <div className="hidden items-center gap-8 md:flex">
          <ul className="flex items-center gap-6">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 border-l border-border/60 pl-6">
            {socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.icon] ?? Mail;
              return (
                <a
                  key={s.href}
                  href={s.href}
                  target={s.href.startsWith('http') ? '_blank' : undefined}
                  rel={s.href.startsWith('http') ? 'noreferrer' : undefined}
                  title={s.title}
                  aria-label={s.title}
                  className="text-muted-foreground transition hover:text-foreground"
                >
                  <Icon className="size-4" />
                </a>
              );
            })}
            {cvUrl ? (
              <a
                href={cvUrl}
                target="_blank"
                rel="noreferrer"
                download
                title="Download CV"
                aria-label="Download CV"
                className="text-muted-foreground transition hover:text-foreground"
              >
                <FileDown className="size-4" />
              </a>
            ) : null}
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="grid size-9 place-items-center rounded-md border border-border bg-card/40 text-foreground"
                aria-label="Open menu"
              >
                <Menu />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full max-w-xs border-l-border bg-background/95 backdrop-blur-xl"
            >
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Primary navigation
              </SheetDescription>
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-semibold">
                  Naeem Abdullah Sadik
                </span>
                <SheetClose asChild>
                  <button
                    className="grid size-9 place-items-center rounded-md border border-border text-foreground"
                    aria-label="Close menu"
                  >
                    <X />
                  </button>
                </SheetClose>
              </div>
              <ul className="mt-10 flex flex-col gap-6">
                <AnimatePresence>
                  {links.map((l, i) => (
                    <motion.li
                      key={l.href}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i, duration: 0.3 }}
                    >
                      <SheetClose asChild>
                        <Link
                          href={l.href}
                          className="block text-2xl font-display font-medium text-foreground/90 transition hover:text-accent"
                        >
                          {l.label}
                        </Link>
                      </SheetClose>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <div className="mt-12 flex items-center gap-4">
                {socials.map((s) => {
                  const Icon = SOCIAL_ICONS[s.icon] ?? Mail;
                  return (
                    <a
                      key={s.href}
                      href={s.href}
                      target={s.href.startsWith('http') ? '_blank' : undefined}
                      rel={s.href.startsWith('http') ? 'noreferrer' : undefined}
                      title={s.title}
                      aria-label={s.title}
                      className="grid size-9 place-items-center rounded-md border border-border bg-card/40 text-muted-foreground transition hover:text-foreground"
                    >
                      <Icon className="size-4" />
                    </a>
                  );
                })}
                {cvUrl ? (
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    title="Download CV"
                    aria-label="Download CV"
                    className="grid size-9 place-items-center rounded-md border border-border bg-card/40 text-muted-foreground transition hover:text-foreground"
                  >
                    <FileDown className="size-4" />
                  </a>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

/**
 * Inline LeetCode "L" monogram — lucide-react has no LeetCode icon, so we
 * render a simple SVG that reads as LeetCode at icon sizes.
 */
function LeetCodeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Stylised "L" + a tail that hints at the bracket */}
      <path d="M16 4l-8 8 8 8" />
      <path d="M8 20h10" />
    </svg>
  );
}
