/**
 * VEYA Social Economy - Compliant Public Data Retrieval Layer
 * 
 * Rules:
 * - Ordinary HTTP/HTTPS only for sources that permit public retrieval.
 * - Strict SSRF protection: block private/loopback/cloud metadata IP ranges.
 * - Platform awareness:
 *   - Reddit: Automated unauthenticated scraping is restricted/blocked by bot walls. Requires Manual / CSV mode.
 *   - LinkedIn: Protected by auth walls & terms prohibiting unauthorized automated collection. Requires Manual / CSV mode.
 *   - Facebook / Instagram: Protected by login walls & terms prohibiting automated collection without partner APIs. Requires Manual / CSV mode.
 *   - X: Profiles/posts require authenticated API or return login prompts for web crawlers.
 *   - Open Web / Permitted RSS / Open Graph / oEmbed: Safely inspects permissible public endpoints with strict timeouts & rate limits.
 */

export interface CrawlResult {
  status: 'success' | 'no_metrics_found' | 'unsupported_source' | 'restricted_or_blocked' | 'invalid_url' | 'network_error';
  platform: 'x' | 'facebook' | 'instagram' | 'linkedin' | 'reddit' | 'unknown';
  provenance: string;
  recordsInspected: number;
  recordsUpdated: number;
  errorMessage?: string;
  data?: {
    impressions?: number;
    reach?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    clicks?: number;
    title?: string;
    publishedAt?: string;
  };
}

/**
 * Validates URLs and blocks private/local network ranges to protect against SSRF.
 */
export function isSafePublicHttpUrl(inputUrl: string): boolean {
  try {
    const parsed = new URL(inputUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();

    // Check loopback & local hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1'
    ) {
      return false;
    }

    // Check common private IPv4 ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x AWS/metadata)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const octet1 = parseInt(match[1], 10);
      const octet2 = parseInt(match[2], 10);
      if (octet1 === 10) return false;
      if (octet1 === 127) return false;
      if (octet1 === 169 && octet2 === 254) return false; // Metadata IP
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
      if (octet1 === 192 && octet2 === 168) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Identifies the platform based on URL hostname.
 */
export function detectPlatformFromUrl(urlStr: string): 'x' | 'facebook' | 'instagram' | 'linkedin' | 'reddit' | 'unknown' {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('twitter.com') || host.includes('x.com')) return 'x';
    if (host.includes('facebook.com') || host.includes('fb.com')) return 'facebook';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('reddit.com')) return 'reddit';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Attempts a compliant public retrieval for an eligible social account or post URL.
 */
export async function performCompliantPublicRefresh(
  platform: 'x' | 'facebook' | 'instagram' | 'linkedin' | 'reddit',
  profileUrl: string,
  postUrls: string[] = []
): Promise<CrawlResult> {
  if (!isSafePublicHttpUrl(profileUrl)) {
    return {
      status: 'invalid_url',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 0,
      recordsUpdated: 0,
      errorMessage: 'The provided profile URL is invalid or targets a non-public/internal address.'
    };
  }

  // Handle platforms where automated unauthenticated retrieval is restricted or blocked
  if (platform === 'linkedin') {
    return {
      status: 'restricted_or_blocked',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: 'LinkedIn restricts unauthenticated automated crawling and requires authentication/OAuth. Use Manual entry or CSV import for LinkedIn analytics.'
    };
  }

  if (platform === 'reddit') {
    return {
      status: 'restricted_or_blocked',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: 'Reddit restricts automated scraping under its commercial data policies. Use Manual entry or CSV import for Reddit metrics.'
    };
  }

  if (platform === 'instagram' || platform === 'facebook') {
    return {
      status: 'restricted_or_blocked',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: `${platform === 'instagram' ? 'Instagram' : 'Facebook'} enforces strict login walls and does not permit unauthenticated public data extraction. Use CSV import or Manual analytics entry.`
    };
  }

  if (platform === 'x') {
    return {
      status: 'restricted_or_blocked',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: 'X (formerly Twitter) requires authenticated API access to retrieve analytics and disallows unauthenticated scrapers. Use CSV import or Manual entry.'
    };
  }

  // Fallback for general permitted public URLs (e.g. public blogs, RSS feeds, open oEmbed)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const resp = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'VEYA-SocialEconomy-Bot/1.0 (+https://veya.work/legal/acceptable-use)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return {
        status: resp.status === 403 || resp.status === 401 ? 'restricted_or_blocked' : 'network_error',
        platform,
        provenance: 'public_crawl',
        recordsInspected: 1,
        recordsUpdated: 0,
        errorMessage: `Source returned HTTP status ${resp.status} (${resp.statusText})`
      };
    }

    return {
      status: 'no_metrics_found',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: 'Public page responded successfully, but no structured public metrics were available without platform API access.'
    };
  } catch (err: any) {
    return {
      status: err.name === 'AbortError' ? 'network_error' : 'network_error',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: err.message || 'Network request failed or timed out.'
    };
  }
}
