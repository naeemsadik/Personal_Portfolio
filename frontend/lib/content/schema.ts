import { z } from 'zod';

/** A URL field that accepts http(s), mailto:, or empty string. */
const urlOrMailtoOrEmpty = z
  .string()
  .refine(
    (v) =>
      v === '' ||
      v.startsWith('mailto:') ||
      /^https?:\/\//.test(v),
    { message: 'must be a URL, mailto: link, or empty string' },
  );

// ---------- Hero ----------
export const heroSchema = z.object({
  greeting: z.string().min(1),
  headline: z.array(z.string()).min(1),
  tagline: z.string().min(1),
  primaryCta: z.object({ label: z.string(), href: z.string() }),
  secondaryCta: z.object({ label: z.string(), href: z.string() }),
  socials: z.array(
    z.object({
      platform: z.string(),
      url: urlOrMailtoOrEmpty,
      label: z.string().optional(),
    }),
  ),
  portraitUrl: z.string(),
});
export type HeroContent = z.infer<typeof heroSchema>;

// ---------- Settings ----------
export const settingsSchema = z.object({
  siteTitle: z.string(),
  description: z.string(),
  ogImage: z.string(),
  accentColor: z.string(),
  navOrder: z.array(z.string()),
  cvUrl: z.string().default(''),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  github: urlOrMailtoOrEmpty.optional(),
  linkedin: urlOrMailtoOrEmpty.optional(),
  leetcode: urlOrMailtoOrEmpty.optional(),
  languages: z
    .array(z.object({ name: z.string(), level: z.string() }))
    .default([]),
  skills: z
    .object({
      languages: z.array(z.string()).default([]),
      frameworks: z.array(z.string()).default([]),
      tools: z.array(z.string()).default([]),
      // Newer groups (optional — older data may not have them)
      frontend: z.array(z.string()).default([]),
      backend: z.array(z.string()).default([]),
      infrastructure: z.array(z.string()).default([]),
    })
    .default({ languages: [], frameworks: [], tools: [] }),
});
export type SettingsContent = z.infer<typeof settingsSchema>;

// ---------- Experience (work, education, leadership, volunteer, achievement) ----------
export const experienceKindSchema = z.enum([
  'work',
  'education',
  'leadership',
  'volunteer',
  'achievement',
]);
export const experienceSchema = z.object({
  id: z.string(),
  kind: experienceKindSchema,
  title: z.string(),
  organization: z.string(),
  location: z.string().optional().or(z.literal('')),
  startDate: z.string(),
  endDate: z.string().nullable(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  meta: z.string().optional().or(z.literal('')),
  order: z.number().int().default(0),
});
export type ExperienceEntry = z.infer<typeof experienceSchema>;

// ---------- Projects ----------
export const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  tech: z.array(z.string()).default([]),
  liveUrl: urlOrMailtoOrEmpty.optional().nullable(),
  repoUrl: urlOrMailtoOrEmpty.optional().nullable(),
  coverUrl: z.string(),
  featured: z.boolean().default(false),
  order: z.number().int().default(0),
});
export type Project = z.infer<typeof projectSchema>;

// ---------- Contact message ----------
export const contactMessageSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
});
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

export const storedMessageSchema = contactMessageSchema.extend({
  id: z.string(),
  receivedAt: z.string(),
  read: z.boolean().default(false),
});
export type StoredMessage = z.infer<typeof storedMessageSchema>;

// ---------- Analytics event ----------
export const analyticsEventSchema = z.object({
  type: z.enum(['pageview', 'contact_submit']),
  path: z.string(),
  ts: z.number().int(),
  // Optional viewer metadata. Server truncates / hashes IP, so we only
  // need to validate string length on the client side.
  user_agent: z.string().max(255).optional(),
  referrer: z.string().max(255).optional(),
  session_id: z.string().max(64).optional(),
});
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

// ---------- Blog post ----------
export const blogStatusSchema = z.enum(['draft', 'published']);
export const blogPostSchema = z.object({
  id: z.number().int(),
  slug: z.string().min(1).max(160),
  title: z.string().min(1).max(255),
  excerpt: z.string().min(1).max(500),
  body: z.string().min(1),
  coverUrl: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  status: blogStatusSchema,
  readingTimeMin: z.number().int().default(1),
  order: z.number().int().default(0),
  publishedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BlogPost = z.infer<typeof blogPostSchema>;