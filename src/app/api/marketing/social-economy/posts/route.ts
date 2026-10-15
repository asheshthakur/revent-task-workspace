import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryFirst, runQuery } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search');

    let sql = `
      SELECT sp.*, sa.display_name as account_name, sa.profile_url as account_url,
             sms.impressions, sms.reach, sms.likes, sms.comments, sms.shares, sms.clicks, sms.saves,
             sms.profile_visits, sms.engagement_rate, sms.source as metric_source, sms.snapshot_date
      FROM social_posts sp
      LEFT JOIN social_accounts sa ON sp.social_account_id = sa.id
      LEFT JOIN social_metric_snapshots sms ON sms.id = (
        SELECT id FROM social_metric_snapshots 
        WHERE social_post_id = sp.id 
        ORDER BY snapshot_date DESC, id DESC LIMIT 1
      )
      WHERE sp.organisation_id = ?
    `;
    const params: any[] = [ctx.activeOrg.id];

    if (platform && platform !== 'all') {
      sql += ' AND sp.platform = ?';
      params.push(platform.toLowerCase());
    }

    if (status && status !== 'all') {
      sql += ' AND sp.status = ?';
      params.push(status);
    }

    if (accountId) {
      sql += ' AND sp.social_account_id = ?';
      params.push(Number(accountId));
    }

    if (search) {
      sql += ' AND (sp.title LIKE ? OR sp.caption LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY COALESCE(sp.published_at, sp.scheduled_at, sp.created_at) DESC';

    const posts = await queryAll(sql, params);
    return NextResponse.json({ posts });
  } catch (err: any) {
    console.error('Error in GET /api/marketing/social-economy/posts:', err);
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
      social_account_id,
      client_id,
      platform,
      title,
      caption = '',
      post_url = '',
      scheduled_at = '',
      published_at = '',
      status = 'draft'
    } = body;

    if (!title || !platform) {
      return NextResponse.json({ error: 'Title and platform are required.' }, { status: 400 });
    }

    const result = await runQuery(
      `INSERT INTO social_posts (
        organisation_id, social_account_id, client_id, created_by_user_id,
        platform, title, caption, post_url, scheduled_at, published_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        ctx.activeOrg.id,
        social_account_id ? Number(social_account_id) : null,
        client_id ? Number(client_id) : null,
        ctx.user.id,
        platform.toLowerCase(),
        title.trim(),
        caption,
        post_url,
        scheduled_at || null,
        published_at || (status === 'published' ? new Date().toISOString() : null),
        status
      ]
    );

    return NextResponse.json({
      success: true,
      postId: result.lastInsertRowid,
      message: 'Post created successfully.'
    });
  } catch (err: any) {
    console.error('Error in POST /api/marketing/social-economy/posts:', err);
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
    const { id, title, caption, post_url, scheduled_at, published_at, status, platform, social_account_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required.' }, { status: 400 });
    }

    const post = await queryFirst(
      'SELECT id FROM social_posts WHERE id = ? AND organisation_id = ?',
      [id, ctx.activeOrg.id]
    );

    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    await runQuery(
      `UPDATE social_posts SET
        title = COALESCE(?, title),
        caption = COALESCE(?, caption),
        post_url = COALESCE(?, post_url),
        scheduled_at = COALESCE(?, scheduled_at),
        published_at = COALESCE(?, published_at),
        status = COALESCE(?, status),
        platform = COALESCE(?, platform),
        social_account_id = COALESCE(?, social_account_id),
        updated_at = datetime('now')
      WHERE id = ? AND organisation_id = ?`,
      [
        title,
        caption,
        post_url,
        scheduled_at,
        published_at || (status === 'published' ? new Date().toISOString() : undefined),
        platform ? platform.toLowerCase() : undefined,
        social_account_id ? Number(social_account_id) : undefined,
        id,
        ctx.activeOrg.id
      ]
    );

    return NextResponse.json({ success: true, message: 'Post updated successfully.' });
  } catch (err: any) {
    console.error('Error in PATCH /api/marketing/social-economy/posts:', err);
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
      return NextResponse.json({ error: 'Post ID is required.' }, { status: 400 });
    }

    await runQuery(
      'DELETE FROM social_posts WHERE id = ? AND organisation_id = ?',
      [id, ctx.activeOrg.id]
    );

    return NextResponse.json({ success: true, message: 'Post deleted successfully.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/marketing/social-economy/posts:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
