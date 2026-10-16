/**
 * VEYA Social Economy - Compliant Public Data Retrieval Layer
 * 
 * Rules:
 * - Ordinary HTTP/HTTPS only for sources that permit public retrieval.
 * - Strict SSRF protection: block private/loopback/cloud metadata IP ranges.
 * - Platform awareness:
 *   - LinkedIn: Protected by auth walls & terms prohibiting unauthorized automated collection. Requires manual entry or CSV.
 *   - Reddit: Restricts automated scraping under commercial policies and bot walls. Requires manual entry or CSV.
 *   - Instagram / Facebook: Enforces strict login walls and does not permit unauthenticated public follower scraping.
 *   - X: Profiles/posts require authenticated API or redirect scrapers to login walls.
 *   - Open Permitted Public Endpoints: Safely inspects permissible public endpoints with strict timeouts, SSRF filters, and headers.
 */

export interface CrawlResult {
  status: 'checking' | 'updated' | 'no_new_data' | 'unsupported_source' | 'access_restricted' | 'retry_later' | 'error';
  platform: 'x' | 'facebook' | 'instagram' | 'linkedin' | 'reddit' | 'unknown';
  provenance: string;
  recordsInspected: number;
  recordsUpdated: number;
  observedFollowers?: number | null;
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

    // Check common private IPv4 ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x AWS/metadata)
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
 * Attempts a compliant public retrieval for an eligible social account or profile URL.
 */
export async function performCompliantPublicRefresh(
  platform: 'x' | 'facebook' | 'instagram' | 'linkedin' | 'reddit',
  profileUrl: string,
  postUrls: string[] = []
): Promise<CrawlResult> {
  if (!isSafePublicHttpUrl(profileUrl)) {
    return {
      status: 'error',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 0,
      recordsUpdated: 0,
      errorMessage: 'The provided profile URL is invalid or targets an internal/private address.'
    };
  }

  // Handle platforms where automated unauthenticated retrieval is restricted by terms or auth walls
  if (platform === 'linkedin') {
    return {
      status: 'access_restricted',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: 'LinkedIn restricts unauthenticated automated crawling and requires official login. Use manual follower updates or CSV imports.'
    };
  }

  if (platform === 'reddit') {
    return {
      status: 'access_restricted',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: 'Reddit restricts automated public scraping under its data access policies. Use manual follower updates or CSV imports.'
    };
  }

  if (platform === 'instagram' || platform === 'facebook') {
    return {
      status: 'access_restricted',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: `${platform === 'instagram' ? 'Instagram' : 'Facebook'} enforces login walls for public metrics. Use manual follower updates or CSV imports.`
    };
  }

  if (platform === 'x') {
    return {
      status: 'access_restricted',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: 'X (formerly Twitter) disallows automated public crawlers without authenticated API tokens. Use manual follower updates or CSV imports.'
    };
  }

  // Fallback for general permitted public endpoints (e.g. open RSS, public blog feeds, oEmbed)
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
        status: resp.status === 403 || resp.status === 401 ? 'access_restricted' : 'error',
        platform,
        provenance: 'public_crawl',
        recordsInspected: 1,
        recordsUpdated: 0,
        errorMessage: `Source returned HTTP status ${resp.status} (${resp.statusText})`
      };
    }

    return {
      status: 'no_new_data',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: 'Public page responded, but no structured public follower count was available without platform API access.'
    };
  } catch (err: any) {
    return {
      status: err.name === 'AbortError' ? 'retry_later' : 'error',
      platform,
      provenance: 'public_crawl',
      recordsInspected: 1,
      recordsUpdated: 0,
      errorMessage: err.message || 'Network request failed or timed out.'
    };
  }
}
