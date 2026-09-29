import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryRun, logAuditAction } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: Context) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;
    const { id } = await context.params;
    const docId = parseInt(id, 10);

    const doc = await queryFirst<any>(
      'SELECT * FROM finance_documents WHERE id = ? AND organisation_id = ?',
      [docId, activeOrg.id]
    );

    if (!doc) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Document Downloaded',
      entityType: 'FinanceDocument',
      entityId: doc.id,
      entityTitle: doc.filename,
      newValue: `Downloaded document ${doc.filename}`,
    });

    // Check if client requested download stream or metadata
    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download') === 'true';

    if (download && doc.file_data) {
      // Decode base64 and stream as binary with proper headers
      const base64Data = doc.file_data.includes(',')
        ? doc.file_data.split(',')[1]
        : doc.file_data;

      const binaryBuffer = Buffer.from(base64Data, 'base64');

      return new Response(binaryBuffer, {
        status: 200,
        headers: {
          'Content-Type': doc.mime_type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.filename)}"`,
          'Content-Length': binaryBuffer.length.toString(),
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    return NextResponse.json({ document: doc });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to access document: ' + errorMsg }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;
    const { id } = await context.params;
    const docId = parseInt(id, 10);

    const doc = await queryFirst<any>(
      'SELECT * FROM finance_documents WHERE id = ? AND organisation_id = ?',
      [docId, activeOrg.id]
    );

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await queryRun('DELETE FROM finance_documents WHERE id = ? AND organisation_id = ?', [docId, activeOrg.id]);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Document Deleted',
      entityType: 'FinanceDocument',
      entityId: docId,
      entityTitle: doc.filename,
      oldValue: doc.filename,
      newValue: 'Deleted document',
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete document: ' + errorMsg }, { status: 500 });
  }
}
