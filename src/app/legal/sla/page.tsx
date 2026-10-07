import React from 'react';
import { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Service Level Agreement (SLA) | VEYA',
  description: 'Commercially realistic Service Level Agreement for VEYA B2B customers.',
};

export default function SlaPage() {
  const doc = VEYA_LEGAL_CONFIG.DOCUMENTS.SLA;
  const sla = VEYA_LEGAL_CONFIG.SLA_COMMITMENTS;

  return (
    <LegalLayout
      title={doc.title}
      version={doc.version}
      effectiveDate={doc.effectiveDate}
      summary={doc.summary}
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">1. Service Availability Commitment</h2>
          <p>
            Company targets a Monthly Uptime Percentage of at least <strong>{sla.TARGET_AVAILABILITY_PERCENT}%</strong> during each calendar month (or <strong>{sla.ENTERPRISE_AVAILABILITY_PERCENT}%</strong> for Enterprise Custom agreements) for the Core Platform features, calculated across thirty (30) day rolling windows.
          </p>
          <p>
            <strong>Core Platform Features:</strong> Includes workspace authentication, task retrieval and creation, direct/group chat messaging, project boards, and time tracking APIs.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">2. Maintenance Windows</h2>
          <p>
            <strong>Planned Maintenance:</strong> We aim to schedule system upgrades, migrations, or database maintenance during low-traffic windows (typically Saturdays between 01:00 and 05:00 GST). Customers will receive at least <strong>{sla.PLANNED_MAINTENANCE_ADVANCE_NOTICE_HOURS} hours</strong> advance notice via in-app banner or email.
          </p>
          <p>
            <strong>Emergency Maintenance:</strong> Critical security patching or emergency stability fixes may be performed with shorter notice. We will communicate via status broadcast within <strong>{sla.EMERGENCY_MAINTENANCE_COMMUNICATION_MINUTES} minutes</strong> of identifying the incident.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">3. Support Channels and Severity Tiers</h2>
          <p>
            Official support is provided via email at <a href={`mailto:${VEYA_LEGAL_CONFIG.SUPPORT_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.SUPPORT_EMAIL}</a>. Standard support hours are <strong>{sla.SUPPORT_HOURS}</strong>.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-900 text-slate-200">
                <tr>
                  <th className="p-3 border-b border-slate-800">Severity Tier</th>
                  <th className="p-3 border-b border-slate-800">Definition</th>
                  <th className="p-3 border-b border-slate-800">Target Initial Response</th>
                  <th className="p-3 border-b border-slate-800">Cadence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {sla.SEVERITY_LEVELS.map((level, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-semibold text-white whitespace-nowrap">{level.severity}</td>
                    <td className="p-3">{level.definition}</td>
                    <td className="p-3 font-mono text-indigo-400">{level.targetInitialResponse}</td>
                    <td className="p-3">{level.targetStatusUpdates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">4. Exclusions</h2>
          <p>
            SLA commitments and availability measurements exclude downtime resulting from:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-xs text-slate-300">
            <li>Factors outside our reasonable control (Force Majeure events, regional internet telecommunications fiber cuts, DNS upstream outages).</li>
            <li>Customer’s hardware, browser configurations, local network firewalls, or desktop operating system restrictions.</li>
            <li>Suspension or termination of Customer's account in accordance with the Terms of Service.</li>
            <li>Pre-announced planned maintenance windows.</li>
          </ul>
        </section>
      </div>
    </LegalLayout>
  );
}
