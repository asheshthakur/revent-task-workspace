import React from 'react';
import { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Data Processing Agreement (DPA) | VEYA',
  description: 'Standard B2B Data Processing Agreement for VEYA customers processing personal data under UAE PDPL.',
};

export default function DpaPage() {
  const doc = VEYA_LEGAL_CONFIG.DOCUMENTS.DPA;

  return (
    <LegalLayout
      title={doc.title}
      version={doc.version}
      effectiveDate={doc.effectiveDate}
      summary={doc.summary}
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">1. Scope and Precedence</h2>
          <p>
            This Data Processing Agreement ("<strong>DPA</strong>") supplements the VEYA Terms of Service ("<strong>Agreement</strong>") entered into between <strong>{VEYA_LEGAL_CONFIG.LEGAL_ENTITY_NAME}</strong> ("<strong>Data Processor</strong>" or "<strong>Company</strong>") and the customer organization ("<strong>Data Controller</strong>" or "<strong>Customer</strong>").
          </p>
          <p>
            This DPA applies to the extent that Company processes Personal Data on behalf of Customer in the course of providing the Service. In the event of any conflict between the terms of this DPA and the Agreement, the terms of this DPA shall govern with respect to the processing of Personal Data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">2. Processing Instructions and Obligations</h2>
          <p>
            <strong>Documented Instructions:</strong> Processor shall process Personal Data exclusively on behalf of and in accordance with Controller's documented instructions, including with respect to transfers of Personal Data, unless required to do so by applicable laws of the United Arab Emirates.
          </p>
          <p>
            <strong>Confidentiality of Personnel:</strong> Processor ensures that persons authorized to process the Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.
          </p>
          <p>
            <strong>Compliance Assistance:</strong> Processor shall assist Controller in ensuring compliance with the obligations pursuant to the <strong>UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection (PDPL)</strong>, taking into account the nature of processing and the information available to Processor.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">3. Subprocessors</h2>
          <p>
            <strong>Prior Written Authorization:</strong> Controller hereby grants general written authorization to Processor to engage the third-party Subprocessors listed in <strong>Appendix 3</strong>.
          </p>
          <p>
            <strong>Notification of Subprocessor Changes:</strong> Processor shall notify Controller at least thirty (30) days in advance of any intended appointment of new Subprocessors or replacements via email or Platform notification, giving Controller the opportunity to object on reasonable data protection grounds.
          </p>
          <p>
            <strong>Contractual Flow-Down:</strong> Processor imposes data protection obligations on any Subprocessor that are no less protective than those imposed on Processor under this DPA.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">4. Security of Processing & Incident Notification</h2>
          <p>
            <strong>Technical and Organizational Measures (TOMs):</strong> Processor shall implement and maintain the technical and organizational security measures specified in <strong>Appendix 2</strong> to ensure a level of security appropriate to the risk.
          </p>
          <p>
            <strong>Breach Notification:</strong> Processor shall notify Controller without undue delay, and in any event within <strong>forty-eight (48) hours</strong> of becoming aware of a confirmed Personal Data Breach affecting Customer Personal Data. Processor shall promptly provide details regarding the nature of the breach, affected records, and remedial measures taken.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">5. Return and Deletion of Personal Data</h2>
          <p>
            Upon termination of the Service, Processor shall, at the choice of Controller, delete or return all Personal Data to Controller within thirty (30) calendar days, and delete existing copies unless applicable UAE or international law requires retention.
          </p>
        </section>

        <div className="pt-6 border-t border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-indigo-400">Appendix 1 — Processing Details</h3>
          <div className="text-xs space-y-2 text-slate-300 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div><strong>Subject Matter:</strong> Provision of VEYA team work management, tasks, projects, pages, and chat.</div>
            <div><strong>Duration:</strong> Duration of the Agreement plus data retention grace period.</div>
            <div><strong>Categories of Data Subjects:</strong> Customer employees, contractors, managers, leadership, and invited external clients/guests.</div>
            <div><strong>Categories of Personal Data:</strong> Names, business emails, roles, departments, task assignments, chat logs, timestamps, and access audit records.</div>
          </div>

          <h3 className="text-lg font-bold text-indigo-400">Appendix 2 — Technical and Organizational Measures</h3>
          <div className="text-xs space-y-2 text-slate-300 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div><strong>Encryption:</strong> TLS 1.3 enforced for all transport. Salted bcrypt hashing for authentication passwords.</div>
            <div><strong>Access Control:</strong> Strict tenant isolation (`organisation_id`), role-based permissions (owner, admin, member, guest), and immutable audit logs.</div>
            <div><strong>Zero-Trust Outbound Relay:</strong> Server-to-server HMAC-SHA256 authenticated email dispatch with timestamp freshness validation.</div>
            <div><strong>Availability & Resilience:</strong> Serverless edge deployment on Cloudflare Workers with automated failover across global points of presence.</div>
          </div>

          <h3 className="text-lg font-bold text-indigo-400">Appendix 3 — Approved Subprocessors</h3>
          <div className="space-y-3">
            {VEYA_LEGAL_CONFIG.SUBPROCESSORS.map((sub, idx) => (
              <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                <span className="font-bold text-white">{sub.name}</span> — {sub.role} ({sub.processingLocation})
              </div>
            ))}
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
