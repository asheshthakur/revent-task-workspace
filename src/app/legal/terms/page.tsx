import React from 'react';
import { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Terms of Service | VEYA',
  description: 'Official Terms of Service governing access to and use of the VEYA team workspace platform.',
};

export default function TermsOfServicePage() {
  const doc = VEYA_LEGAL_CONFIG.DOCUMENTS.TERMS_OF_SERVICE;

  return (
    <LegalLayout
      title={doc.title}
      version={doc.version}
      effectiveDate={doc.effectiveDate}
      summary={doc.summary}
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">1. Agreement to Terms and Eligibility</h2>
          <p>
            These Terms of Service ("<strong>Terms</strong>" or "<strong>Agreement</strong>") constitute a legally binding agreement between you (whether individually or on behalf of an entity that you represent, hereinafter "<strong>Customer</strong>", "<strong>you</strong>", or "<strong>your</strong>") and <strong>{VEYA_LEGAL_CONFIG.LEGAL_ENTITY_NAME}</strong> (trading as <strong>{VEYA_LEGAL_CONFIG.TRADE_NAME}</strong>, hereinafter "<strong>Company</strong>", "<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>"), governing your access to and use of the {VEYA_LEGAL_CONFIG.PRODUCT_NAME} application, websites located at <a href={VEYA_LEGAL_CONFIG.PRODUCTION_BASE_URL} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.PRODUCTION_DOMAIN}</a>, native desktop applications, and associated services (collectively, the "<strong>Service</strong>" or "<strong>Platform</strong>").
          </p>
          <p>
            By clicking "Create Account", "Sign Up", or otherwise registering for, accessing, or utilizing the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you are entering into these Terms on behalf of a company, corporate enterprise, partnership, or other legal entity, you represent and warrant that you possess the full legal authority to bind such entity to these Terms. If you do not agree to these Terms, you must not access or use the Service.
          </p>
          <p>
            The Service is intended solely for professional business-to-business (B2B) use by individuals who are at least eighteen (18) years of age and legally competent to enter into binding commercial contracts under applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">2. Organization Accounts, Workspaces, and User Roles</h2>
          <p>
            The Platform provides isolated organizational workspaces ("<strong>Workspaces</strong>"). The entity or individual that registers an Organization is designated as the initial <strong>Workspace Owner</strong>.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Workspace Administrators & Owners:</strong> Administrators control workspace settings, invite authorized members and external guests, assign functional roles, configure integrations, review audit logs, and manage subscription tiers. Administrators are responsible for maintaining accurate user access lists and terminating access for former employees or contractors.
            </li>
            <li>
              <strong>Authorized Users:</strong> Authorized users (including employees and contractors) must provide truthful account credentials, maintain strict password confidentiality, and refrain from sharing individual login credentials across multiple individuals.
            </li>
            <li>
              <strong>External Guests & Clients:</strong> Workspaces may invite external clients or guests with restricted, scoped visibility to specific designated projects or pages. Guests agree not to probe, access, or attempt to view unauthorized workspace assets or teammate information outside their explicitly shared scope.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">3. Customer Data and Intellectual Property</h2>
          <p>
            <strong>Customer Ownership of Customer Content:</strong> As between Customer and Company, Customer retains all right, title, and interest (including all patent, copyright, trademark, trade secret, and other intellectual property rights) in and to all data, text, files, tasks, messages, chat records, documents, time entries, and financial metadata uploaded or created by Customer and its Authorized Users in the Service ("<strong>Customer Content</strong>").
          </p>
          <p>
            <strong>Limited License to Provide Service:</strong> Customer hereby grants Company a worldwide, non-exclusive, royalty-free, limited license to host, store, transfer, display, compute, back up, and process Customer Content solely to the extent necessary to provide, secure, maintain, and support the Service in accordance with these Terms and Customer’s instructions.
          </p>
          <p>
            <strong>Company Intellectual Property:</strong> Company retains exclusive ownership of all right, title, and interest in and to the Platform, including all underlying software, edge runtime workers, database schemas, APIs, interfaces, designs, trademarks, logos, and algorithmic improvements. Customer is granted only a limited, non-exclusive, non-transferable, revocable license to access and use the Service during the applicable subscription term.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">4. Subscriptions, Fees, Invoicing, and Taxes</h2>
          <p>
            <strong>Commercial Plans:</strong> Certain tiers of the Service are offered on a paid subscription basis (e.g. Team Pro, Business Operations, or Enterprise Custom) based on committed seat quantities and features described on our <a href="/pricing" className="text-indigo-400 hover:underline">Pricing Page</a> or agreed in an executed Master Subscription Order Form.
          </p>
          <p>
            <strong>Payment Terms:</strong> Unless otherwise specified in an Order Form, fees are payable in United States Dollars (USD) or United Arab Emirates Dirhams (AED) at the beginning of each billing interval (monthly or annual). For invoiced accounts, payment is due within thirty (30) calendar days from invoice issuance date.
          </p>
          <p>
            <strong>Taxes & Value Added Tax (VAT):</strong> All fees are exclusive of applicable indirect taxes. Where required by the laws of the United Arab Emirates (including Federal Decree-Law No. 8 of 2017 on Value Added Tax as amended), Company shall issue a valid Tax Invoice detailing applicable VAT (currently 5% standard rate where applicable), which Customer shall pay in full.
          </p>
          <p>
            <strong>Renewals and Cancellations:</strong> Subscriptions renew automatically for successive periods matching the initial billing interval unless canceled by Customer’s Workspace Administrator prior to the renewal date. Cancellations take effect at the conclusion of the current paid billing cycle.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">5. Data Privacy and Data Processing Agreement</h2>
          <p>
            Our processing of personal data is governed by our <a href="/legal/privacy" className="text-indigo-400 hover:underline">Privacy Policy</a> and, for business customers processing personal data on behalf of individuals, our standard <a href="/legal/dpa" className="text-indigo-400 hover:underline">Data Processing Agreement (DPA)</a>. The DPA complies with the requirements of <strong>UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection (PDPL)</strong> and is incorporated into these Terms by reference.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">6. Service Availability and Service Levels</h2>
          <p>
            We strive to provide reliable, high-availability edge infrastructure. Our service level targets, planned maintenance advance notifications, severity response classifications, and support policies are detailed in our <a href="/legal/sla" className="text-indigo-400 hover:underline">Service Level Agreement (SLA)</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">7. Suspension and Termination</h2>
          <p>
            <strong>Suspension for Cause:</strong> We may temporarily suspend Customer’s access to the Service if: (i) Customer breaches these Terms or the Acceptable Use Policy; (ii) Customer’s account is past due following written notification; or (iii) Customer’s usage poses an imminent security vulnerability or disruption to the Service or other tenants.
          </p>
          <p>
            <strong>Data Export upon Termination:</strong> Following termination of an Organization workspace, Customer’s Administrators shall have a grace period of thirty (30) calendar days to export their Customer Content via the self-serve data export functionality or by contacting <a href={`mailto:${VEYA_LEGAL_CONFIG.SUPPORT_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.SUPPORT_EMAIL}</a>, after which Customer Content will be purged in accordance with our <a href="/legal/data-retention" className="text-indigo-400 hover:underline">Data Retention & Deletion Policy</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">8. Disclaimers and Limitation of Liability</h2>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-2 uppercase tracking-wide">
            <p>
              EXCEPT AS EXPRESSLY SET FORTH HEREIN OR IN AN APPLICABLE SLA, THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
            </p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS.
            </p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE TOTAL AGGREGATE LIABILITY OF EITHER PARTY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY CUSTOMER TO COMPANY HEREUNDER IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">9. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms and any dispute or claim arising out of or in connection with them or their subject matter or formation shall be governed by and construed in accordance with the <strong>{VEYA_LEGAL_CONFIG.GOVERNING_LAW}</strong>.
          </p>
          <p>
            Any dispute, controversy, or claim arising out of, relating to, or in connection with this contract, including any question regarding its existence, validity, interpretation, breach, or termination, shall be referred to and finally resolved by the <strong>{VEYA_LEGAL_CONFIG.DISPUTE_JURISDICTION}</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">10. Modifications to Terms and Contact Information</h2>
          <p>
            We may revise these Terms from time to time to reflect regulatory developments, new features, or updated commercial practices. In the event of material changes, we will provide advance notice through the Platform or via email to registered Workspace Administrators. Continued use of the Service following the effective date of revised Terms constitutes acceptance.
          </p>
          <p>
            If you have questions regarding these Terms, please contact our legal department at:
          </p>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
            <div><strong>Entity:</strong> {VEYA_LEGAL_CONFIG.LEGAL_ENTITY_NAME}</div>
            <div><strong>Address:</strong> {VEYA_LEGAL_CONFIG.REGISTERED_ADDRESS}</div>
            <div><strong>Legal Inquiries:</strong> <a href={`mailto:${VEYA_LEGAL_CONFIG.LEGAL_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.LEGAL_EMAIL}</a></div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
