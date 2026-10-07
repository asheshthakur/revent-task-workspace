import React from 'react';
import { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Master Subscription Order Form | VEYA',
  description: 'B2B Customer Contract & Subscription Order Form Template for VEYA enterprise customers.',
};

export default function OrderFormPage() {
  const doc = VEYA_LEGAL_CONFIG.DOCUMENTS.ORDER_FORM_TEMPLATE;

  return (
    <LegalLayout
      title={doc.title}
      version={doc.version}
      effectiveDate={doc.effectiveDate}
      summary={doc.summary}
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">Master Subscription Order Form (Contract Template)</h2>
          <p className="text-xs text-slate-400">
            This Subscription Order Form ("<strong>Order Form</strong>") is entered into by and between <strong>{VEYA_LEGAL_CONFIG.LEGAL_ENTITY_NAME}</strong> ("<strong>Company</strong>") and the Customer identified below ("<strong>Customer</strong>"), pursuant to the VEYA Terms of Service located at <a href="/legal/terms" className="text-indigo-400 hover:underline">/legal/terms</a>.
          </p>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-300">
            <strong>Notice to Customer:</strong> This template outlines the standard contracting structure for B2B commercial subscriptions and enterprise custom agreements. To execute a customized commercial order form with UAE VAT invoicing or custom SLA commitments, contact <a href={`mailto:${VEYA_LEGAL_CONFIG.BILLING_EMAIL}`} className="text-white underline">{VEYA_LEGAL_CONFIG.BILLING_EMAIL}</a>.
          </div>
        </section>

        {/* Contract Fields Table */}
        <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs">
          <div className="bg-slate-900 p-3 font-bold text-white border-b border-slate-800">1. Customer Organization Information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 p-4 gap-4 bg-slate-950/60">
            <div className="space-y-2">
              <div><span className="text-slate-500 block">Customer Legal Name:</span> <span className="font-semibold text-slate-300">[Customer Legal Entity Name]</span></div>
              <div><span className="text-slate-500 block">Commercial Registration / License #:</span> <span className="font-semibold text-slate-300">[Trade License Number]</span></div>
              <div><span className="text-slate-500 block">Tax Registration Number (TRN / VAT):</span> <span className="font-semibold text-slate-300">[UAE TRN or Tax ID]</span></div>
            </div>
            <div className="space-y-2">
              <div><span className="text-slate-500 block">Registered Address:</span> <span className="font-semibold text-slate-300">[Street, City, Emirate / Country]</span></div>
              <div><span className="text-slate-500 block">Authorized Contact Name:</span> <span className="font-semibold text-slate-300">[Name & Title]</span></div>
              <div><span className="text-slate-500 block">Billing Contact Email:</span> <span className="font-semibold text-slate-300">[billing@customer.com]</span></div>
            </div>
          </div>

          <div className="bg-slate-900 p-3 font-bold text-white border-y border-slate-800">2. Subscription Terms & Commercial Plan</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 p-4 gap-4 bg-slate-950/60">
            <div><span className="text-slate-500 block">Committed Plan:</span> <span className="font-semibold text-white">Team Pro / Business / Enterprise</span></div>
            <div><span className="text-slate-500 block">Committed User Seats:</span> <span className="font-semibold text-white">[Number of Seats]</span></div>
            <div><span className="text-slate-500 block">Billing Interval:</span> <span className="font-semibold text-white">Annual (Prepaid) / Monthly</span></div>
          </div>

          <div className="bg-slate-900 p-3 font-bold text-white border-y border-slate-800">3. Applicable Legal Schedules</div>
          <div className="p-4 space-y-2 bg-slate-950/60 text-slate-300">
            <div>✓ <strong>Governing Agreement:</strong> VEYA Terms of Service (v1.0)</div>
            <div>✓ <strong>Data Processing Agreement:</strong> VEYA DPA (v1.0) with Appendices 1–3</div>
            <div>✓ <strong>Service Level Agreement:</strong> VEYA SLA (v1.0) with 99.5% availability target</div>
            <div>✓ <strong>Governing Law:</strong> {VEYA_LEGAL_CONFIG.GOVERNING_LAW}</div>
          </div>
        </div>

        {/* Execution & Signature Blocks */}
        <section className="space-y-4">
          <h3 className="text-base font-bold text-white">4. Execution & Authorization Foundation</h3>
          <p className="text-xs text-slate-400">
            Pursuant to <strong>UAE Federal Decree-Law No. 46 of 2021 on Electronic Transactions and Trust Services</strong>, this Agreement may be executed in counterparts by electronic signatures or by affirmative digital acceptance by an authorized Workspace Administrator.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Service Provider:</span>
              <div className="text-xs font-semibold text-white">{VEYA_LEGAL_CONFIG.LEGAL_ENTITY_NAME}</div>
              <div className="h-10 border-b border-dashed border-slate-700 flex items-end pb-1 text-xs text-slate-500">[Authorized Digital Signature]</div>
              <div className="text-[11px] text-slate-400">Date: [YYYY-MM-DD]</div>
            </div>

            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Customer:</span>
              <div className="text-xs font-semibold text-white">[Customer Legal Entity Name]</div>
              <div className="h-10 border-b border-dashed border-slate-700 flex items-end pb-1 text-xs text-slate-500">[Authorized Officer Signature]</div>
              <div className="text-[11px] text-slate-400">Date: [YYYY-MM-DD]</div>
            </div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
