import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryFirst, runQuery } from '@/lib/db';
import { isSafePublicHttpUrl } from '@/lib/socialCrawler';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';
    const platform = searchParams.get('platform');

    let sql = `
      SELECT sa.*, c.name as client_name, u.name as creator_name
      FROM social_accounts sa
      LEFT JOIN clients c ON sa.client_id = c.id
      LEFT JOIN users u ON sa.created_by_user_id = u.id
      WHERE sa.organisation_id = ?
    `;
    const params: any[] = [ctx.activeOrg.id];

    if (status !== 'all') {
      sql += ' AND sa.status = ?';
      params.push(status);
    }

    if (platform && platform !== 'all') {
      sql += ' AND sa.platform = ?';
      params.push(platform.toLowerCase());
    }

    sql += ' ORDER BY sa.created_at DESC';

    const accounts = await queryAll(sql, params);
    return NextResponse.json({ accounts });
  } catch (err: any) {
    console.error('Error in GET /api/marketing/social-economy/accounts:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      platform,
      display_name,
      profile_url,
      client_id,
      collection_mode = 'manual',
      inspect_post_urls = '',
      notes = '',
      tags = ''
    } = body;

    if (!platform || !display_name || !profile_url) {
      return NextResponse.json(
        { error: 'Platform, display name, and public profile URL are required.' },
        { status: 400 }
      );
    }

    const validPlatforms = ['x', 'facebook', 'instagram', 'linkedin', 'reddit'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid platform. Supported: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    if (!isSafePublicHttpUrl(profile_url)) {
      return NextResponse.json(
        { error: 'Profile URL must be a valid public HTTP or HTTPS address.' },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await queryFirst(
      'SELECT id FROM social_accounts WHERE organisation_id = ? AND platform = ? AND profile_url = ?',
      [ctx.activeOrg.id, platform.toLowerCase(), profile_url]
    );

    if (existing) {
      return NextResponse.json(
        { error: 'A social account with this profile URL already exists in this workspace.' },
        { status: 409 }
      );
    }

    const result = await runQuery(
      `INSERT INTO social_accounts (
        organisation_id, client_id, created_by_user_id, platform, display_name,
        profile_url, collection_mode, inspect_post_urls, notes, tags, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
      [
        ctx.activeOrg.id,
        client_id ? Number(client_id) : null,
        ctx.user.id,
        platform.toLowerCase(),
        display_name.trim(),
        profile_url.trim(),
        collection_mode,
        inspect_post_urls,
        notes,
        tags
      ]
    );

    return NextResponse.json({
      success: true,
      accountId: result.lastInsertRowid,
      message: 'Social account created successfully.'
    });
  } catch (err: any) {
    console.error('Error in POST /api/marketing/social-economy/accounts:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, display_name, profile_url, client_id, collection_mode, inspect_post_urls, notes, tags, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required.' }, { status: 400 });
    }

    const account = await queryFirst(
      'SELECT id FROM social_accounts WHERE id = ? AND organisation_id = ?',
      [id, ctx.activeOrg.id]
    );

    if (!account) {
      return NextResponse.json({ error: 'Social account not found.' }, { status: 404 });
    }

    await runQuery(
      `UPDATE social_accounts SET
        display_name = COALESCE(?, display_name),
        profile_url = COALESCE(?, profile_url),
        client_id = ?,
        collection_mode = COALESCE(?, collection_mode),
        inspect_post_urls = COALESCE(?, inspect_post_urls),
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags),
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ? AND organisation_id = ?`,
      [
        display_name,
        profile_url,
        client_id !== undefined ? (client_id ? Number(client_id) : null) : undefined,
        collection_mode,
        inspect_post_urls,
        notes,
        tags,
        status,
        id,
        ctx.activeOrg.id
      ]
    );

    return NextResponse.json({ success: true, message: 'Social account updated successfully.' });
  } catch (err: any) {
    console.error('Error in PATCH /api/marketing/social-economy/accounts:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required.' }, { status: 400 });
    }

    await runQuery(
      'DELETE FROM social_accounts WHERE id = ? AND organisation_id = ?',
      [id, ctx.activeOrg.id]
    );

    return NextResponse.json({ success: true, message: 'Social account deleted successfully.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/marketing/social-economy/accounts:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
