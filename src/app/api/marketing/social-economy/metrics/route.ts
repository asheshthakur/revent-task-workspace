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
    const {
      social_post_id,
      social_account_id,
      snapshot_date = new Date().toISOString().split('T')[0],
      impressions,
      reach,
      likes,
      comments,
      shares,
      clicks,
      saves,
      profile_visits,
      followers_count,
      notes = '',
      source = 'manual'
    } = body;

    if (!social_post_id) {
      return NextResponse.json({ error: 'Post ID is required.' }, { status: 400 });
    }

    // Verify post ownership
    const post = await queryFirst(
      'SELECT id, social_account_id FROM social_posts WHERE id = ? AND organisation_id = ?',
      [social_post_id, ctx.activeOrg.id]
    );

    if (!post) {
      return NextResponse.json({ error: 'Post not found in this workspace.' }, { status: 404 });
    }

    // Calculate Engagement Rate if denominator > 0
    // General formula: (likes + comments + shares) / impressions * 100
    const impNum = impressions !== undefined && impressions !== null && impressions !== '' ? Number(impressions) : null;
    const reachNum = reach !== undefined && reach !== null && reach !== '' ? Number(reach) : null;
    const likesNum = likes !== undefined && likes !== null && likes !== '' ? Number(likes) : null;
    const commentsNum = comments !== undefined && comments !== null && comments !== '' ? Number(comments) : null;
    const sharesNum = shares !== undefined && shares !== null && shares !== '' ? Number(shares) : null;
    const clicksNum = clicks !== undefined && clicks !== null && clicks !== '' ? Number(clicks) : null;
    const savesNum = saves !== undefined && saves !== null && saves !== '' ? Number(saves) : null;
    const visitsNum = profile_visits !== undefined && profile_visits !== null && profile_visits !== '' ? Number(profile_visits) : null;
    const followersNum = followers_count !== undefined && followers_count !== null && followers_count !== '' ? Number(followers_count) : null;

    let engagementRate: number | null = null;
    if (impNum && impNum > 0) {
      const interactions = (likesNum || 0) + (commentsNum || 0) + (sharesNum || 0);
      engagementRate = Number(((interactions / impNum) * 100).toFixed(2));
    }

    const result = await runQuery(
      `INSERT INTO social_metric_snapshots (
        organisation_id, social_post_id, social_account_id, recorded_by_user_id,
        source, snapshot_date, impressions, reach, likes, comments, shares,
        clicks, saves, profile_visits, followers_count, engagement_rate, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        ctx.activeOrg.id,
        social_post_id,
        social_account_id || post.social_account_id,
        ctx.user.id,
        source,
        snapshot_date,
        impNum,
        reachNum,
        likesNum,
        commentsNum,
        sharesNum,
        clicksNum,
        savesNum,
        visitsNum,
        followersNum,
        engagementRate,
        notes
      ]
    );

    return NextResponse.json({
      success: true,
      snapshotId: result.lastInsertRowid,
      engagementRate,
      message: 'Metric snapshot recorded successfully.'
    });
  } catch (err: any) {
    console.error('Error in POST /api/marketing/social-economy/metrics:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required.' }, { status: 400 });
    }

    const snapshots = await queryAll(
      `SELECT sms.*, u.name as recorder_name
       FROM social_metric_snapshots sms
       LEFT JOIN users u ON sms.recorded_by_user_id = u.id
       WHERE sms.social_post_id = ? AND sms.organisation_id = ?
       ORDER BY sms.snapshot_date DESC, sms.created_at DESC`,
      [postId, ctx.activeOrg.id]
    );

    return NextResponse.json({ snapshots });
  } catch (err: any) {
    console.error('Error in GET /api/marketing/social-economy/metrics:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
