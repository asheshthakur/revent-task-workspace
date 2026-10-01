import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Users, 
  MessageSquare, 
  DollarSign, 
  Bell, 
  Monitor, 
  Download, 
  ShieldCheck, 
  BarChart3, 
  Zap, 
  CheckSquare, 
  Clock, 
  Link2,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { LandingNavbar } from '@/components/LandingNavbar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'VEYA | Team Workspace for Tasks, Collaboration & Work Management',
  description: 'VEYA is a unified team workspace designed for distributed teams to assign tasks, collaborate in real time, monitor project status, and track operational finance.',
  alternates: {
    canonical: 'https://app.lucidmediax.in/',
  },
  openGraph: {
    title: 'VEYA | Team Workspace for Tasks, Collaboration & Work Management',
    description: 'Assign tasks, collaborate with teammates, monitor progress, and manage operational finance in one unified team workspace.',
    url: 'https://app.lucidmediax.in/',
    siteName: 'VEYA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VEYA | Team Workspace for Tasks, Collaboration & Work Management',
    description: 'One workspace for the work that matters. Organize tasks, collaborate, and track visibility across your team.',
  },
};

export default async function HomePage() {
  // If user is already authenticated in this browser session, seamlessly route to dashboard
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (user) {
    redirect('/dashboard');
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://app.lucidmediax.in/#organization',
        name: 'VEYA',
        url: 'https://app.lucidmediax.in',
        logo: 'https://app.lucidmediax.in/favicon.ico',
        description: 'Unified team workspace platform for task management, team chat, live presence, and operational finance.',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://app.lucidmediax.in/#website',
        url: 'https://app.lucidmediax.in',
        name: 'VEYA',
        publisher: { '@id': 'https://app.lucidmediax.in/#organization' },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'VEYA Work Management',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, macOS Monterey 12.0+, Windows 11 x64',
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://app.lucidmediax.in/#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is VEYA?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'VEYA is a unified team workspace designed to organize tasks, real-time discussions, teammate presence, work links, and operational finance in a single fast platform without scattered tools.',
            },
          },
          {
            '@type': 'Question',
            name: 'Who is VEYA for?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'VEYA is built for founders, team leads, employees, and growing agencies who need direct task accountability, clear project deadlines, and live operational visibility across their team.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does VEYA help teams manage tasks?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Every task in VEYA has a single accountable assignee, structured lifecycle stages (Not Started, Started, Half-way, Completed), direct external work links (Google Drive, Docs, Figma), and dedicated task discussion threads.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can teams collaborate and chat in real-time?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. VEYA includes built-in one-on-one direct messages and departmental group channels with unread message badges and live status presence (Online, Away, DND, Holiday).',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I use VEYA on macOS and Windows desktop?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. VEYA provides dedicated native desktop applications for macOS (Apple Silicon M1/M2/M3/M4 & Intel) and Windows 11 x64 featuring OS-native notifications and system dock/taskbar badges.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do I create a VEYA workspace?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Click Sign Up to register your account, name your workspace, choose your URL slug, and instantly invite teammates with shareable role-based invite links.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Responsive Sticky Header */}
      <LandingNavbar />

      <main className="flex-1">
        {/* ========================================== */}
        {/* 1. HERO SECTION                            */}
        {/* ========================================== */}
        <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 overflow-hidden border-b border-slate-900">
          {/* Subtle Glow Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[140px] pointer-events-none rounded-full" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[250px] bg-purple-600/10 blur-[100px] pointer-events-none rounded-full" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 shadow-inner">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-indigo-300 font-semibold">VEYA Workspace</span>
                <span className="text-slate-500">|</span>
                <span>The Unified Team Operating System</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
                Work moves faster with <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">VEYA</span>.
              </h1>

              {/* Value Statement */}
              <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
                VEYA brings tasks, team discussions, workflows, and operational visibility into one workspace. Organize team responsibilities and stay aligned without the chaos of fragmented apps.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5"
                >
                  <span>Create your free account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <span>Log in</span>
                </Link>
              </div>

              {/* Desktop App Link */}
              <div className="pt-3">
                <Link
                  href="/download"
                  className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Available on macOS (Apple Silicon & Intel) & Windows 11</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* HERO PRODUCT MOCKUP */}
            <div className="mt-16 sm:mt-24 max-w-5xl mx-auto">
              <div className="relative rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-slate-800/80 via-slate-900/60 to-slate-950 border border-slate-800 shadow-2xl backdrop-blur-xs">
                {/* Browser Frame Window Header */}
                <div className="rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="h-10 px-4 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="px-6 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>https://app.lucidmediax.in/dashboard</span>
                    </div>
                    <div className="w-12" />
                  </div>

                  {/* Mock Workspace Content using real VEYA layout components */}
                  <div className="flex bg-slate-950 text-slate-200 min-h-[380px] sm:min-h-[460px]">
                    {/* Left Sidebar Mock */}
                    <div className="w-52 sm:w-60 bg-slate-900 border-r border-slate-800/90 p-4 hidden sm:flex flex-col justify-between shrink-0">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                          <span className="font-extrabold text-base tracking-wider text-white">VEYA</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800/60">
                            Workspace
                          </span>
                        </div>

                        {/* Org Switcher mock */}
                        <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">V</div>
                            <span className="font-semibold text-white truncate">Acme Workspace</span>
                          </div>
                        </div>

                        {/* Navigation items */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-indigo-950/70 text-indigo-300 font-semibold border border-indigo-800/50">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Overview</span>
                          </div>
                          <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200">
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>My Tasks</span>
                          </div>
                          <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Internal Chat</span>
                          </div>
                          <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Finance Ledger</span>
                          </div>
                        </div>
                      </div>

                      {/* Presence Members Mock */}
                      <div className="pt-3 border-t border-slate-800/80 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Team Online (3)</div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-slate-300">Sarah Chen</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-slate-300">Alex Miller</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="text-slate-300">David Ross</span>
                        </div>
                      </div>
                    </div>

                    {/* Main Mock Content */}
                    <div className="flex-1 p-5 sm:p-7 space-y-5 bg-slate-900/30">
                      {/* Top Bar Mock */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                        <div>
                          <h2 className="text-base sm:text-lg font-bold text-white">Active Sprint & Tasks</h2>
                          <p className="text-xs text-slate-400">14 tasks in progress across engineering & design</p>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-xs">
                          + New Task
                        </div>
                      </div>

                      {/* Task cards mock */}
                      <div className="space-y-2.5">
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/90 flex items-center justify-between shadow-xs">
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <div>
                              <div className="text-xs font-semibold text-white">Q4 Product Architecture Specification</div>
                              <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                                <span>Assigned to: Alex M.</span>
                                <span>•</span>
                                <span className="text-indigo-400 flex items-center space-x-1">
                                  <Link2 className="w-3 h-3" />
                                  <span>Google Docs Work Link</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-[10px] font-bold uppercase">
                            Started
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/90 flex items-center justify-between shadow-xs">
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <div>
                              <div className="text-xs font-semibold text-white">Client Payment & Retainer Invoicing</div>
                              <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                                <span>Assigned to: Sarah C.</span>
                                <span>•</span>
                                <span className="text-slate-400">Due Tomorrow</span>
                              </div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[10px] font-bold uppercase">
                            Half-way
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/90 flex items-center justify-between shadow-xs">
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                            <div>
                              <div className="text-xs font-semibold text-white">Native Push Notification System Verification</div>
                              <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                                <span>Assigned to: Engineering Team</span>
                              </div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                            Review
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 2. VALUE PROPOSITION STRIP                 */}
        {/* ========================================== */}
        <section className="py-16 bg-slate-950 border-b border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-500 mb-10">
              Everything your team needs to move work forward
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-sm font-bold text-white">Clear Task Ownership</div>
                <div className="text-xs text-slate-400 leading-relaxed">Assign, track, and complete work with context.</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-white">Connected Context</div>
                <div className="text-xs text-slate-400 leading-relaxed">Keep discussion threads right beside tasks.</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-white">Total Visibility</div>
                <div className="text-xs text-slate-400 leading-relaxed">Live teammate presence and audit logs.</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-white">Work Anywhere</div>
                <div className="text-xs text-slate-400 leading-relaxed">Accessible on web and dedicated desktop app.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 3. WHAT IS VEYA?                           */}
        {/* ========================================== */}
        <section id="product" className="py-24 sm:py-32 bg-slate-900/40 border-b border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-3.5 py-1.5 rounded-full border border-indigo-800/60 mb-6">
                The Platform
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
                One workspace for the work that matters.
              </h2>
              <p className="text-base text-slate-400 leading-relaxed">
                Instead of juggling fragmented chat rooms, spread-out spreadsheets, and disconnected task trackers, VEYA unifies your operations. Give every assignment an owner, a deadline, and direct access to work materials.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400 border border-indigo-800/60">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Eliminate Ambiguity</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Every task has a single accountable owner, deadline, and work link so nobody ever asks "who is working on this?"
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400 border border-indigo-800/60">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Contextual Communication</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Have focused discussions directly within the task card or in real-time direct messages with unread status indicators.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400 border border-indigo-800/60">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Multi-Tenant Workspaces</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Organize multiple companies or departments with isolated roles, custom member permissions, and instant workspace switching.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 4. CORE FEATURES                           */}
        {/* ========================================== */}
        <section id="features" className="py-24 sm:py-32 bg-slate-950 border-b border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-3.5 py-1.5 rounded-full border border-indigo-800/60 mb-6">
                Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
                Engineered for speed, clarity, and accountability.
              </h2>
              <p className="text-base text-slate-400 leading-relaxed">
                Built on Cloudflare serverless edge infrastructure with zero cold-start delay and real-time synchronization.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Hierarchical Priority & Lifecycle</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Manage tasks across 4 clear stages: Not Started, Started, Half-way, and Completed. Assign to any teammate regardless of online presence.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                  <Link2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Direct Work & Drive Links</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Attach Google Drive folders, Figma boards, or sheets directly to each task. Assignees can add and update links on the fly.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Real-Time Team Presence</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  See which teammates are Online, Away, in DND, or on Holiday via lightweight edge heartbeats without paid third-party dependencies.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Finance & Invoice Tracker</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Built-in operational finance ledger: client directory, invoice generation, PDC tracking, and payment receipts right in your workspace.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Unified Notification System</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Receive in-app alerts, browser Web Push notifications, and OS-native desktop toasts whenever tasks are assigned or updated.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Audit Trail & Analytics</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every status change, assignment, and configuration edit is recorded in an immutable audit log for complete accountability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 5. HOW IT WORKS                            */}
        {/* ========================================== */}
        <section id="how-it-works" className="py-24 sm:py-32 bg-slate-900/40 border-b border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-3.5 py-1.5 rounded-full border border-indigo-800/60 mb-6">
                Simple Adoption
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
                How VEYA works in 3 steps
              </h2>
              <p className="text-base text-slate-400 leading-relaxed">
                Get up and running in minutes with no complex migration or onboarding required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 relative">
                <div className="text-4xl font-extrabold text-indigo-500/40 mb-4">01</div>
                <h3 className="text-lg font-bold text-white mb-2">Create your workspace</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Sign up and create an organization in seconds. Pick your workspace slug and set up your initial team departments.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 relative">
                <div className="text-4xl font-extrabold text-indigo-500/40 mb-4">02</div>
                <h3 className="text-lg font-bold text-white mb-2">Invite your team</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Generate secure invitation links or add members directly. Assign roles (Owner, Admin, Member) to keep permissions organized.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 relative">
                <div className="text-4xl font-extrabold text-indigo-500/40 mb-4">03</div>
                <h3 className="text-lg font-bold text-white mb-2">Get work moving</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Create tasks, assign owners, set priorities, and track execution live across the desktop client and web browser.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 6. WHO IS VEYA FOR?                        */}
        {/* ========================================== */}
        <section className="py-24 sm:py-32 bg-slate-950 border-b border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-3.5 py-1.5 rounded-full border border-indigo-800/60 mb-6">
                Tailored for Focus
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
                Designed for teams that value execution.
              </h2>
              <p className="text-base text-slate-400 leading-relaxed">
                Whether you run a 5-person agency or a multi-department team, VEYA adapts to your structure.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <h3 className="text-base font-bold text-white">For Founders</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Keep your entire operation aligned and visible without spending hours chasing updates in Slack or email.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <h3 className="text-base font-bold text-white">For Team Leads</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Monitor sprint progress, re-allocate blocked tasks, and see teammate capacity with real-time presence indicators.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <h3 className="text-base font-bold text-white">For Employees</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Start your day with "My Tasks", update your status in one click, and access all work links in one single place.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <h3 className="text-base font-bold text-white">For Growing Agencies</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Connect task execution with client invoice tracking and post-dated cheques to maintain complete financial control.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 7. DESKTOP EXPERIENCE CALLOUT              */}
        {/* ========================================== */}
        <section className="py-24 bg-slate-900/60 border-b border-slate-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-800/40 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
              <div className="space-y-4 max-w-xl text-center md:text-left">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-medium">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Native Desktop Apps</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  VEYA, wherever you work.
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Enjoy the dedicated native client for macOS and Windows 11 with action center notifications, dock badges, and background syncing.
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-200 transition-colors shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>Download VEYA</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 8. FREQUENTLY ASKED QUESTIONS (AEO / FAQ)  */}
        {/* ========================================== */}
        <section id="faq" className="py-24 sm:py-32 bg-slate-950 border-b border-slate-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-3.5 py-1.5 rounded-full border border-indigo-800/60 mb-6">
                Frequently Asked Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                Everything you need to know about VEYA
              </h2>
              <p className="text-base text-slate-400">
                Clear, direct answers on what VEYA is, how it functions, and how to get started.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <h3 className="text-base font-bold text-white">What is VEYA?</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  VEYA is a unified team workspace designed to organize tasks, real-time discussions, teammate presence, work links, and operational finance in a single fast platform without scattered tools.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <h3 className="text-base font-bold text-white">Who is VEYA for?</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  VEYA is built for founders, team leads, employees, and growing agencies who need direct task accountability, clear project deadlines, and live operational visibility across their team.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <h3 className="text-base font-bold text-white">How does VEYA help teams manage tasks?</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Every task in VEYA has a single accountable assignee, structured lifecycle stages (Not Started, Started, Half-way, Completed), direct external work links (Google Drive, Docs, Figma), and dedicated task discussion threads.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <h3 className="text-base font-bold text-white">Can teams collaborate in real-time?</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Yes. VEYA includes built-in one-on-one direct messages and departmental group channels with unread message badges and live status presence (Online, Away, DND, Holiday).
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <h3 className="text-base font-bold text-white">Can I use VEYA on desktop?</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Yes. VEYA provides dedicated native desktop applications for macOS (Apple Silicon M1/M2/M3/M4 & Intel) and Windows 11 x64 featuring OS-native notifications and system dock/taskbar badges.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <h3 className="text-base font-bold text-white">How do I create a VEYA workspace?</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Click Sign Up to register your account, name your workspace, choose your URL slug, and instantly invite teammates with shareable role-based invite links.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 9. FINAL CONVERSION SECTION                */}
        {/* ========================================== */}
        <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Bring your team’s work into one place.
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
              Create your VEYA workspace today and start organizing work with your team with zero clutter.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all"
              >
                <span>Create your free account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-800 transition-all"
              >
                <span>Log in to existing workspace</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================== */}
      {/* 10. FOOTER                                 */}
      {/* ========================================== */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <span className="text-base font-extrabold text-white tracking-wider">VEYA</span>
            <span className="text-slate-600">|</span>
            <p className="text-slate-400">Your team's workspace for getting work done.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="#product" className="hover:text-slate-300 transition-colors">Product</Link>
            <Link href="#features" className="hover:text-slate-300 transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-slate-300 transition-colors">How it Works</Link>
            <Link href="#faq" className="hover:text-slate-300 transition-colors">FAQ</Link>
            <Link href="/download" className="hover:text-slate-300 transition-colors">Download</Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">Log In</Link>
            <Link href="/signup" className="hover:text-slate-300 transition-colors">Sign Up</Link>
          </div>

          <div className="text-slate-600">
            © {new Date().getFullYear()} VEYA. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
