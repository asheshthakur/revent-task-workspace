import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const docs = await queryAll(`
      SELECT id, document_type, version, title, summary, effective_date, published_date, is_active, changelog_notes
      FROM legal_documents
      ORDER BY document_type ASC, version DESC
    `);

    return NextResponse.json({
      success: true,
      config: {
        legalEntityName: VEYA_LEGAL_CONFIG.LEGAL_ENTITY_NAME,
        tradeName: VEYA_LEGAL_CONFIG.TRADE_NAME,
        registeredAddress: VEYA_LEGAL_CONFIG.REGISTERED_ADDRESS,
        jurisdiction: VEYA_LEGAL_CONFIG.JURISDICTION_COUNTRY,
        governingLaw: VEYA_LEGAL_CONFIG.GOVERNING_LAW,
        disputeJurisdiction: VEYA_LEGAL_CONFIG.DISPUTE_JURISDICTION,
        contacts: {
          legal: VEYA_LEGAL_CONFIG.LEGAL_EMAIL,
          privacy: VEYA_LEGAL_CONFIG.PRIVACY_EMAIL,
          dpo: VEYA_LEGAL_CONFIG.DPO_EMAIL,
          billing: VEYA_LEGAL_CONFIG.BILLING_EMAIL,
          support: VEYA_LEGAL_CONFIG.SUPPORT_EMAIL,
          security: VEYA_LEGAL_CONFIG.SECURITY_EMAIL,
        },
      },
      documents: docs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query legal documents';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
