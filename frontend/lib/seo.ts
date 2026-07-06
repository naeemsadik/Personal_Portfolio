import type { Metadata } from 'next';
import type { SettingsContent } from '@/lib/content/schema';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
  'https://naeemsadik.dev';

export function siteMetadata(settings: SettingsContent): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: settings.siteTitle,
      template: `%s — ${settings.siteTitle.split(' — ')[0]}`,
    },
    description: settings.description,
    openGraph: {
      title: settings.siteTitle,
      description: settings.description,
      url: SITE_URL,
      siteName: settings.siteTitle,
      images: settings.ogImage ? [{ url: settings.ogImage }] : undefined,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.siteTitle,
      description: settings.description,
      images: settings.ogImage ? [settings.ogImage] : undefined,
    },
    alternates: { canonical: SITE_URL },
  };
}

export function personJsonLd(settings: SettingsContent) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Naeem Abdullah Sadik',
    jobTitle: 'Aspiring Software Engineer',
    description: settings.description,
    email: settings.email,
    telephone: settings.phone,
    address: settings.location
      ? { '@type': 'PostalAddress', addressLocality: settings.location, addressCountry: 'BD' }
      : undefined,
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: 'North South University',
    },
    knowsAbout: settings.skills?.languages?.concat(settings.skills?.frameworks ?? []),
    sameAs: [settings.github, settings.linkedin].filter(Boolean),
    url: SITE_URL,
  };
}

export function creativeWorkJsonLd(project: {
  title: string;
  summary: string;
  liveUrl?: string | null;
  repoUrl?: string | null;
  tech: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.summary,
    keywords: project.tech,
    url: project.liveUrl ?? project.repoUrl ?? undefined,
    codeRepository: project.repoUrl ?? undefined,
  };
}
