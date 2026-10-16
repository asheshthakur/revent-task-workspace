import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryFirst, runQuery } from '@/lib/db';
import { performCompliantPublicRefresh, CrawlResult } from '@/lib/socialCrawler';

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, refreshAll = false } = body;

    let targetAccounts: any[] = [];
    if (refreshAll) {
      targetAccounts = await queryAll(
        'SELECT * FROM social_accounts WHERE organisation_id = ? AND status = "active"',
        [ctx.activeOrg.id]
      );
    } else if (accountId) {
      const acc = await queryFirst(
        'SELECT * FROM social_accounts WHERE id = ? AND organisation_id = ?',
        [accountId, ctx.activeOrg.id]
      );
      if (acc) targetAccounts = [acc];
    }

    if (targetAccounts.length === 0) {
      return NextResponse.json({ error: 'No active social accounts found to refresh.' }, { status: 404 });
    }

    const results: Array<{ accountId: number; displayName: string; result: CrawlResult }> = [];

    for (const acc of targetAccounts) {
      // Cooldown check: 10s cooldown to avoid spamming
      const now = new Date();
      if (acc.last_refreshed_at) {
        const lastRef = new Date(acc.last_refreshed_at);
        const diffMs = now.getTime() - lastRef.getTime();
        if (diffMs < 10000) {
          results.push({
            accountId: acc.id,
            displayName: acc.display_name,
            result: {
              status: 'no_new_data',
              platform: acc.platform,
              provenance: 'public_crawl',
              recordsInspected: 1,
              recordsUpdated: 0,
              errorMessage: 'Cooldown active. Recently refreshed.'
            }
          });
          continue;
        }
      }

      // Execute compliant public refresh
      const crawlResult = await performCompliantPublicRefresh(
        acc.platform,
        acc.profile_url
      );

      const isSuccessfulCrawl = crawlResult.status === 'updated' && crawlResult.observedFollowers !== undefined && crawlResult.observedFollowers !== null;

      // Update account status & timestamps
      if (isSuccessfulCrawl) {
        await runQuery(
          `UPDATE social_accounts SET
            current_followers = ?,
            last_refreshed_at = datetime('now'),
            last_successful_check_at = datetime('now'),
            last_refresh_status = 'updated',
            last_refresh_message = 'Public data verified and updated.',
            updated_at = datetime('now')
          WHERE id = ? AND organisation_id = ?`,
          [crawlResult.observedFollowers, acc.id, ctx.activeOrg.id]
        );

        // Record follower snapshot if new or changed
        await runQuery(
          `INSERT INTO social_follower_snapshots (
            organisation_id, social_account_id, follower_count, source, observation_timestamp, notes, created_at
          ) VALUES (?, ?, ?, 'public_crawl', ?, 'Observed via refresh check', datetime('now'))`,
          [ctx.activeOrg.id, acc.id, crawlResult.observedFollowers, new Date().toISOString()]
        );
      } else {
        await runQuery(
          `UPDATE social_accounts SET
            last_refreshed_at = datetime('now'),
            last_refresh_status = ?,
            last_refresh_message = ?,
            updated_at = datetime('now')
          WHERE id = ? AND organisation_id = ?`,
          [crawlResult.status, crawlResult.errorMessage || '', acc.id, ctx.activeOrg.id]
        );
      }

      // Log refresh job
      await runQuery(
        `INSERT INTO social_refresh_jobs (
          organisation_id, social_account_id, triggered_by_user_id, status,
          source, records_inspected, records_updated, error_message, started_at, completed_at, created_at
        ) VALUES (?, ?, ?, ?, 'public_crawl', ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
        [
          ctx.activeOrg.id,
          acc.id,
          ctx.user.id,
          crawlResult.status === 'updated' ? 'completed' : crawlResult.status,
          crawlResult.recordsInspected,
          crawlResult.recordsUpdated,
          crawlResult.errorMessage || null
        ]
      );

      results.push({
        accountId: acc.id,
        displayName: acc.display_name,
        result: crawlResult
      });
    }

    return NextResponse.json({
      success: true,
      refreshedCount: results.length,
      results
    });
  } catch (err: any) {
    console.error('Error in POST /api/marketing/social-economy/refresh:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
