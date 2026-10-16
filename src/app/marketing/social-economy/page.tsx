'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Share2,
  Plus,
  RefreshCw,
  FileUp,
  Download,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  Link2,
  ExternalLink,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Search,
  Filter,
  X,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Check,
  ChevronDown,
  Users
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';

type Platform = 'x' | 'facebook' | 'instagram' | 'linkedin' | 'reddit';
type PostStatus = 'draft' | 'planned' | 'reminder_due' | 'published' | 'archived';

interface FollowerSnapshot {
  id: number;
  social_account_id: number;
  follower_count: number;
  source: 'manual' | 'csv' | 'public_crawl';
  observation_timestamp: string;
  notes?: string;
}

interface SocialAccount {
  id: number;
  platform: Platform;
  display_name: string;
  profile_url: string;
  current_followers?: number | null;
  notes?: string;
  tags?: string;
  status: 'active' | 'archived';
  last_refreshed_at?: string;
  last_successful_check_at?: string;
  last_refresh_status?: string;
  last_refresh_message?: string;
}

interface SocialPost {
  id: number;
  social_account_id?: number | null;
  account_name?: string;
  account_url?: string;
  platform: Platform;
  title: string;
  caption?: string;
  post_url?: string;
  scheduled_at?: string;
  published_at?: string;
  status: PostStatus;
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  saves?: number;
  profile_visits?: number;
  engagement_rate?: number | null;
  metric_source?: 'manual' | 'csv' | 'public_crawl';
  snapshot_date?: string;
}

const platformMeta: Record<Platform, { label: string; color: string; bg: string }> = {
  linkedin: { label: 'LinkedIn', color: '#0a66c2', bg: 'bg-[#0a66c2]/10 text-[#0a66c2] border-[#0a66c2]/20' },
  x: { label: 'X', color: '#000000', bg: 'bg-slate-900/10 text-slate-900 border-slate-900/20' },
  instagram: { label: 'Instagram', color: '#e1306c', bg: 'bg-[#e1306c]/10 text-[#e1306c] border-[#e1306c]/20' },
  facebook: { label: 'Facebook', color: '#1877f2', bg: 'bg-[#1877f2]/10 text-[#1877f2] border-[#1877f2]/20' },
  reddit: { label: 'Reddit', color: '#ff4500', bg: 'bg-[#ff4500]/10 text-[#ff4500] border-[#ff4500]/20' }
};

export default function SocialEconomyPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'posts' | 'analytics' | 'import_export'>('overview');

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [followerSnapshots, setFollowerSnapshots] = useState<FollowerSnapshot[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [metricForChart, setMetricForChart] = useState<'impressions' | 'reach' | 'interactions'>('impressions');
  const [growthTimeRange, setGrowthTimeRange] = useState<30 | 60 | 90>(30);

  // Modals
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);

  // Editing state
  const [editingAccount, setEditingAccount] = useState<Partial<SocialAccount> & { follower_count?: string }>({
    platform: 'linkedin',
    display_name: '',
    profile_url: '',
    follower_count: '',
    notes: ''
  });
  const [editingPost, setEditingPost] = useState<Partial<SocialPost> | null>(null);
  const [selectedPostForMetrics, setSelectedPostForMetrics] = useState<SocialPost | null>(null);

  // Metrics form state
  const [metricsDraft, setMetricsDraft] = useState({
    impressions: '',
    reach: '',
    likes: '',
    comments: '',
    shares: '',
    clicks: '',
    saves: '',
    snapshot_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvError, setCsvError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh status
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Authentication & Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setCurrentUser(meData.user);

        // Fetch Accounts, Posts, Follower Snapshots
        await reloadData();
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const reloadData = async () => {
    try {
      const [accRes, postRes] = await Promise.all([
        fetch('/api/marketing/social-economy/accounts'),
        fetch('/api/marketing/social-economy/posts')
      ]);

      if (accRes.ok) {
        const d = await accRes.json();
        setAccounts(d.accounts || []);
        setFollowerSnapshots(d.snapshots || []);
      }
      if (postRes.ok) {
        const d = await postRes.json();
        setPosts(d.posts || []);
      }
    } catch (e) {
      console.error('Reload data error:', e);
    }
  };

  // Follower Growth Calculation for 30/60/90 Days
  const platformGrowthData = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - growthTimeRange);
    const cutoffIso = cutoffDate.toISOString();

    const platformsList: Platform[] = ['linkedin', 'x', 'instagram', 'facebook', 'reddit'];

    return platformsList.map(platform => {
      const platAccounts = accounts.filter(a => a.platform === platform && a.status === 'active');
      
      // Sum latest valid follower count across accounts
      let currentTotal = 0;
      let hasAnyAccount = platAccounts.length > 0;
      let hasCurrentFollowers = false;

      platAccounts.forEach(acc => {
        if (acc.current_followers !== undefined && acc.current_followers !== null) {
          currentTotal += acc.current_followers;
          hasCurrentFollowers = true;
        }
      });

      // Calculate baseline follower count at or immediately prior to cutoff
      let baselineTotal = 0;
      let baselineAccountsFound = 0;
      let latestObsDate: string | null = null;

      platAccounts.forEach(acc => {
        const accSnaps = followerSnapshots
          .filter(s => s.social_account_id === acc.id)
          .sort((a, b) => new Date(a.observation_timestamp).getTime() - new Date(b.observation_timestamp).getTime());

        if (accSnaps.length > 0) {
          const lastSnap = accSnaps[accSnaps.length - 1];
          if (!latestObsDate || new Date(lastSnap.observation_timestamp) > new Date(latestObsDate)) {
            latestObsDate = lastSnap.observation_timestamp;
          }

          // Find baseline snapshot: closest snapshot at or before cutoffDate
          const priorSnaps = accSnaps.filter(s => s.observation_timestamp <= cutoffIso);
          if (priorSnaps.length > 0) {
            baselineTotal += priorSnaps[priorSnaps.length - 1].follower_count;
            baselineAccountsFound++;
          } else if (accSnaps.length >= 2) {
            // If account was created within the window, use earliest snapshot as baseline
            baselineTotal += accSnaps[0].follower_count;
            baselineAccountsFound++;
          }
        }
      });

      let netChange: number | null = null;
      let pctChange: number | null = null;
      let statusNote: string | null = null;

      if (!hasAnyAccount) {
        statusNote = 'No accounts linked';
      } else if (!hasCurrentFollowers) {
        statusNote = 'No follower counts entered';
      } else if (baselineAccountsFound === 0) {
        statusNote = 'Not enough history yet';
      } else {
        netChange = currentTotal - baselineTotal;
        if (baselineTotal > 0) {
          pctChange = Number(((netChange / baselineTotal) * 100).toFixed(1));
        }
      }

      return {
        platform,
        accountsCount: platAccounts.length,
        currentFollowers: hasCurrentFollowers ? currentTotal : null,
        netChange,
        pctChange,
        statusNote,
        latestObsDate
      };
    });
  }, [accounts, followerSnapshots, growthTimeRange]);

  // Overall Total Followers & KPI Calculations
  const stats = useMemo(() => {
    const published = posts.filter(p => p.status === 'published');
    const totalImpressions = published.reduce((sum, p) => sum + (p.impressions || 0), 0);
    const totalReach = published.reduce((sum, p) => sum + (p.reach || 0), 0);
    const totalInteractions = published.reduce((sum, p) => {
      return sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
    }, 0);

    const validRates = published
      .map(p => p.engagement_rate)
      .filter((r): r is number => r !== null && r !== undefined);

    const avgEngagement = validRates.length
      ? Number((validRates.reduce((a, b) => a + b, 0) / validRates.length).toFixed(2))
      : null;

    const activeAccs = accounts.filter(a => a.status === 'active');

    // Sum latest follower counts across all active accounts
    let totalFollowers = 0;
    let accountsWithFollowers = 0;
    activeAccs.forEach(a => {
      if (a.current_followers !== undefined && a.current_followers !== null) {
        totalFollowers += a.current_followers;
        accountsWithFollowers++;
      }
    });

    const pendingRefreshes = accounts.filter(a => a.last_refresh_status === 'checking').length;

    return {
      totalPosts: posts.length,
      publishedPosts: published.length,
      totalImpressions,
      totalReach,
      totalInteractions,
      avgEngagement,
      activeAccounts: activeAccs.length,
      totalFollowers: accountsWithFollowers > 0 ? totalFollowers : 0,
      pendingRefreshes
    };
  }, [posts, accounts]);

  // Handle Account Save
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount.platform || !editingAccount.display_name || !editingAccount.profile_url) {
      setNotice({ type: 'error', text: 'Platform, display name, and public profile URL are required.' });
      return;
    }

    try {
      const isEdit = !!editingAccount.id;
      const res = await fetch('/api/marketing/social-economy/accounts', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingAccount,
          follower_count: editingAccount.follower_count ? Number(editingAccount.follower_count) : null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save account');

      setNotice({
        type: 'success',
        text: isEdit ? 'Account updated.' : 'Account created. Public enrichment running in background.'
      });
      setAccountModalOpen(false);
      setEditingAccount({
        platform: 'linkedin',
        display_name: '',
        profile_url: '',
        follower_count: '',
        notes: ''
      });
      await reloadData();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message });
    }
  };

  // Handle Post Save
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost?.title || !editingPost?.platform) {
      setNotice({ type: 'error', text: 'Title and platform are required.' });
      return;
    }

    try {
      const isEdit = !!editingPost.id;
      const res = await fetch('/api/marketing/social-economy/posts', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPost)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save post');

      setNotice({ type: 'success', text: isEdit ? 'Post updated.' : 'Post created.' });
      setPostModalOpen(false);
      setEditingPost(null);
      await reloadData();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message });
    }
  };

  // Handle Manual Metrics Save
  const handleSaveMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostForMetrics) return;

    try {
      const res = await fetch('/api/marketing/social-economy/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          social_post_id: selectedPostForMetrics.id,
          social_account_id: selectedPostForMetrics.social_account_id,
          ...metricsDraft
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save metrics');

      setNotice({ type: 'success', text: 'Metric snapshot recorded.' });
      setMetricsModalOpen(false);
      setSelectedPostForMetrics(null);
      await reloadData();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message });
    }
  };

  // Trigger Refresh All
  const handleRefresh = async (accountId?: number) => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/marketing/social-economy/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          refreshAll: !accountId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refresh failed');

      setNotice({
        type: 'info',
        text: accountId ? 'Account refreshed.' : `Refreshed ${data.refreshedCount} accounts.`
      });
      await reloadData();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  // CSV Parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvError('');
    setCsvPreviewRows([]);
    setCsvHeaders([]);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least one data row.');
      }

      const parseLine = (line: string) => {
        const out: string[] = [];
        let cur = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"' && line[i + 1] === '"' && quoted) {
            cur += '"';
            i++;
          } else if (c === '"') {
            quoted = !quoted;
          } else if (c === ',' && !quoted) {
            out.push(cur);
            cur = '';
          } else {
            cur += c;
          }
        }
        out.push(cur);
        return out;
      };

      const rawHeaders = parseLine(lines[0]).map(h => h.trim());
      setCsvHeaders(rawHeaders);

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseLine(lines[i]);
        const rowObj: Record<string, string> = {};
        rawHeaders.forEach((h, idx) => {
          rowObj[h.toLowerCase().replace(/[\s-]+/g, '_')] = vals[idx] ? vals[idx].trim() : '';
        });

        const pick = (...keys: string[]) => {
          for (const k of keys) {
            if (rowObj[k] !== undefined && rowObj[k] !== '') return rowObj[k];
          }
          return '';
        };

        const title = pick('title', 'post_title', 'post', 'name');
        const platform = pick('platform', 'channel', 'network') || 'linkedin';
        const date = pick('date', 'published_at', 'scheduled_date');
        const impressions = pick('impressions', 'views');
        const likes = pick('likes', 'reactions');
        const comments = pick('comments');
        const shares = pick('shares', 'reposts');
        const followers = pick('followers', 'follower_count');

        rows.push({
          title: title || `Imported record ${i}`,
          platform,
          caption: pick('caption', 'content', 'text'),
          profile: pick('profile', 'account', 'social_account'),
          date,
          status: pick('status') || 'published',
          post_url: pick('url', 'permalink', 'post_url'),
          followers: followers ? Number(followers.replace(/,/g, '')) : undefined,
          impressions: impressions ? Number(impressions.replace(/,/g, '')) : undefined,
          likes: likes ? Number(likes.replace(/,/g, '')) : undefined,
          comments: comments ? Number(comments.replace(/,/g, '')) : undefined,
          shares: shares ? Number(shares.replace(/,/g, '')) : undefined
        });
      }

      setCsvPreviewRows(rows);
    } catch (err: any) {
      setCsvError(err.message || 'Failed to read CSV file.');
    }
  };

  const handleCommitImport = async () => {
    if (!csvPreviewRows.length || !csvFile) return;
    try {
      setImporting(true);
      const res = await fetch('/api/marketing/social-economy/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: csvFile.name,
          rows: csvPreviewRows,
          updateMatching: true
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setNotice({
        type: 'success',
        text: `Import complete: ${data.importedCount} added, ${data.updatedCount} updated, ${data.failedCount} errors.`
      });
      setCsvFile(null);
      setCsvPreviewRows([]);
      await reloadData();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent =
      'title,platform,profile,date,status,followers,impressions,reach,likes,comments,shares,clicks,url\n' +
      '"Product Launch Update","linkedin","LucidMediax","2026-10-15","published",8200,1800,1400,95,12,18,34,"https://linkedin.com"\n' +
      '"Engineering Showcase","x","Brand X","2026-10-15","published",4800,3200,2800,120,18,45,80,"https://x.com"\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'social_economy_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPosts = () => {
    if (!posts.length) return;
    const headers = [
      'id',
      'title',
      'platform',
      'account_name',
      'status',
      'scheduled_at',
      'published_at',
      'impressions',
      'reach',
      'likes',
      'comments',
      'shares',
      'clicks',
      'engagement_rate',
      'metric_source',
      'post_url'
    ];
    const rows = posts.map(p => [
      p.id,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      p.platform,
      `"${(p.account_name || '').replace(/"/g, '""')}"`,
      p.status,
      p.scheduled_at || '',
      p.published_at || '',
      p.impressions ?? '',
      p.reach ?? '',
      p.likes ?? '',
      p.comments ?? '',
      p.shares ?? '',
      p.clicks ?? '',
      p.engagement_rate ?? '',
      p.metric_source || '',
      `"${(p.post_url || '').replace(/"/g, '""')}"`
    ]);

    const csvStr = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veya_social_economy_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visiblePosts = useMemo(() => {
    return posts.filter(p => {
      if (selectedPlatform !== 'all' && p.platform !== selectedPlatform) return false;
      if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          p.title.toLowerCase().includes(q) ||
          (p.caption && p.caption.toLowerCase().includes(q)) ||
          (p.account_name && p.account_name.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [posts, selectedPlatform, selectedStatus, searchQuery]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide">Loading Social Economy...</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout user={currentUser}>
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Top Header - Cleaned & Product-Focused */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <Share2 className="w-4 h-4" />
              <span>Marketing Department</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Social Economy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Unified social media planning, follower growth, performance analytics, and public enrichment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh All'}</span>
            </button>
            <button
              onClick={() => {
                setEditingAccount({
                  platform: 'linkedin',
                  display_name: '',
                  profile_url: '',
                  follower_count: '',
                  notes: ''
                });
                setAccountModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all"
            >
              <Link2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>+ Add Account</span>
            </button>
            <button
              onClick={() => {
                setEditingPost({
                  platform: 'linkedin',
                  title: '',
                  caption: '',
                  status: 'draft',
                  scheduled_at: new Date().toISOString().split('T')[0]
                });
                setPostModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Post</span>
            </button>
          </div>
        </div>

        {/* Notice alert */}
        {notice && (
          <div
            className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-medium border ${
              notice.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : notice.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPI Cards Grid - Cleaned (Removed Data Mode, Added Total Followers) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Followers</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {stats.totalFollowers.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Across {stats.activeAccounts} profiles</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Posts</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{stats.totalPosts}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{stats.publishedPosts} Published</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Impressions</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{stats.totalImpressions.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Recorded views</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Reach</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{stats.totalReach.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Unique audience</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Interactions</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{stats.totalInteractions.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Likes + comments + shares</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Avg Engagement</span>
            <span className="text-xl font-black text-indigo-600 mt-1 block">
              {stats.avgEngagement !== null ? `${stats.avgEngagement}%` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Interactions / Views</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Jobs</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{stats.pendingRefreshes}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Background checks</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Overview & Charts
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'posts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Content Planner & Posts ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'accounts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Social Accounts ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Performance & Rates
          </button>
          <button
            onClick={() => setActiveTab('import_export')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'import_export'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            CSV Ingestion & Export
          </button>
        </div>

        {/* TAB 1: OVERVIEW & CHARTS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Visual Charts Row: Responsive 3-Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* Card 1: Platform Performance Comparison */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="font-bold text-sm text-slate-900">Platform Performance</h3>
                    <select
                      value={metricForChart}
                      onChange={e => setMetricForChart(e.target.value as any)}
                      className="text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-hidden"
                    >
                      <option value="impressions">Impressions</option>
                      <option value="reach">Reach</option>
                      <option value="interactions">Interactions</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Aggregated by social channel</p>

                  <div className="space-y-3">
                    {(['linkedin', 'x', 'instagram', 'facebook', 'reddit'] as Platform[]).map(plat => {
                      const platPosts = posts.filter(p => p.platform === plat && p.status === 'published');
                      const val = platPosts.reduce((sum, p) => {
                        if (metricForChart === 'impressions') return sum + (p.impressions || 0);
                        if (metricForChart === 'reach') return sum + (p.reach || 0);
                        return sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
                      }, 0);

                      const maxVal = Math.max(
                        1,
                        ...(['linkedin', 'x', 'instagram', 'facebook', 'reddit'] as Platform[]).map(pl => {
                          return posts
                            .filter(p => p.platform === pl && p.status === 'published')
                            .reduce((sum, p) => {
                              if (metricForChart === 'impressions') return sum + (p.impressions || 0);
                              if (metricForChart === 'reach') return sum + (p.reach || 0);
                              return sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
                            }, 0);
                        })
                      );

                      const pct = Math.min(100, (val / maxVal) * 100);

                      return (
                        <div key={plat} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: platformMeta[plat].color }}
                              />
                              {platformMeta[plat].label}
                            </span>
                            <span className="text-slate-900 font-mono text-[11px]">{val.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: platformMeta[plat].color
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 text-[11px] text-slate-400">
                  Based on published post metrics.
                </div>
              </div>

              {/* Card 2: Post Distribution Donut */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Post Distribution</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Share of recorded posts by channel</p>

                  <div className="py-4 flex flex-col items-center justify-center">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                        {(() => {
                          let accumulatedPercent = 0;
                          const total = Math.max(1, posts.length);
                          return (['linkedin', 'x', 'instagram', 'facebook', 'reddit'] as Platform[]).map(plat => {
                            const count = posts.filter(p => p.platform === plat).length;
                            const pct = (count / total) * 100;
                            const strokeDasharray = `${pct} ${100 - pct}`;
                            const strokeDashoffset = -accumulatedPercent;
                            accumulatedPercent += pct;
                            if (pct === 0) return null;
                            return (
                              <circle
                                key={plat}
                                cx="18"
                                cy="18"
                                r="15.915"
                                fill="transparent"
                                stroke={platformMeta[plat].color}
                                strokeWidth="4"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-xl font-black text-slate-900 block leading-tight">{posts.length}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Posts</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  {(['linkedin', 'x', 'instagram', 'facebook', 'reddit'] as Platform[]).map(plat => {
                    const count = posts.filter(p => p.platform === plat).length;
                    const pct = posts.length ? Math.round((count / posts.length) * 100) : 0;
                    return (
                      <div key={plat} className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: platformMeta[plat].color }} />
                        <span className="truncate">{platformMeta[plat].label}:</span>
                        <span className="font-bold text-slate-900">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Follower Growth (New Feature Beside Donut) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-bold text-sm text-slate-900">Follower Growth</h3>
                    {/* Time-Range Segmented Control */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                      {([30, 60, 90] as const).map(days => (
                        <button
                          key={days}
                          onClick={() => setGrowthTimeRange(days)}
                          className={`px-2 py-1 rounded-md transition-all ${
                            growthTimeRange === days
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {days}D
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Net changes across the last {growthTimeRange} days</p>

                  <div className="space-y-2.5">
                    {platformGrowthData.map(g => (
                      <div
                        key={g.platform}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: platformMeta[g.platform].color }}
                          />
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">
                              {platformMeta[g.platform].label}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {g.accountsCount} {g.accountsCount === 1 ? 'account' : 'accounts'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-slate-900 block font-mono text-xs">
                            {g.currentFollowers !== null ? g.currentFollowers.toLocaleString() : '—'}
                          </span>
                          {g.statusNote ? (
                            <span className="text-[10px] text-slate-400 italic block">{g.statusNote}</span>
                          ) : g.netChange !== null ? (
                            <div className="flex items-center justify-end gap-1 text-[11px] font-semibold">
                              {g.netChange >= 0 ? (
                                <span className="text-emerald-600 flex items-center font-mono">
                                  +{g.netChange.toLocaleString()}
                                  {g.pctChange !== null && ` (+${g.pctChange}%)`}
                                </span>
                              ) : (
                                <span className="text-red-600 flex items-center font-mono">
                                  {g.netChange.toLocaleString()}
                                  {g.pctChange !== null && ` (${g.pctChange}%)`}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Persisted snapshot history</span>
                  <button
                    onClick={() => setActiveTab('accounts')}
                    className="font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Update Counts →
                  </button>
                </div>
              </div>

            </div>

            {/* Top-Performing Posts Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Top-Performing Published Posts</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ranked by engagement rate and recorded impressions</p>
                </div>
                <button
                  onClick={() => setActiveTab('posts')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  View All Posts →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 pr-4">Post & Caption</th>
                      <th className="py-2.5 pr-4">Platform</th>
                      <th className="py-2.5 pr-4">Date</th>
                      <th className="py-2.5 pr-4 text-right">Impressions</th>
                      <th className="py-2.5 pr-4 text-right">Interactions</th>
                      <th className="py-2.5 pr-4 text-right">Engagement</th>
                      <th className="py-2.5 text-right">Provenance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {posts
                      .filter(p => p.status === 'published')
                      .sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0))
                      .slice(0, 5)
                      .map(p => {
                        const interactions = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 pr-4 max-w-xs">
                              <span className="font-bold text-slate-900 block truncate">{p.title}</span>
                              {p.caption && (
                                <span className="text-[11px] text-slate-500 block truncate">{p.caption}</span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${platformMeta[p.platform].bg}`}
                              >
                                {platformMeta[p.platform].label}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-slate-600 font-mono">
                              {p.published_at ? p.published_at.split('T')[0] : '—'}
                            </td>
                            <td className="py-3 pr-4 text-right font-mono text-slate-900">
                              {p.impressions !== undefined ? p.impressions.toLocaleString() : '—'}
                            </td>
                            <td className="py-3 pr-4 text-right font-mono text-slate-900">
                              {interactions.toLocaleString()}
                            </td>
                            <td className="py-3 pr-4 text-right">
                              <span className="font-bold text-indigo-600 font-mono">
                                {p.engagement_rate !== null && p.engagement_rate !== undefined
                                  ? `${p.engagement_rate}%`
                                  : '—'}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                {p.metric_source || 'manual'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    {posts.filter(p => p.status === 'published').length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No published posts found. Mark planned posts as published or import a CSV.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POSTS & CONTENT PLANNER */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search posts..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden w-48 sm:w-64"
                  />
                </div>
                <select
                  value={selectedPlatform}
                  onChange={e => setSelectedPlatform(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-hidden"
                >
                  <option value="all">All Platforms</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="x">X (Twitter)</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="reddit">Reddit</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-hidden"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="planned">Planned</option>
                  <option value="reminder_due">Reminder Due</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPosts}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visiblePosts.map(p => (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${platformMeta[p.platform].bg}`}
                      >
                        {platformMeta[p.platform].label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.status === 'planned'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : p.status === 'reminder_due'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{p.title}</h4>
                    {p.caption && (
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{p.caption}</p>
                    )}

                    {p.account_name && (
                      <span className="text-[11px] text-slate-400 block">
                        Account: <strong className="text-slate-600">{p.account_name}</strong>
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    {p.impressions !== undefined && (
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Impressions</span>
                          <span className="font-bold text-slate-900">{p.impressions.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Likes</span>
                          <span className="font-bold text-slate-900">{p.likes ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Rate</span>
                          <span className="font-bold text-indigo-600">
                            {p.engagement_rate !== null && p.engagement_rate !== undefined
                              ? `${p.engagement_rate}%`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingPost(p);
                            setPostModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                          title="Edit post"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPostForMetrics(p);
                            setMetricsDraft({
                              impressions: p.impressions !== undefined ? String(p.impressions) : '',
                              reach: p.reach !== undefined ? String(p.reach) : '',
                              likes: p.likes !== undefined ? String(p.likes) : '',
                              comments: p.comments !== undefined ? String(p.comments) : '',
                              shares: p.shares !== undefined ? String(p.shares) : '',
                              clicks: p.clicks !== undefined ? String(p.clicks) : '',
                              saves: p.saves !== undefined ? String(p.saves) : '',
                              snapshot_date: new Date().toISOString().split('T')[0],
                              notes: ''
                            });
                            setMetricsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 bg-indigo-50 rounded-lg"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Log Metrics</span>
                        </button>
                      </div>

                      {p.post_url && (
                        <a
                          href={p.post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {visiblePosts.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  No posts match the selected filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SOCIAL ACCOUNTS */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Configured Social Profiles</h3>
                <p className="text-xs text-slate-500">
                  Profiles automatically trigger background verification. Update follower counts manually or via CSV.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingAccount({
                    platform: 'linkedin',
                    display_name: '',
                    profile_url: '',
                    follower_count: '',
                    notes: ''
                  });
                  setAccountModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Account</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {accounts.map(acc => (
                <div
                  key={acc.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${platformMeta[acc.platform].bg}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: platformMeta[acc.platform].color }}
                        />
                        {platformMeta[acc.platform].label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          acc.last_refresh_status === 'updated'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : acc.last_refresh_status === 'checking'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                            : acc.last_refresh_status === 'access_restricted'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {acc.last_refresh_status ? acc.last_refresh_status.replace(/_/g, ' ') : 'idle'}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900">{acc.display_name}</h4>
                    <a
                      href={acc.profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline break-all block truncate"
                    >
                      {acc.profile_url}
                    </a>

                    {/* Followers Display */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Current Followers
                        </span>
                        <span className="text-base font-black text-slate-900 font-mono">
                          {acc.current_followers !== undefined && acc.current_followers !== null
                            ? acc.current_followers.toLocaleString()
                            : 'Not set'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingAccount({
                            ...acc,
                            follower_count: acc.current_followers ? String(acc.current_followers) : ''
                          });
                          setAccountModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Update Count
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                      {acc.last_successful_check_at ? (
                        <div>
                          Last Verified:{' '}
                          <span className="font-mono text-emerald-700">
                            {new Date(acc.last_successful_check_at).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        acc.last_refreshed_at && (
                          <div>
                            Last Checked:{' '}
                            <span className="font-mono text-slate-600">
                              {new Date(acc.last_refreshed_at).toLocaleString()}
                            </span>
                          </div>
                        )
                      )}
                      {acc.last_refresh_message && (
                        <div className="text-[10px] text-slate-400 italic leading-snug">
                          {acc.last_refresh_message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleRefresh(acc.id)}
                      disabled={refreshing}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingAccount({
                            ...acc,
                            follower_count: acc.current_followers ? String(acc.current_followers) : ''
                          });
                          setAccountModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  No social accounts configured yet. Click "+ Add Account" to link your first public profile.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PERFORMANCE & RATES */}
        {activeTab === 'analytics' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Consolidated Performance Metrics</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Engagement Rate formula: <code>(Likes + Comments + Shares) / Impressions × 100</code>
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 pr-4">Post Title</th>
                    <th className="py-2.5 pr-4">Platform</th>
                    <th className="py-2.5 pr-4 text-right">Impressions</th>
                    <th className="py-2.5 pr-4 text-right">Reach</th>
                    <th className="py-2.5 pr-4 text-right">Likes</th>
                    <th className="py-2.5 pr-4 text-right">Comments</th>
                    <th className="py-2.5 pr-4 text-right">Shares</th>
                    <th className="py-2.5 pr-4 text-right">Clicks</th>
                    <th className="py-2.5 pr-4 text-right">Engagement</th>
                    <th className="py-2.5 text-right">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {posts
                    .filter(p => p.status === 'published')
                    .map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-4 font-bold text-slate-900 max-w-xs truncate">{p.title}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${platformMeta[p.platform].bg}`}
                          >
                            {platformMeta[p.platform].label}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-slate-800">
                          {p.impressions !== undefined ? p.impressions.toLocaleString() : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-slate-800">
                          {p.reach !== undefined ? p.reach.toLocaleString() : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-slate-800">{p.likes ?? '—'}</td>
                        <td className="py-3 pr-4 text-right font-mono text-slate-800">{p.comments ?? '—'}</td>
                        <td className="py-3 pr-4 text-right font-mono text-slate-800">{p.shares ?? '—'}</td>
                        <td className="py-3 pr-4 text-right font-mono text-slate-800">{p.clicks ?? '—'}</td>
                        <td className="py-3 pr-4 text-right font-mono font-bold text-indigo-600">
                          {p.engagement_rate !== null && p.engagement_rate !== undefined
                            ? `${p.engagement_rate}%`
                            : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            {p.metric_source || 'manual'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: CSV INGESTION & EXPORT */}
        {activeTab === 'import_export' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">CSV Import Wizard</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload exports from social platforms, follower counts, or client spreadsheets
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample Template</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-3">
                <FileUp className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <label className="cursor-pointer font-bold text-indigo-600 hover:text-indigo-800 text-xs">
                    <span>Click to browse file</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-500"> or drag and drop your .csv</span>
                </div>
                {csvFile && (
                  <div className="text-xs font-semibold text-slate-700 bg-slate-50 p-2 rounded-lg inline-block">
                    Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {csvError && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl">{csvError}</div>}

              {csvPreviewRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Previewing {csvPreviewRows.length} rows</span>
                    <span className="text-slate-400">Showing first 5 rows</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold">
                        <tr>
                          <th className="p-2">Title</th>
                          <th className="p-2">Platform</th>
                          <th className="p-2">Followers</th>
                          <th className="p-2 text-right">Views</th>
                          <th className="p-2 text-right">Likes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvPreviewRows.slice(0, 5).map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 font-medium text-slate-800 truncate max-w-xs">{r.title}</td>
                            <td className="p-2 capitalize">{r.platform}</td>
                            <td className="p-2 font-mono">{r.followers ?? '—'}</td>
                            <td className="p-2 text-right font-mono">{r.impressions ?? '—'}</td>
                            <td className="p-2 text-right font-mono">{r.likes ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        setCsvPreviewRows([]);
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCommitImport}
                      disabled={importing}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                    >
                      {importing ? 'Importing...' : `Confirm & Ingest ${csvPreviewRows.length} Records`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Export & Backup</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download all workspace social posts, scheduled publications, and recorded metrics
                </p>
                <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="font-bold text-slate-800">Export Details:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Includes both manual logs and CSV-imported snapshots.</li>
                    <li>Survives deployments and browser restarts.</li>
                    <li>Format: UTF-8 standard RFC-4180 CSV.</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handleExportPosts}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Full Dataset ({posts.length} Posts)</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT ACCOUNT (Cleaned: No Client Assoc, No Collection Mode, Follower Input Added) */}
        {accountModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">
                  {editingAccount.id ? 'Edit Social Account' : 'Add Social Account'}
                </h3>
                <button onClick={() => setAccountModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Platform</label>
                  <select
                    value={editingAccount.platform}
                    onChange={e => setEditingAccount({ ...editingAccount, platform: e.target.value as Platform })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-hidden"
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X (Twitter)</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="reddit">Reddit</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Account Display Name</label>
                  <input
                    type="text"
                    value={editingAccount.display_name || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, display_name: e.target.value })}
                    placeholder="e.g. LucidMediax Global"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Public Profile URL</label>
                  <input
                    type="url"
                    value={editingAccount.profile_url || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, profile_url: e.target.value })}
                    placeholder="https://www.linkedin.com/company/example"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Current Follower Count</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingAccount.follower_count ?? ''}
                    onChange={e => setEditingAccount({ ...editingAccount, follower_count: e.target.value })}
                    placeholder="e.g. 8200"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Baseline follower count saved to history and updated automatically via background verification.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Notes & Tags</label>
                  <input
                    type="text"
                    value={editingAccount.notes || ''}
                    onChange={e => setEditingAccount({ ...editingAccount, notes: e.target.value })}
                    placeholder="e.g. enterprise brand, tech vertical"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAccountModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-xs"
                  >
                    Save Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CREATE / EDIT POST */}
        {postModalOpen && editingPost && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">{editingPost.id ? 'Edit Post' : 'Create Post'}</h3>
                <button onClick={() => setPostModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSavePost} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Post Title</label>
                  <input
                    type="text"
                    value={editingPost.title || ''}
                    onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
                    placeholder="e.g. Product Update"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Caption / Copy</label>
                  <textarea
                    rows={4}
                    value={editingPost.caption || ''}
                    onChange={e => setEditingPost({ ...editingPost, caption: e.target.value })}
                    placeholder="Write copy or notes for the social post..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Platform</label>
                    <select
                      value={editingPost.platform}
                      onChange={e => setEditingPost({ ...editingPost, platform: e.target.value as Platform })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-hidden"
                    >
                      <option value="linkedin">LinkedIn</option>
                      <option value="x">X</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="reddit">Reddit</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status</label>
                    <select
                      value={editingPost.status || 'draft'}
                      onChange={e => setEditingPost({ ...editingPost, status: e.target.value as PostStatus })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-hidden"
                    >
                      <option value="draft">Draft</option>
                      <option value="planned">Planned</option>
                      <option value="reminder_due">Reminder Due</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Social Account</label>
                  <select
                    value={editingPost.social_account_id || ''}
                    onChange={e =>
                      setEditingPost({
                        ...editingPost,
                        social_account_id: e.target.value ? Number(e.target.value) : null
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-hidden"
                  >
                    <option value="">Select an account</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.display_name} ({platformMeta[a.platform].label})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date</label>
                    <input
                      type="date"
                      value={editingPost.scheduled_at ? editingPost.scheduled_at.split('T')[0] : ''}
                      onChange={e => setEditingPost({ ...editingPost, scheduled_at: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Post URL (Optional)</label>
                    <input
                      type="url"
                      value={editingPost.post_url || ''}
                      onChange={e => setEditingPost({ ...editingPost, post_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPostModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-xs"
                  >
                    Save Post
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: LOG MANUAL METRICS */}
        {metricsModalOpen && selectedPostForMetrics && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Log Performance Metrics</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{selectedPostForMetrics.title}</p>
                </div>
                <button onClick={() => setMetricsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveMetrics} className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Impressions / Views</label>
                    <input
                      type="number"
                      value={metricsDraft.impressions}
                      onChange={e => setMetricsDraft({ ...metricsDraft, impressions: e.target.value })}
                      placeholder="e.g. 1500"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Reach (Unique)</label>
                    <input
                      type="number"
                      value={metricsDraft.reach}
                      onChange={e => setMetricsDraft({ ...metricsDraft, reach: e.target.value })}
                      placeholder="e.g. 1200"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Likes</label>
                    <input
                      type="number"
                      value={metricsDraft.likes}
                      onChange={e => setMetricsDraft({ ...metricsDraft, likes: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Comments</label>
                    <input
                      type="number"
                      value={metricsDraft.comments}
                      onChange={e => setMetricsDraft({ ...metricsDraft, comments: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Shares</label>
                    <input
                      type="number"
                      value={metricsDraft.shares}
                      onChange={e => setMetricsDraft({ ...metricsDraft, shares: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Clicks</label>
                    <input
                      type="number"
                      value={metricsDraft.clicks}
                      onChange={e => setMetricsDraft({ ...metricsDraft, clicks: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Snapshot Date</label>
                    <input
                      type="date"
                      value={metricsDraft.snapshot_date}
                      onChange={e => setMetricsDraft({ ...metricsDraft, snapshot_date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMetricsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-xs"
                  >
                    Record Snapshot
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
