/**
 * Static fallback content for the site — mirrors the data seeded into the
 * FastAPI backend by `backend/app/seed.py` from `backend/seed-data/*.json`.
 *
 * Used by `lib/content/read.ts` when:
 *   1. Next.js is in the build phase (`next build`), where the FastAPI host
 *      isn't reachable and no network calls are allowed.
 *   2. A runtime request hits a FastAPI error (offline, transient, missing
 *      docs) so the public site never renders blank sections.
 *
 * Keeping a single source of truth here means the seed script and the
 * frontend fallbacks can never drift — both pull from these constants.
 */
import type {
  BlogPost,
  ExperienceEntry,
  HeroContent,
  Project,
  SettingsContent,
} from '@/lib/content/schema';

export const fallbackHero: HeroContent = {
  greeting: "Hi, I'm Naeem",
  headline: ['hi,', 'naeem', 'here.'],
  tagline:
    "Full-stack developer in Dhaka. I build production systems — judges, e-commerce backends, distributed queues — and write about what I learn along the way.",
  primaryCta: { label: 'Say hi!', href: '/contact' },
  secondaryCta: { label: 'Read the Blog', href: '/blog' },
  socials: [
    {
      platform: 'github',
      url: 'https://github.com/naeemsadik',
      label: 'GitHub',
    },
    {
      platform: 'leetcode',
      url: 'https://leetcode.com/naeemsadik',
      label: 'LeetCode',
    },
    {
      platform: 'email',
      url: 'mailto:naeemabdullahsadik@gmail.com',
      label: 'Email',
    },
  ],
  // Brand-mark dot grid is sourced from a JSON file (no PNG/photo at
  // runtime). The `portraitUrl` field is kept in the schema for backward
  // compatibility with existing rows but is no longer rendered.
  portraitUrl: '/portrait/PictureonNAS.particles.json',
};

export const fallbackSettings: SettingsContent = {
  siteTitle: 'Naeem Abdullah Sadik — Portfolio',
  description:
    'Portfolio of Naeem Abdullah Sadik — full-stack developer with a strong track record of shipping production-grade web applications. Currently Lead Developer at JudgeX.',
  ogImage: '/og.svg',
  accentColor: '#7cf5b3',
  navOrder: ['home', 'experience', 'projects', 'blog', 'contact'],
  cvUrl: '',
  email: 'naeemabdullahsadik@gmail.com',
  phone: '+880 1707 403973',
  location: 'Dhaka, Bangladesh',
  github: 'https://github.com/naeemsadik',
  linkedin: '',
  leetcode: 'https://leetcode.com/naeemsadik',
  languages: [
    { name: 'English', level: 'Fluent' },
    { name: 'Bangla', level: 'Native' },
    { name: 'Hindi', level: 'Conversational' },
  ],
  skills: {
    languages: [
      'JavaScript',
      'TypeScript',
      'PHP',
      'C',
      'C++',
      'Java',
      'SQL',
    ],
    frameworks: [],
    frontend: ['React.js', 'Next.js'],
    backend: [
      'FastAPI',
      'Laravel',
      'CodeIgniter',
      'REST APIs',
      'JWT Auth',
      'PostgreSQL',
      'MySQL',
      'Redis',
    ],
    infrastructure: ['Docker', 'Kubernetes', 'K3s', 'Git', 'GitHub'],
    tools: ['Figma', 'Adobe Illustrator', 'VS Code', 'Team Leadership'],
  },
};

export const fallbackExperience: ExperienceEntry[] = [
  {
    id: 'judgex-lead-dev',
    kind: 'work',
    title: 'Lead Developer',
    organization: 'JudgeX — Competitive Programming Judge Platform',
    location: 'Dhaka, Bangladesh',
    startDate: '2024-01-01',
    endDate: null,
    description:
      'Designed and built a production online judge platform capable of securely compiling and executing untrusted user code in isolated Docker containers, enforcing resource limits and sandboxing. Architected a distributed submission queue with Redis and a FastAPI backend, ensuring reliable job processing and low-latency verdict delivery under concurrent load. Deployed the full platform on a K3s (lightweight Kubernetes) cluster, gaining hands-on experience with container orchestration, scaling, and infrastructure reliability. Integrated a Next.js frontend with a PostgreSQL database for user management, problem sets, leaderboards, and contest tracking.',
    tags: ['Full-Stack', 'Distributed Systems', 'DevOps'],
    meta: 'Live at judgex.uiucomputerclub.com',
    order: 0,
  },
  {
    id: 'boikothok-backend-lead',
    kind: 'work',
    title: 'Backend Lead',
    organization: 'Boikothok — Book E-Commerce Platform',
    location: 'Dhaka, Bangladesh',
    startDate: '2023-06-01',
    endDate: null,
    description:
      'Architected the full backend: database schema, JWT-based authentication, and RESTful APIs powering both the web platform and mobile app. Designed APIs for product management, user operations, and order processing — with a focus on security, reliability, and scalability. Collaborated cross-functionally with frontend and mobile teams, taking end-to-end ownership of backend delivery.',
    tags: ['Backend', 'E-Commerce', 'API Design'],
    meta: 'Live at boikothok.com',
    order: 1,
  },
  {
    id: 'robohub-fullstack',
    kind: 'work',
    title: 'Full-Stack Developer',
    organization: 'Robohub BD',
    location: 'Dhaka, Bangladesh',
    startDate: '2022-09-01',
    endDate: '2023-08-31',
    description:
      'Built and shipped an e-commerce platform with secure payment gateway integration, serving 2,000+ active customers in the robotics and electronics market. Took full ownership of the deployment pipeline and production release from development to launch.',
    tags: ['E-Commerce', 'Full-Stack', 'Payments'],
    meta: 'Live at robohub.com.bd',
    order: 2,
  },
  {
    id: 'uiu-computer-club-lead',
    kind: 'work',
    title: 'Lead Developer',
    organization: 'UIU Computer Club Website',
    location: 'Dhaka, Bangladesh',
    startDate: '2023-01-01',
    endDate: '2024-06-30',
    description:
      'Led the full redesign and implementation of the official club portal, introducing component-driven architecture and improving maintainability.',
    tags: ['Frontend', 'CMS'],
    meta: 'computerclub.uiu.ac.bd',
    order: 3,
  },
  {
    id: 'uiu-cse-fest-frontend',
    kind: 'work',
    title: 'Frontend Developer',
    organization: 'UIU CSE Fest 2025 Site',
    location: 'Dhaka, Bangladesh',
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    description:
      'Collaborated in a 4-member team to deliver the event marketing site in under two weeks; integrated schedule, registration, and sponsor dashboards.',
    tags: ['Frontend', 'Marketing'],
    meta: 'csefest.uiu.ac.bd',
    order: 4,
  },
  {
    id: 'uiu-finance-forum-frontend',
    kind: 'work',
    title: 'Frontend Lead',
    organization: 'UIU Finance Forum Website',
    location: 'Dhaka, Bangladesh',
    startDate: '2022-09-01',
    endDate: '2023-06-30',
    description:
      'Spearheaded a UI revamp that improved session duration by 30% and streamlined the new-member onboarding workflow.',
    tags: ['Frontend', 'UI/UX'],
    meta: '',
    order: 5,
  },
  {
    id: 'c-structure-author',
    kind: 'work',
    title: 'Author',
    organization: 'C-Structure Open-Source Library',
    location: 'Open Source',
    startDate: '2023-06-01',
    endDate: null,
    description:
      'Built a C standard library extension providing STL-like generic dynamic arrays, linked lists, and hash maps — demonstrating deep understanding of CS fundamentals and memory management.',
    tags: ['Open Source', 'Systems'],
    meta: '',
    order: 6,
  },
  {
    id: 'uiu-cc-head-dev-wing',
    kind: 'leadership',
    title: 'Head of Development Wing',
    organization: 'UIU Computer Club',
    location: 'Dhaka, Bangladesh',
    startDate: '2022-01-01',
    endDate: null,
    description:
      'Leading the development wing of the university computing society — workshops, hackathons, project mentoring, and peer learning.',
    tags: ['Leadership', 'Community'],
    meta: '',
    order: 7,
  },
  {
    id: 'uiu-finance-forum-head-events',
    kind: 'leadership',
    title: 'Head of Events',
    organization: 'UIU Finance Forum',
    location: 'Dhaka, Bangladesh',
    startDate: '2022-01-01',
    endDate: null,
    description:
      'Organizing events, workshops, and speaker sessions for the UIU Finance Forum.',
    tags: ['Leadership', 'Events'],
    meta: '',
    order: 8,
  },
  {
    id: 'bsc-cse-uiu',
    kind: 'education',
    title: 'BSc in Computer Science & Engineering',
    organization: 'United International University',
    location: 'Dhaka, Bangladesh',
    startDate: '2022-06-01',
    endDate: null,
    description:
      'Studying core CS fundamentals — data structures, algorithms, databases, software engineering, and systems — while shipping real-world projects on the side.',
    tags: ['Computer Science', 'Algorithms', 'Systems'],
    meta: 'CGPA: 3.4 / 4.0',
    order: 9,
  },
  {
    id: 'innonation-hackathon',
    kind: 'achievement',
    title: '2nd Runner-Up — Innonation, 24H National Hackathon',
    organization: 'Innonation',
    location: 'Bangladesh',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    description: 'Demonstrates problem-solving under pressure and a startup mindset.',
    tags: ['Hackathon', 'Achievement'],
    meta: '',
    order: 10,
  },
  {
    id: 'uiu-cse-project-show',
    kind: 'achievement',
    title: '1st Runner-Up — UIU CSE Project Show, Fall 2025',
    organization: 'UIU CSE',
    location: 'Bangladesh',
    startDate: '2025-09-01',
    endDate: '2025-12-31',
    description: 'Project showcase runner-up among CSE peers.',
    tags: ['Showcase', 'Achievement'],
    meta: '',
    order: 11,
  },
];

export const fallbackProjects: Project[] = [
  {
    id: 'judgex',
    title: 'JudgeX',
    summary:
      'Production online judge platform — secure sandboxed code execution on Kubernetes.',
    description:
      'JudgeX is a production online judge capable of compiling and executing untrusted user code in isolated Docker containers with strict resource limits. A distributed Redis-backed submission queue feeds a FastAPI backend that delivers low-latency verdicts under concurrent load, and the whole platform runs on a K3s (lightweight Kubernetes) cluster. The Next.js frontend handles user management, problem sets, leaderboards, and contest tracking against PostgreSQL.',
    tech: ['FastAPI', 'Next.js', 'PostgreSQL', 'Redis', 'Docker', 'K3s'],
    liveUrl: 'https://judgex.uiucomputerclub.com',
    repoUrl: '',
    coverUrl: '',
    featured: true,
    order: 0,
  },
  {
    id: 'boikothok',
    title: 'Boikothok',
    summary:
      'Book e-commerce platform — Laravel backend powering web + mobile clients.',
    description:
      'Boikothok is a book e-commerce platform serving both a web frontend and a mobile app from a single Laravel API. I designed the full backend: database schema, JWT-based authentication, and RESTful APIs for product management, user operations, and order processing — focused on security, reliability, and scalability, with cross-team ownership of backend delivery end-to-end.',
    tech: ['PHP', 'Laravel', 'MySQL', 'JWT', 'REST APIs'],
    liveUrl: 'https://boikothok.com',
    repoUrl: '',
    coverUrl: '',
    featured: true,
    order: 1,
  },
  {
    id: 'robohub-bd',
    title: 'Robohub BD',
    summary:
      'Robotics & electronics e-commerce platform with payment-gateway integration.',
    description:
      'Robohub BD is an e-commerce platform for robotics and electronics, serving 2,000+ active customers with secure payment-gateway integration. I owned the deployment pipeline and the production release end-to-end, taking the platform from development to launch.',
    tech: ['Laravel', 'Bootstrap', 'Payment Gateway'],
    liveUrl: 'https://robohub.com.bd',
    repoUrl: '',
    coverUrl: '',
    featured: true,
    order: 2,
  },
  {
    id: 'c-structure',
    title: 'C-Structure',
    summary:
      'Open-source C standard-library extension: dynamic arrays, linked lists, hash maps.',
    description:
      'C-Structure is an open-source C standard library extension providing STL-like generic dynamic arrays, linked lists, and hash maps. Demonstrates deep understanding of CS fundamentals and manual memory management.',
    tech: ['C', 'Data Structures', 'Open Source'],
    liveUrl: '',
    repoUrl: '',
    coverUrl: '',
    featured: false,
    order: 3,
  },
  {
    id: 'uiu-computer-club',
    title: 'UIU Computer Club Portal',
    summary:
      'Official UIU Computer Club portal — component-driven redesign.',
    description:
      'Led the full redesign and implementation of the official UIU Computer Club portal, introducing a component-driven architecture and improving maintainability over the previous monolithic build.',
    tech: ['React.js', 'Tailwind CSS', 'Laravel'],
    liveUrl: 'https://computerclub.uiu.ac.bd',
    repoUrl: '',
    coverUrl: '',
    featured: false,
    order: 4,
  },
];

export const fallbackBlogPosts: BlogPost[] = [
  {
    id: 1,
    slug: 'hello-world',
    title: 'Hello, world',
    excerpt:
      "Kicking off the blog with a quick intro — what I'll be writing about and why.",
    body: "## Welcome\n\nThis is the first post on the new portfolio. I'll be writing about **shipping production systems**, the lessons behind projects like JudgeX and Boikothok, and what I'm learning as a CS student at UIU.\n\nA few things I plan to cover:\n\n- Architecting sandboxed code-execution pipelines\n- Distributed queues with Redis + FastAPI under load\n- Kubernetes (K3s) on a budget — what actually breaks\n- Hackathon post-mortems\n- Backend design patterns that scale beyond a tutorial\n\nIf any of that sounds useful, stick around.\n\n— Naeem",
    coverUrl: '',
    tags: ['meta', 'career'],
    status: 'published',
    readingTimeMin: 1,
    order: 0,
    publishedAt: '2026-06-20T00:00:00Z',
    createdAt: '2026-06-20T00:00:00Z',
    updatedAt: '2026-06-20T00:00:00Z',
  },
  {
    id: 2,
    slug: 'judgex-architecture',
    title: 'How JudgeX Sandboxes Untrusted Code',
    excerpt:
      'A walkthrough of how JudgeX compiles and runs untrusted submissions in isolated Docker containers.',
    body: "## The problem\n\nA competitive-programming judge has a simple job: run untrusted code, return a verdict. The catch is that **the code is hostile** — contestants will try to escape the sandbox, exfiltrate data, fork-bomb the box, etc.\n\n## The pipeline\n\n1. Submission arrives via the API → queued in Redis.\n2. A worker pulls a job and spawns a Docker container with:\n   - `--network=none`\n   - `--memory=256m --memory-swap=256m`\n   - `--pids-limit=64`\n   - `--cpus=1.0`\n   - A read-only root filesystem\n   - A tmpfs for I/O\n3. The compiled binary is copied in and run with a hard wall-clock timeout.\n4. The verdict (AC / WA / TLE / RE / CE) is written back to Redis and the container is destroyed.\n\n## Why K3s\n\nWe run the worker pool on a K3s cluster — it gives us pod-level isolation that's already battle-tested, plus easy horizontal scaling. A single-node K3s box is enough for a university-scale judge.\n\n## What's next\n\nI'd love to swap the verdict fan-out for NATS, and add per-language resource quotas. More on that soon.",
    coverUrl: '',
    tags: ['judgex', 'docker', 'kubernetes', 'security'],
    status: 'published',
    readingTimeMin: 4,
    order: 1,
    publishedAt: '2026-06-15T00:00:00Z',
    createdAt: '2026-06-15T00:00:00Z',
    updatedAt: '2026-06-15T00:00:00Z',
  },
];