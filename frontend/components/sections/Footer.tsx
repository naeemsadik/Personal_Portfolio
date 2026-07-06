import Link from 'next/link';
import { Github, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { getSettings } from '@/lib/content/read';

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/40">
      <div className="container flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="font-display text-xl font-semibold tracking-tight">
            Naeem Abdullah Sadik<span className="text-accent">.</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {s.description}
          </p>
          <ul className="mt-5 flex flex-col gap-2 text-sm text-muted-foreground">
            {s.email && (
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-accent/80" />
                <a className="hover:text-foreground" href={`mailto:${s.email}`}>
                  {s.email}
                </a>
              </li>
            )}
            {s.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-accent/80" />
                <a className="hover:text-foreground" href={`tel:${s.phone.replace(/\s/g, '')}`}>
                  {s.phone}
                </a>
              </li>
            )}
            {s.location && (
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-accent/80" />
                <span>{s.location}</span>
              </li>
            )}
          </ul>
        </div>

        <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground/80">
              Navigate
            </div>
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <Link href="/experience" className="text-muted-foreground hover:text-foreground">
              Experience
            </Link>
            <Link href="/projects" className="text-muted-foreground hover:text-foreground">
              Projects
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground">
              Contact
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground/80">
              Skills
            </div>
            {s.skills?.languages?.slice(0, 4).map((k) => (
              <span key={k} className="text-muted-foreground">{k}</span>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground/80">
              Elsewhere
            </div>
            {s.github && (
              <a className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground" href={s.github}>
                <Github /> GitHub
              </a>
            )}
            {s.linkedin && (
              <a className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground" href={s.linkedin}>
                <Linkedin /> LinkedIn
              </a>
            )}
            {s.email && (
              <a className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground" href={`mailto:${s.email}`}>
                <Mail /> Email
              </a>
            )}
          </div>
        </nav>
      </div>
      <div className="border-t border-border/40 py-6">
        <div className="container flex flex-col items-start justify-between gap-2 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>
            © {new Date().getFullYear()} Naeem Abdullah Sadik. All rights reserved.
          </span>
          <span>
            Built with Next.js · Three.js · shadcn/ui · Firebase
          </span>
        </div>
      </div>
    </footer>
  );
}
