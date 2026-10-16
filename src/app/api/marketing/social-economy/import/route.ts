import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryFirst, runQuery } from '@/lib/db';

function normalizePostStatus(raw: any): 'draft' | 'planned' | 'reminder_due' | 'published' | 'archived' {
  if (!raw) return 'published';
  const s = String(raw).toLowerCase().trim();
  if (['published', 'posted', 'done', 'live', 'completed', 'yes'].includes(s)) return 'published';
  if (['draft', 'in_progress', 'producing', 'wip', 'writing', 'not done'].includes(s)) return 'draft';
  if (['planned', 'scheduled', 'upcoming', 'due', 'due today', 'overdue', 'reminder_due'].includes(s)) return 'planned';
  if (['archived', 'cancelled', 'killed', 'deleted'].includes(s)) return 'archived';
  return 'published';
}

function parseFlexibleIsoDate(dateStr: any): string | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();
  if (!clean) return null;
  // Format DD-MMM-YY or DD-MMM-YYYY (e.g. 09-Oct-26)
  const match = clean.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const monthIdx = monthNames.indexOf(match[2].toLowerCase());
    if (monthIdx !== -1) {
      const month = String(monthIdx + 1).padStart(2, '0');
      let year = match[3];
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
  }
  const d = new Date(clean);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return clean;
}

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

      // Check if this row is an account/follower observation or a post
      const isFollowerObservation = r.followers !== undefined || r.follower_count !== undefined;

      // Required fields for post: title or caption, and platform
      const resolvedTitle = (r.title || r.caption || r.post_title || r.idea || `Post ${rowIdx}`).trim();
      if (!isFollowerObservation && !resolvedTitle) {
        failedCount++;
        errors.push({ row: rowIdx, reason: 'Missing required title or caption for post.' });
        continue;
      }

      const platformClean = String(r.platform || 'linkedin').toLowerCase().trim();
      const validPlatforms = ['x', 'facebook', 'instagram', 'linkedin', 'reddit'];
      const normalizedPlatform = validPlatforms.find(p => platformClean.includes(p)) || 'linkedin';
      const normalizedStatus = normalizePostStatus(r.status);
      const parsedDate = parseFlexibleIsoDate(r.published_at || r.date || r.scheduled_at);

      try {
        // Resolve social account if profile name/url provided
        let accountId: number | null = null;
        if (r.account_id) {
          accountId = Number(r.account_id);
        } else if (r.profile || r.account || r.profile_url) {
          const profileTerm = String(r.profile || r.account || r.profile_url).trim();
          const acc = await queryFirst(
            `SELECT id FROM social_accounts 
             WHERE organisation_id = ? AND (display_name LIKE ? OR profile_url LIKE ?) LIMIT 1`,
            [ctx.activeOrg.id, `%${profileTerm}%`, `%${profileTerm}%`]
          );
          if (acc) accountId = acc.id;
        }

        // Handle follower observation import
        if (accountId && (r.followers !== undefined || r.follower_count !== undefined)) {
          const count = Number(r.followers ?? r.follower_count);
          if (!isNaN(count) && count >= 0) {
            const timestamp = parsedDate || new Date().toISOString();
            await runQuery(
              `INSERT INTO social_follower_snapshots (
                organisation_id, social_account_id, follower_count, source, observation_timestamp, notes, created_at
              ) VALUES (?, ?, ?, 'csv', ?, ?, datetime('now'))`,
              [ctx.activeOrg.id, accountId, count, timestamp, `Imported from ${filename}`]
            );

            // Update account's latest follower count
            await runQuery(
              `UPDATE social_accounts SET current_followers = ?, updated_at = datetime('now') WHERE id = ? AND organisation_id = ?`,
              [count, accountId, ctx.activeOrg.id]
            );
          }
        }

        // If row has post title/caption, process as post
        if (resolvedTitle) {
          let existingPost: any = null;
          if (r.post_url) {
            existingPost = await queryFirst(
              'SELECT id FROM social_posts WHERE organisation_id = ? AND post_url = ?',
              [ctx.activeOrg.id, r.post_url]
            );
          } else {
            existingPost = await queryFirst(
              'SELECT id FROM social_posts WHERE organisation_id = ? AND title = ? AND platform = ?',
              [ctx.activeOrg.id, resolvedTitle, normalizedPlatform]
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
                parsedDate,
                normalizedStatus,
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
                resolvedTitle,
                r.caption || r.content || '',
                r.post_url || '',
                parsedDate,
                normalizedStatus
              ]
            );
            postId = Number(postRes.lastInsertRowid);
            importedCount++;
          }

          // Insert metric snapshot if metrics present
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
