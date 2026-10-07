import React from 'react';
import { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Security & Privacy Architecture | VEYA',
  description: 'Technical overview of VEYA platform security, tenant isolation, and cryptographic controls.',
};

export default function SecurityPage() {
  const doc = VEYA_LEGAL_CONFIG.DOCUMENTS.SECURITY_OVERVIEW;

  return (
    <LegalLayout
      title={doc.title}
      version={doc.version}
      effectiveDate={doc.effectiveDate}
      summary={doc.summary}
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">1. Security Architecture Overview</h2>
          <p>
            {VEYA_LEGAL_CONFIG.PRODUCT_NAME} is engineered from the ground up for zero-trust edge performance and strict multi-tenant boundary separation. Rather than relying on legacy monolithic servers, VEYA executes directly across Cloudflare’s global edge network.
          </p>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <strong>Statement of Fact:</strong> VEYA currently implements the technical and organizational safeguards detailed below. We do not make premature claims of third-party certifications (such as SOC 2 Type II or ISO 27001) where independent audits have not yet been executed.
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">2. Core Security Pillars</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm">Tenant Isolation & Data Layer</h3>
              <p className="text-slate-400">
                Data persistence is managed via Cloudflare D1 distributed SQLite and FILES_KV. Every database query enforces strict tenant parameters (`WHERE organisation_id = ?`). IDOR protection and cross-tenant access barriers are validated on every API request.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm">Authentication & Session Security</h3>
              <p className="text-slate-400">
                User passwords are protected with salted `bcrypt` algorithms. Sessions use signed cryptographic tokens stored in `HttpOnly`, `SameSite=Lax`, and `Secure` cookies with automatic 30-day rotation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm">Zero-Trust Transactional Email Relay</h3>
              <p className="text-slate-400">
                All transactional emails (welcome notifications and password reset links) are transmitted through a zero-trust relay with HMAC-SHA256 request signatures, Unix epoch timestamp freshness validation (5-minute window), and destination URL route allowlisting.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm">Scoped Guest & Client Access</h3>
              <p className="text-slate-400">
                External guests and clients invited to specific projects or pages are restricted by fine-grained permission models (`can(ctx, action)`). Guests cannot access internal chats, team time entries, member directories, or billing settings.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">3. Vulnerability Disclosure & Incident Response</h2>
          <p>
            We take security seriously and encourage responsible security researchers and customers to report any suspected vulnerabilities directly to our team at <a href={`mailto:${VEYA_LEGAL_CONFIG.SECURITY_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.SECURITY_EMAIL}</a>. We respond to verified security disclosures promptly.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
