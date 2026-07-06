'use client';

import Link from 'next/link';
import { FileDown, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortraitFrame } from '@/components/portrait/PortraitFrame';
import type { HeroContent, SettingsContent } from '@/lib/content/schema';

type Props = {
  hero: HeroContent;
  settings: SettingsContent;
};

export function Hero({ hero, settings }: Props) {
  // Render the headline as one lowercase sentence with a single accent word
  // highlighted. Fallback if the admin data is missing or differently shaped.
  const words =
    hero.headline.length >= 2
      ? hero.headline
      : (['hi,', 'naeem', 'here.'] as string[]);

  const accentIndex = Math.min(1, words.length - 1);

  return (
    <section className="relative overflow-hidden">
      <div className="container relative grid grid-cols-1 items-center gap-12 py-20 md:py-24 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div className="order-2 flex flex-col gap-6 md:gap-7 lg:order-1">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-balance md:text-6xl lg:text-7xl">
            {words.map((word, i) => (
              <span key={`${word}-${i}`}>
                {i > 0 ? ' ' : ''}
                {i === accentIndex ? (
                  <span className="text-accent">{word}</span>
                ) : (
                  word
                )}
              </span>
            ))}
          </h1>

          <p className="max-w-xl text-base text-muted-foreground md:text-lg text-pretty">
            {hero.tagline}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link href="/contact">
                <Mail data-icon="inline-start" /> {hero.primaryCta.label}
              </Link>
            </Button>
            {settings.cvUrl ? (
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <a
                  href={settings.cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                >
                  <FileDown data-icon="inline-start" /> Download CV
                </a>
              </Button>
            ) : null}
            {settings.email ? (
              <span className="text-xs text-muted-foreground/70">
                or write to{' '}
                <a
                  href={`mailto:${settings.email}`}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {settings.email}
                </a>
              </span>
            ) : null}
          </div>
        </div>

        <div className="order-1 mx-auto w-full max-w-[420px] md:max-w-[480px] lg:order-2 lg:max-w-[560px]">
          <PortraitFrame alt={hero.greeting} />
        </div>
      </div>
    </section>
  );
}
