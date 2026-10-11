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
            This Privacy Policy ("<strong>Privacy Policy</strong>") explains how <strong>{VEYA_LEGAL_CONFIG.LEGAL_ENTITY_NAME}</strong> (trading as <strong>{VEYA_LEGAL_CONFIG.TRADE_NAME}</strong>, an {VEYA_LEGAL_CONFIG.LEGAL_FORM_DESCRIPTION}, hereinafter "<strong>Company</strong>", "<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>") collects, uses, stores, discloses, and protects personal data when you interact with the {VEYA_LEGAL_CONFIG.PRODUCT_NAME} platform (<a href={VEYA_LEGAL_CONFIG.PRODUCTION_BASE_URL} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.PRODUCTION_DOMAIN}</a>), native desktop applications, and related services (collectively, the "<strong>Service</strong>").
          </p>
          <p>
            We are committed to processing personal data responsibly, transparently, and in accordance with applicable Indian legislation, including the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, the <strong>Digital Personal Data Protection Rules, 2025</strong> (as commenced in phases), and the <strong>Information Technology Act, 2000</strong> (including the Reasonable Security Practices and Procedures Rules, 2011 and Intermediary Guidelines).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">2. Roles: Data Fiduciary vs. Data Processor</h2>
          <p>
            To understand your rights and our obligations under data protection laws, it is important to distinguish our operational roles:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>When Company acts as Data Fiduciary:</strong> We act as a Data Fiduciary for personal data collected directly from account creators and website visitors for account provisioning, direct billing, platform security, and communications (such as user email, password hashes, billing contact details, and technical access logs).
            </li>
            <li>
              <strong>When Company acts as Data Processor:</strong> For all Customer Content submitted into organizational workspaces by Authorized Users (including tasks, descriptions, internal messages, files, client notes, and employee workload allocations), the Customer Organization acts as the <strong>Data Fiduciary (or Controller)</strong>, and Company acts strictly as a <strong>Data Processor</strong> carrying out processing in accordance with the Customer’s instructions and our <a href="/legal/dpa" className="text-indigo-400 hover:underline">Data Processing Agreement (DPA)</a>.
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
                  <th className="p-3 border-b border-slate-800">Purpose & Lawful Basis</th>
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
                  <td className="p-3">Legitimate use and legal compliance in infrastructure security, fraud prevention, and audit logging.</td>
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
            VEYA utilizes Cloudflare’s globally distributed serverless edge infrastructure and Google Workspace transactional relay. Edge compute nodes process requests closest to the user (including across Asia, India, and global Edge Points of Presence), while data may be transmitted or replicated across secure international cloud datacenters.
          </p>
          <p>
            Cross-border transfers are conducted in compliance with applicable Indian law (including Section 16 of the DPDP Act, 2023, subject to any negative lists notified by the Central Government) and supported by robust contractual and technical safeguards.
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
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">7. Rights of Data Principals & Grievance Redressal</h2>
          <p>
            In accordance with the Digital Personal Data Protection Act, 2023 and applicable Indian regulations, Data Principals have rights regarding their personal data:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Right to Access Information:</strong> Obtain a summary of personal data being processed and the identities of other data fiduciaries/processors with whom data has been shared.</li>
            <li><strong>Right to Correction & Erasure:</strong> Request correction, completion, updating, or erasure of personal data that is no longer necessary for the purpose for which it was processed.</li>
            <li><strong>Right of Grievance Redressal:</strong> Have readily available means of grievance redressal provided by the Data Fiduciary.</li>
            <li><strong>Right to Nominate:</strong> Nominate another individual who shall exercise data principal rights in the event of death or incapacity.</li>
          </ul>
          <p>
            To exercise these rights or file a grievance, please contact our designated Grievance Officer at <a href={`mailto:${VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}</a>. We respond to all verified statutory requests and grievances within the timelines mandated by applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">8. Data Retention and Deletion</h2>
          <p>
            Personal data is retained only for the duration necessary to satisfy operational purposes, comply with legal and accounting obligations, and resolve disputes. Detailed retention windows are set forth in our <a href="/legal/data-retention" className="text-indigo-400 hover:underline">Data Retention & Deletion Policy</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">9. Contact and Grievance Officer</h2>
          <p>
            If you have questions, concerns, or grievances regarding this Privacy Policy or our data practices, please contact:
          </p>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
            <div><strong>Enterprise:</strong> {VEYA_LEGAL_CONFIG.LEGAL_ENTITY_NAME}</div>
            <div><strong>Registration:</strong> {VEYA_LEGAL_CONFIG.LEGAL_FORM_DESCRIPTION}</div>
            <div><strong>Jurisdiction:</strong> {VEYA_LEGAL_CONFIG.JURISDICTION_COUNTRY}</div>
            <div><strong>Grievance & Privacy Officer:</strong> <a href={`mailto:${VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}</a></div>
            <div><strong>General Inquiries:</strong> <a href={`mailto:${VEYA_LEGAL_CONFIG.SUPPORT_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.SUPPORT_EMAIL}</a></div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
