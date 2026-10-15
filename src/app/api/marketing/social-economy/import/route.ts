import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryFirst, runQuery } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { filename = 'import.csv', rows = [], updateMatching = true } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided for import.' }, { status: 400 });
    }

    let importedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowIdx = i + 1;

      // Required fields: title, platform
      if (!r.title || !r.platform) {
        failedCount++;
        errors.push({ row: rowIdx, reason: 'Missing required title or platform.' });
        continue;
      }

      const platformClean = String(r.platform).toLowerCase().trim();
      const validPlatforms = ['x', 'facebook', 'instagram', 'linkedin', 'reddit'];
      const normalizedPlatform = validPlatforms.find(p => platformClean.includes(p)) || 'linkedin';

      try {
        // Resolve social account if profile name/url provided
        let accountId: number | null = null;
        if (r.account_id) {
          accountId = Number(r.account_id);
        } else if (r.profile || r.account) {
          const profileTerm = String(r.profile || r.account).trim();
          const acc = await queryFirst(
            `SELECT id FROM social_accounts 
             WHERE organisation_id = ? AND (display_name LIKE ? OR profile_url LIKE ?) LIMIT 1`,
            [ctx.activeOrg.id, `%${profileTerm}%`, `%${profileTerm}%`]
          );
          if (acc) accountId = acc.id;
        }

        // Check if matching post exists (by post_url or title + platform)
        let existingPost: any = null;
        if (r.post_url) {
          existingPost = await queryFirst(
            'SELECT id FROM social_posts WHERE organisation_id = ? AND post_url = ?',
            [ctx.activeOrg.id, r.post_url]
          );
        } else {
          existingPost = await queryFirst(
            'SELECT id FROM social_posts WHERE organisation_id = ? AND title = ? AND platform = ?',
            [ctx.activeOrg.id, r.title, normalizedPlatform]
          );
        }

        let postId: number;
        if (existingPost && updateMatching) {
          postId = existingPost.id;
          await runQuery(
            `UPDATE social_posts SET
              caption = COALESCE(?, caption),
              post_url = COALESCE(?, post_url),
              published_at = COALESCE(?, published_at),
              status = COALESCE(?, status),
              social_account_id = COALESCE(?, social_account_id),
              updated_at = datetime('now')
            WHERE id = ? AND organisation_id = ?`,
            [
              r.caption || r.content,
              r.post_url,
              r.published_at || r.date,
              r.status ? String(r.status).toLowerCase() : undefined,
              accountId,
              postId,
              ctx.activeOrg.id
            ]
          );
          updatedCount++;
        } else {
          const postRes = await runQuery(
            `INSERT INTO social_posts (
              organisation_id, social_account_id, created_by_user_id, platform,
              title, caption, post_url, published_at, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
              ctx.activeOrg.id,
              accountId,
              ctx.user.id,
              normalizedPlatform,
              String(r.title).trim(),
              r.caption || r.content || '',
              r.post_url || '',
              r.published_at || r.date || null,
              r.status ? String(r.status).toLowerCase() : 'published'
            ]
          );
          postId = Number(postRes.lastInsertRowid);
          importedCount++;
        }

        // Insert metric snapshot if any metric present
        const imp = r.impressions !== undefined && r.impressions !== '' ? Number(r.impressions) : null;
        const reach = r.reach !== undefined && r.reach !== '' ? Number(r.reach) : null;
        const likes = r.likes !== undefined && r.likes !== '' ? Number(r.likes) : null;
        const comments = r.comments !== undefined && r.comments !== '' ? Number(r.comments) : null;
        const shares = r.shares !== undefined && r.shares !== '' ? Number(r.shares) : null;
        const clicks = r.clicks !== undefined && r.clicks !== '' ? Number(r.clicks) : null;
        const saves = r.saves !== undefined && r.saves !== '' ? Number(r.saves) : null;

        if (imp !== null || reach !== null || likes !== null || comments !== null || shares !== null || clicks !== null) {
          let engagementRate: number | null = null;
          if (imp && imp > 0) {
            const interactions = (likes || 0) + (comments || 0) + (shares || 0);
            engagementRate = Number(((interactions / imp) * 100).toFixed(2));
          }

          const snapshotDate = r.snapshot_date || r.date || new Date().toISOString().split('T')[0];

          await runQuery(
            `INSERT INTO social_metric_snapshots (
              organisation_id, social_post_id, social_account_id, recorded_by_user_id,
              source, snapshot_date, impressions, reach, likes, comments, shares,
              clicks, saves, engagement_rate, notes, created_at
            ) VALUES (?, ?, ?, ?, 'csv', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
              ctx.activeOrg.id,
              postId,
              accountId,
              ctx.user.id,
              snapshotDate,
              imp,
              reach,
              likes,
              comments,
              shares,
              clicks,
              saves,
              engagementRate,
              `Imported from ${filename}`
            ]
          );
        }
      } catch (rowErr: any) {
        failedCount++;
        errors.push({ row: rowIdx, reason: rowErr.message || 'Error processing row' });
      }
    }

    // Record import job history
    await runQuery(
      `INSERT INTO social_import_jobs (
        organisation_id, created_by_user_id, filename, total_rows, imported_rows,
        updated_rows, failed_rows, status, error_log, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        ctx.activeOrg.id,
        ctx.user.id,
        filename,
        rows.length,
        importedCount,
        updatedCount,
        failedCount,
        failedCount > 0 ? (importedCount > 0 ? 'completed' : 'failed') : 'completed',
        JSON.stringify(errors)
      ]
    );

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      importedCount,
      updatedCount,
      failedCount,
      errors
    });
  } catch (err: any) {
    console.error('Error in POST /api/marketing/social-economy/import:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
