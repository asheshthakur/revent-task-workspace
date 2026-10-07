import React from 'react';
import { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Data Retention & Deletion Policy | VEYA',
  description: 'Official data lifecycle, retention schedules, and deletion processes for VEYA workspaces.',
};

export default function DataRetentionPage() {
  const doc = VEYA_LEGAL_CONFIG.DOCUMENTS.DATA_RETENTION;
  const ret = VEYA_LEGAL_CONFIG.RETENTION_WINDOWS;

  return (
    <LegalLayout
      title={doc.title}
      version={doc.version}
      effectiveDate={doc.effectiveDate}
      summary={doc.summary}
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">1. Overview and Principles</h2>
          <p>
            This Data Retention & Deletion Policy outlines how {VEYA_LEGAL_CONFIG.PRODUCT_NAME} manages the operational lifecycle of workspace data, user accounts, system logs, and customer-requested erasures.
          </p>
          <p>
            We adhere to the data minimization principle under Article 5 of the <strong>UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021)</strong>: personal data is kept only as long as necessary for the purposes for which it is processed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">2. Standard Retention Schedules</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-900 text-slate-200">
                <tr>
                  <th className="p-3 border-b border-slate-800">Data Category</th>
                  <th className="p-3 border-b border-slate-800">Retention Duration</th>
                  <th className="p-3 border-b border-slate-800">Operational Behavior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="p-3 font-semibold text-white">Active Workspace Content (Tasks, Projects, Pages, Chat)</td>
                  <td className="p-3 font-mono text-indigo-400">Duration of Subscription</td>
                  <td className="p-3">Retained continuously while workspace remains active and in good standing.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Archived Tasks and Projects</td>
                  <td className="p-3 font-mono text-indigo-400">Duration of Subscription</td>
                  <td className="p-3">Soft-flagged (`is_archived = 1`). Hidden from standard views but recoverable by Admins.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Authentication Session Tokens</td>
                  <td className="p-3 font-mono text-indigo-400">{ret.SESSION_TOKEN_EXPIRY_DAYS} Days</td>
                  <td className="p-3">Automated expiration and rotation via edge cookie mechanics.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Password Reset Tokens</td>
                  <td className="p-3 font-mono text-indigo-400">{ret.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES} Minutes</td>
                  <td className="p-3">Single-use cryptographic hash. Expired tokens cannot be redeemed.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Security & Audit Logs</td>
                  <td className="p-3 font-mono text-indigo-400">{ret.AUDIT_LOG_RETENTION_DAYS} Days (1 Year)</td>
                  <td className="p-3">Retained for enterprise auditing, compliance reviews, and forensic verification.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Terminated Workspace Data Grace Period</td>
                  <td className="p-3 font-mono text-indigo-400">{ret.ORGANISATION_TERMINATION_GRACE_PERIOD_DAYS} Days</td>
                  <td className="p-3">Admins can export complete datasets. Hard-purge occurs after grace period.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">3. Archive vs. Delete Distinction</h2>
          <ul className="list-disc pl-6 space-y-2 text-xs text-slate-300">
            <li>
              <strong>Archival:</strong> Setting an entity as archived (`is_archived = 1` for tasks/projects) preserves operational history, time tracking records, and financial allocations while decluttering views. Data remains accessible in exports.
            </li>
            <li>
              <strong>Customer-Requested Deletion:</strong> Permanent removal requested by a Workspace Owner or Administrator. Initiates a confirmed workflow that cascades across task checklists, dependencies, and file KV storage after the retention window.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">4. Submitting a Deletion Request</h2>
          <p>
            Authorized Workspace Owners can initiate an organizational erasure request through Workspace Settings or by submitting a formal request to <a href={`mailto:${VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}</a> with proof of authority.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
