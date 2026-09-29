import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryRun, logAuditAction } from '@/lib/db';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const body = await req.json();
    const {
      entity_type, // 'invoice' | 'pdc' | 'payment'
      entity_id,
      document_type = 'Supporting Document',
      filename,
      mime_type = 'application/pdf',
      file_data, // base64 string
    } = body;

    if (!entity_type || !entity_id || !filename || !file_data) {
      return NextResponse.json({ error: 'Missing required document fields' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(mime_type.toLowerCase())) {
      return NextResponse.json({ error: 'File type not allowed. Supported formats: PDF, PNG, JPG, DOCX' }, { status: 400 });
    }

    const approxSize = Math.round((file_data.length * 3) / 4);
    if (approxSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum allowed size of 10MB' }, { status: 400 });
    }

    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const now = new Date().toISOString();

    const res = await queryRun(`
      INSERT INTO finance_documents (
        organisation_id, entity_type, entity_id, document_type, filename, file_size, mime_type, file_data, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      activeOrg.id,
      entity_type,
      parseInt(entity_id, 10),
      document_type,
      cleanFilename,
      approxSize,
      mime_type,
      file_data,
      user.id,
      now,
    ]);

    const docId = Number(res.lastInsertRowid);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Document Uploaded',
      entityType: 'FinanceDocument',
      entityId: docId,
      entityTitle: cleanFilename,
      newValue: `Uploaded ${document_type}: ${cleanFilename}`,
    });

    return NextResponse.json({
      success: true,
      documentId: docId,
      filename: cleanFilename,
    }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to upload document: ' + errorMsg }, { status: 500 });
  }
}
