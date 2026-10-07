import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowRight, Shield, Zap, Sparkles, HelpCircle } from 'lucide-react';
import { LandingNavbar } from '@/components/LandingNavbar';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pricing & Plans | VEYA Work Management',
  description: 'Predictable, transparent B2B pricing for distributed teams, fast-growing agencies, and enterprise workspaces.',
};

export default function PricingPage() {
  const plans = VEYA_LEGAL_CONFIG.PRICING_PLANS;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      <LandingNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 sm:py-28 relative overflow-hidden border-b border-slate-900 bg-gradient-to-b from-indigo-950/20 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Commercial Pricing & Plans</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto">
              Transparent, seat-based pricing for modern teams.
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Start free with your core team, or scale with enterprise-grade workload management, native time tracking, and customizable legal contracts.
            </p>
          </div>
        </section>

        {/* Pricing Cards Grid */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => {
              const isEnterprise = plan.id === 'enterprise';
              const isRecommended = plan.recommended;

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                    isRecommended
                      ? 'bg-gradient-to-b from-indigo-950/80 to-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-600/20'
                      : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-2 min-h-10 leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    <div className="pt-2 pb-4 border-b border-slate-800">
                      {isEnterprise ? (
                        <div>
                          <span className="text-3xl font-black text-white">Custom</span>
                          <span className="text-xs text-slate-500 block mt-1">Bespoke SLA & Volume Billing</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline space-x-1">
                          <span className="text-4xl font-black text-white">${plan.priceMonthlyUSD}</span>
                          <span className="text-xs text-slate-400">/ user / month</span>
                        </div>
                      )}
                      <div className="text-[11px] text-indigo-400 mt-1">
                        {plan.seatLimit ? `Up to ${plan.seatLimit} seats` : 'Unlimited seats'}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Included Features:
                      </span>
                      <ul className="space-y-2.5 text-xs text-slate-300">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Link
                      href={plan.ctaHref}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                        isRecommended
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      <span>{plan.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Enterprise & UAE Compliance FAQ */}
        <section className="py-16 bg-slate-900/40 border-t border-slate-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <h2 className="text-2xl font-black text-white text-center">Commercial & Legal Contracting FAQ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-400">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h3 className="font-bold text-white text-sm">Do you support UAE VAT invoices?</h3>
                <p>
                  Yes. All UAE-domiciled corporate customers receive official Tax Invoices showing our legal entity details and Tax Registration Number (TRN) in accordance with UAE VAT laws.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h3 className="font-bold text-white text-sm">Can we sign an enterprise DPA?</h3>
                <p>
                  Yes. We offer standard and customized Data Processing Agreements aligned with UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection (PDPL). View our <Link href="/legal/dpa" className="text-indigo-400 hover:underline">standard DPA here</Link>.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h3 className="font-bold text-white text-sm">What payment methods are supported?</h3>
                <p>
                  We accept corporate wire transfers and invoicing for annual plans, as well as electronic payment methods. Enterprise customers can execute formal Master Subscription Order Forms.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h3 className="font-bold text-white text-sm">Can we export our data if we cancel?</h3>
                <p>
                  Yes. Workspace Administrators can export full organizational records in JSON and CSV format at any time to guarantee zero vendor lock-in.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <span className="text-base font-extrabold text-white tracking-wider">VEYA</span>
            <span className="text-slate-700">|</span>
            <p className="text-slate-400">Commercially ready work management platform.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/legal/terms" className="hover:text-slate-300">Terms of Service</Link>
            <Link href="/legal/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <Link href="/legal/dpa" className="hover:text-slate-300">DPA</Link>
            <Link href="/legal/sla" className="hover:text-slate-300">SLA</Link>
            <Link href="/legal/security" className="hover:text-slate-300">Security Architecture</Link>
          </div>

          <div className="text-slate-600">
            © {new Date().getFullYear()} {VEYA_LEGAL_CONFIG.TRADE_NAME}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
