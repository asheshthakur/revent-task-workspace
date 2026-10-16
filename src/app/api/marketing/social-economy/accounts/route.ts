import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryFirst, queryRun, runQuery } from '@/lib/db';
import { isSafePublicHttpUrl, performCompliantPublicRefresh } from '@/lib/socialCrawler';

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
      SELECT sa.*, u.name as creator_name
      FROM social_accounts sa
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

    // Also fetch follower snapshots history for each account
    const accountIds = accounts.map(a => a.id);
    let snapshots: any[] = [];
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => '?').join(',');
      snapshots = await queryAll(
        `SELECT * FROM social_follower_snapshots 
         WHERE social_account_id IN (${placeholders}) AND organisation_id = ?
         ORDER BY observation_timestamp ASC`,
        [...accountIds, ctx.activeOrg.id]
      );
    }

    return NextResponse.json({ accounts, snapshots });
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
      follower_count,
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

    let parsedFollowers: number | null = null;
    if (follower_count !== undefined && follower_count !== null && follower_count !== '') {
      parsedFollowers = Number(follower_count);
      if (isNaN(parsedFollowers) || parsedFollowers < 0 || !Number.isInteger(parsedFollowers)) {
        return NextResponse.json(
          { error: 'Follower count must be a non-negative whole integer.' },
          { status: 400 }
        );
      }
    }

    // Check duplicate platform + profile_url in current workspace
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

    // 1. Persist the account in D1
    const result = await runQuery(
      `INSERT INTO social_accounts (
        organisation_id, created_by_user_id, platform, display_name,
        profile_url, collection_mode, notes, tags, status, current_followers,
        last_refreshed_at, last_refresh_status, last_refresh_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, 'active', ?, datetime('now'), 'checking', 'Checking public data...', datetime('now'), datetime('now'))`,
      [
        ctx.activeOrg.id,
        ctx.user.id,
        platform.toLowerCase(),
        display_name.trim(),
        profile_url.trim(),
        notes,
        tags,
        parsedFollowers
      ]
    );

    const accountId = Number(result.lastInsertRowid);
    const nowIso = new Date().toISOString();

    // 2. Save initial manual follower snapshot if provided
    if (parsedFollowers !== null) {
      await runQuery(
        `INSERT INTO social_follower_snapshots (
          organisation_id, social_account_id, follower_count, source, observation_timestamp, notes, created_at
        ) VALUES (?, ?, ?, 'manual', ?, 'Initial account baseline', datetime('now'))`,
        [ctx.activeOrg.id, accountId, parsedFollowers, nowIso]
      );
    }

    // 3. Immediately attempt background public enrichment
    (async () => {
      try {
        const crawl = await performCompliantPublicRefresh(platform.toLowerCase() as any, profile_url.trim());
        const isSuccess = crawl.status === 'updated' && crawl.observedFollowers !== undefined && crawl.observedFollowers !== null;

        if (isSuccess) {
          // Record public_crawl snapshot
          await runQuery(
            `INSERT INTO social_follower_snapshots (
              organisation_id, social_account_id, follower_count, source, observation_timestamp, notes, created_at
            ) VALUES (?, ?, ?, 'public_crawl', ?, 'Observed via public crawl', datetime('now'))`,
            [ctx.activeOrg.id, accountId, crawl.observedFollowers, new Date().toISOString()]
          );

          await runQuery(
            `UPDATE social_accounts SET
              current_followers = ?,
              last_refreshed_at = datetime('now'),
              last_successful_check_at = datetime('now'),
              last_refresh_status = 'updated',
              last_refresh_message = 'Public data verified and updated.',
              updated_at = datetime('now')
            WHERE id = ? AND organisation_id = ?`,
            [crawl.observedFollowers, accountId, ctx.activeOrg.id]
          );
        } else {
          // Update status with crawl feedback without overwriting manual baseline
          await runQuery(
            `UPDATE social_accounts SET
              last_refreshed_at = datetime('now'),
              last_refresh_status = ?,
              last_refresh_message = ?,
              updated_at = datetime('now')
            WHERE id = ? AND organisation_id = ?`,
            [crawl.status, crawl.errorMessage || '', accountId, ctx.activeOrg.id]
          );
        }

        // Record refresh job entry
        await runQuery(
          `INSERT INTO social_refresh_jobs (
            organisation_id, social_account_id, triggered_by_user_id, status,
            source, records_inspected, records_updated, error_message, started_at, completed_at, created_at
          ) VALUES (?, ?, ?, ?, 'public_crawl', ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
          [
            ctx.activeOrg.id,
            accountId,
            ctx.user.id,
            crawl.status === 'updated' ? 'completed' : crawl.status,
            crawl.recordsInspected,
            crawl.recordsUpdated,
            crawl.errorMessage || null
          ]
        );
      } catch (crawlErr) {
        console.error('Background enrichment error on save:', crawlErr);
      }
    })();

    return NextResponse.json({
      success: true,
      accountId,
      currentFollowers: parsedFollowers,
      message: 'Social account created. Background public check initiated.'
    });
  } catch (err: any) {
    console.error('Error in POST /api/marketing/social-economy/accounts:', err?.message || err, err?.stack);
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
    const { id, display_name, profile_url, follower_count, notes, tags, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required.' }, { status: 400 });
    }

    const account = await queryFirst(
      'SELECT id, current_followers FROM social_accounts WHERE id = ? AND organisation_id = ?',
      [id, ctx.activeOrg.id]
    );

    if (!account) {
      return NextResponse.json({ error: 'Social account not found.' }, { status: 404 });
    }

    let parsedFollowers: number | null | undefined = undefined;
    if (follower_count !== undefined && follower_count !== null && follower_count !== '') {
      parsedFollowers = Number(follower_count);
      if (isNaN(parsedFollowers) || parsedFollowers < 0 || !Number.isInteger(parsedFollowers)) {
        return NextResponse.json(
          { error: 'Follower count must be a non-negative whole integer.' },
          { status: 400 }
        );
      }
    }

    // Update account
    await runQuery(
      `UPDATE social_accounts SET
        display_name = COALESCE(?, display_name),
        profile_url = COALESCE(?, profile_url),
        current_followers = CASE WHEN ? IS NOT NULL THEN ? ELSE current_followers END,
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags),
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ? AND organisation_id = ?`,
      [
        display_name,
        profile_url,
        parsedFollowers !== undefined ? parsedFollowers : null,
        parsedFollowers !== undefined ? parsedFollowers : null,
        notes,
        tags,
        status,
        id,
        ctx.activeOrg.id
      ]
    );

    // If new follower observation provided, save historical manual snapshot
    if (parsedFollowers !== undefined && parsedFollowers !== null && parsedFollowers !== account.current_followers) {
      await runQuery(
        `INSERT INTO social_follower_snapshots (
          organisation_id, social_account_id, follower_count, source, observation_timestamp, notes, created_at
        ) VALUES (?, ?, ?, 'manual', ?, 'Manual update from edit form', datetime('now'))`,
        [ctx.activeOrg.id, id, parsedFollowers, new Date().toISOString()]
      );
    }

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
