import React from 'react';
import { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy Policy | VEYA',
  description: 'Official Privacy Policy for VEYA detailing data collection, lawful bases under UAE PDPL, and user rights.',
};

export default function PrivacyPolicyPage() {
  const doc = VEYA_LEGAL_CONFIG.DOCUMENTS.PRIVACY_POLICY;

  return (
    <LegalLayout
      title={doc.title}
      version={doc.version}
      effectiveDate={doc.effectiveDate}
      summary={doc.summary}
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">1. Introduction and Scope</h2>
          <p>
            This Privacy Policy ("<strong>Privacy Policy</strong>") explains how <strong>{VEYA_LEGAL_CONFIG.LEGAL_ENTITY_NAME}</strong> (trading as <strong>{VEYA_LEGAL_CONFIG.TRADE_NAME}</strong>, hereinafter "<strong>Company</strong>", "<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>") collects, uses, stores, discloses, and protects personal data when you interact with the {VEYA_LEGAL_CONFIG.PRODUCT_NAME} platform (<a href={VEYA_LEGAL_CONFIG.PRODUCTION_BASE_URL} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.PRODUCTION_DOMAIN}</a>), native desktop applications, and related services (collectively, the "<strong>Service</strong>").
          </p>
          <p>
            We are committed to processing personal data responsibly, transparently, and in full compliance with applicable data protection laws, including <strong>UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection (PDPL)</strong> and other applicable regional privacy regulations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">2. Roles: Data Controller vs. Data Processor</h2>
          <p>
            To understand your rights and our obligations under data protection laws, it is important to distinguish our operational roles:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>When Company acts as Data Controller:</strong> We act as a Controller for personal data collected directly from account creators and website visitors for account provisioning, direct billing, platform security, and communications (such as user email, password hashes, billing contact details, and technical access logs).
            </li>
            <li>
              <strong>When Company acts as Data Processor:</strong> For all Customer Content submitted into organizational workspaces by Authorized Users (including tasks, descriptions, internal messages, files, client notes, and employee workload allocations), the Customer Organization acts as the <strong>Data Controller</strong>, and Company acts strictly as a <strong>Data Processor</strong> carrying out processing in accordance with the Customer’s instructions and our <a href="/legal/dpa" className="text-indigo-400 hover:underline">Data Processing Agreement (DPA)</a>.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">3. Categories of Personal Data Collected</h2>
          <p>
            We collect only the categories of data strictly required to deliver and secure the Service:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-900 text-slate-200">
                <tr>
                  <th className="p-3 border-b border-slate-800">Category</th>
                  <th className="p-3 border-b border-slate-800">Data Elements Collected</th>
                  <th className="p-3 border-b border-slate-800">Purpose & Lawful Basis (UAE PDPL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="p-3 font-semibold text-white">Account & Profile</td>
                  <td className="p-3">Full name, work email address, bcrypt-salted password hash, department, chosen animal emoji avatar, status indicator.</td>
                  <td className="p-3">Contractual necessity to establish and authenticate user accounts and workspace membership.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Workspace Operations</td>
                  <td className="p-3">Tasks, assignments, priorities, due dates, review requests, pages, milestones, time tracking logs, meeting links.</td>
                  <td className="p-3">Performance of contract with customer organization; processor instructions under DPA.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Direct & Group Chat</td>
                  <td className="p-3">Instant messages, thread replies, read receipt timestamps, reactions, and file attachments.</td>
                  <td className="p-3">Delivering workplace collaboration features under service terms.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Technical & Security Logs</td>
                  <td className="p-3">IP address, user agent, session tokens, audit log records (action type, actor user ID, affected entity, timestamp).</td>
                  <td className="p-3">Legitimate interest in fraud prevention, infrastructure security, and legal compliance auditing.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Transactional Email</td>
                  <td className="p-3">Recipient email, recipient first name, single-use password reset tokens (hashed in D1).</td>
                  <td className="p-3">Contractual fulfillment for secure identity verification and onboarding.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">4. Subprocessors and Infrastructure Architecture</h2>
          <p>
            We do not sell personal data. We utilize vetted third-party service providers ("<strong>Subprocessors</strong>") strictly necessary to deliver edge computing, database persistence, and transactional email relay:
          </p>
          <div className="space-y-3">
            {VEYA_LEGAL_CONFIG.SUBPROCESSORS.map((sub, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{sub.name}</span>
                  <a href={sub.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    Third-Party Privacy Policy &rarr;
                  </a>
                </div>
                <div className="text-slate-300"><strong>Role:</strong> {sub.role}</div>
                <div className="text-slate-400"><strong>Location:</strong> {sub.processingLocation}</div>
                <div className="text-slate-500 font-mono text-[11px]">{sub.entityName}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">5. Cross-Border Data Transfers</h2>
          <p>
            VEYA utilizes Cloudflare’s globally distributed serverless edge infrastructure and Google Workspace transactional relay. While edge nodes process requests closest to the user (including in the United Arab Emirates and GCC region), data may be transmitted or replicated across secure international cloud datacenters.
          </p>
          <p>
            In compliance with Articles 22 and 23 of the <strong>UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021)</strong>, cross-border transfers are conducted subject to adequate data protection safeguards, contractual data processing agreements, and technical encryption controls.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">6. Technical Safeguards & Encryption</h2>
          <p>
            We implement comprehensive technical and organizational measures (TOMs) appropriate to the risk:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Encryption in Transit:</strong> All HTTP traffic is strictly enforced via TLS 1.3/HTTPS with HSTS headers.</li>
            <li><strong>Password Protection:</strong> Passwords are never stored in plaintext; they are hashed using salted `bcrypt` algorithms.</li>
            <li><strong>Tenant Isolation:</strong> Workspace queries enforce tenant filtering (`WHERE organisation_id = ?`) with foreign key constraints in Cloudflare D1.</li>
            <li><strong>Zero-Trust Email Relay:</strong> Outbound communications use HMAC-SHA256 authenticated payloads with short expiry timestamps.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">7. Data Subject Rights under UAE PDPL</h2>
          <p>
            Under the UAE Personal Data Protection Law, individuals residing in the UAE have statutory rights regarding their personal data, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Right of Access:</strong> The right to obtain confirmation and a copy of personal data processed by us.</li>
            <li><strong>Right to Rectification:</strong> The right to correct inaccurate, obsolete, or incomplete personal data.</li>
            <li><strong>Right to Erasure (Right to be Forgotten):</strong> The right to request deletion of personal data when no longer necessary.</li>
            <li><strong>Right to Restriction:</strong> The right to restrict processing under certain statutory grounds.</li>
            <li><strong>Right to Data Portability:</strong> The right to receive personal data in a structured, commonly used machine-readable format (JSON/CSV).</li>
            <li><strong>Right to Object:</strong> The right to object to processing where based on legitimate interests or direct marketing.</li>
          </ul>
          <p>
            To exercise these rights, please email our Data Protection team at <a href={`mailto:${VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}</a>. We respond to all verified statutory requests within thirty (30) calendar days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">8. Data Retention and Deletion</h2>
          <p>
            Personal data is retained only for the duration necessary to satisfy operational purposes, comply with legal and accounting obligations, and resolve disputes. Detailed retention windows are set forth in our <a href="/legal/data-retention" className="text-indigo-400 hover:underline">Data Retention & Deletion Policy</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">9. Contact and Supervisory Authority</h2>
          <p>
            If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out to:
          </p>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
            <div><strong>Company:</strong> {VEYA_LEGAL_CONFIG.LEGAL_ENTITY_NAME}</div>
            <div><strong>Data Privacy Office:</strong> <a href={`mailto:${VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}</a></div>
            <div><strong>Data Protection Officer:</strong> <a href={`mailto:${VEYA_LEGAL_CONFIG.DPO_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.DPO_EMAIL}</a></div>
            <div><strong>Supervisory Authority:</strong> UAE Data Office (established under Federal Decree-Law No. 44 of 2021)</div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
