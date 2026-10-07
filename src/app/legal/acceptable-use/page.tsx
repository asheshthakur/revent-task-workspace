import React from 'react';
import { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy (AUP) | VEYA',
  description: 'Rules and prohibited activities governing user behavior on VEYA workspaces.',
};

export default function AcceptableUsePage() {
  const doc = VEYA_LEGAL_CONFIG.DOCUMENTS.ACCEPTABLE_USE;

  return (
    <LegalLayout
      title={doc.title}
      version={doc.version}
      effectiveDate={doc.effectiveDate}
      summary={doc.summary}
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">1. Purpose and Scope</h2>
          <p>
            This Acceptable Use Policy ("<strong>AUP</strong>") outlines permitted and prohibited conduct across all {VEYA_LEGAL_CONFIG.PRODUCT_NAME} Workspaces, APIs, chat channels, and desktop applications. Compliance with this policy is mandatory for all Workspace Owners, Administrators, Members, and External Guests.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">2. Prohibited Security Activities</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1.5 text-xs text-slate-300">
            <li>Probe, scan, or test the vulnerability of any VEYA system, database, or network without prior written authorization.</li>
            <li>Breach, tamper with, or circumvent any security or authentication measures, token verifications, or tenant isolation boundaries.</li>
            <li>Interfere with or disrupt any user, host, or network (e.g. by flooding, spamming, mailbombing, or overloading APIs).</li>
            <li>Reverse engineer, decompile, or disassemble any portion of the Service except to the extent permitted by mandatory law.</li>
            <li>Harvest, mine, or scrape data using automated bots, crawlers, or scrapers without express written consent.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">3. Prohibited Content and Conduct</h2>
          <p>You agree not to upload, transmit, share, or store content that:</p>
          <ul className="list-disc pl-6 space-y-1.5 text-xs text-slate-300">
            <li>Is fraudulent, defamatory, harassing, threatening, hateful, or discriminatory.</li>
            <li>Infringes any patent, copyright, trademark, trade secret, or privacy right of any person or entity.</li>
            <li>Contains malware, computer viruses, ransomware, trojans, or malicious attachments.</li>
            <li>Violates applicable laws or regulations of the United Arab Emirates or your local jurisdiction.</li>
            <li>Discloses sensitive personal banking information, credit card numbers, or state secrets outside authorized commercial agreements.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">4. Reporting Abuse</h2>
          <p>
            To report suspected violations of this policy, please contact our trust & safety team immediately at <a href={`mailto:${VEYA_LEGAL_CONFIG.SECURITY_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.SECURITY_EMAIL}</a>. We investigate all credible reports and take prompt remedial action, up to and including account suspension and evidence referral to law enforcement where required by law.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
