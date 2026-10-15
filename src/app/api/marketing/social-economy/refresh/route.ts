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
      // Cooldown check: do not refresh if refreshed in the last 15 seconds unless forced
      const now = new Date();
      if (acc.last_refreshed_at) {
        const lastRef = new Date(acc.last_refreshed_at);
        const diffMs = now.getTime() - lastRef.getTime();
        if (diffMs < 15000) {
          results.push({
            accountId: acc.id,
            displayName: acc.display_name,
            result: {
              status: 'success',
              platform: acc.platform,
              provenance: acc.collection_mode,
              recordsInspected: 1,
              recordsUpdated: 0,
              errorMessage: 'Cooldown active. Recently refreshed.'
            }
          });
          continue;
        }
      }

      let crawlResult: CrawlResult;

      if (acc.collection_mode === 'manual') {
        crawlResult = {
          status: 'success',
          platform: acc.platform,
          provenance: 'manual',
          recordsInspected: 1,
          recordsUpdated: 0,
          errorMessage: 'Manual mode: Persisted D1 records reloaded without external crawling.'
        };
      } else if (acc.collection_mode === 'csv') {
        crawlResult = {
          status: 'success',
          platform: acc.platform,
          provenance: 'csv',
          recordsInspected: 1,
          recordsUpdated: 0,
          errorMessage: 'CSV mode: Saved data reloaded. Import a new CSV file to update performance.'
        };
      } else {
        // public_crawl mode
        crawlResult = await performCompliantPublicRefresh(
          acc.platform,
          acc.profile_url,
          acc.inspect_post_urls ? acc.inspect_post_urls.split('\n').filter(Boolean) : []
        );
      }

      // Update account status & timestamp
      await runQuery(
        `UPDATE social_accounts SET
          last_refreshed_at = datetime('now'),
          last_refresh_status = ?,
          last_refresh_message = ?,
          updated_at = datetime('now')
        WHERE id = ? AND organisation_id = ?`,
        [crawlResult.status, crawlResult.errorMessage || '', acc.id, ctx.activeOrg.id]
      );

      // Log refresh job
      await runQuery(
        `INSERT INTO social_refresh_jobs (
          organisation_id, social_account_id, triggered_by_user_id, status,
          source, records_inspected, records_updated, error_message, started_at, completed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
        [
          ctx.activeOrg.id,
          acc.id,
          ctx.user.id,
          crawlResult.status === 'restricted_or_blocked' ? 'restricted' : (crawlResult.status === 'network_error' ? 'failed' : 'completed'),
          acc.collection_mode,
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

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await queryAll(
      `SELECT srj.*, sa.display_name as account_name, sa.platform
       FROM social_refresh_jobs srj
       LEFT JOIN social_accounts sa ON srj.social_account_id = sa.id
       WHERE srj.organisation_id = ?
       ORDER BY srj.created_at DESC LIMIT 50`,
      [ctx.activeOrg.id]
    );

    return NextResponse.json({ jobs });
  } catch (err: any) {
    console.error('Error in GET /api/marketing/social-economy/refresh:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
