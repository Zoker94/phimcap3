import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
  html?: string;
};

type ScrapeOptions = {
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[];
  onlyMainContent?: boolean;
  waitFor?: number;
};

export const firecrawlApi = {
  async scrape(url: string, options?: ScrapeOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
      body: { url, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};

// Extract video URLs from HTML content
export function extractVideoUrls(html: string): { iframeUrls: string[]; directUrls: string[] } {
  const iframeUrls: string[] = [];
  const directUrls: string[] = [];

  // Extract iframe src URLs
  const iframeRegex = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = iframeRegex.exec(html)) !== null) {
    const url = match[1];
    if (isVideoUrl(url)) {
      iframeUrls.push(url);
    }
  }

  // Extract video source URLs
  const videoSrcRegex = /<(?:video|source)[^>]*src=["']([^"']+)["'][^>]*>/gi;
  while ((match = videoSrcRegex.exec(html)) !== null) {
    const url = match[1];
    if (isVideoUrl(url)) {
      directUrls.push(url);
    }
  }

  // Extract embed URLs from common video hosts
  const embedPatterns = [
    /(?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/embed\/|player\.vimeo\.com\/video\/|dailymotion\.com\/embed\/|ok\.ru\/videoembed\/|vk\.com\/video_ext\.php|streamable\.com\/[oe]\/|pornhub\.com\/embed\/|xvideos\.com\/embedframe\/|xnxx\.com\/embedframe\/)[^\s"'<>]+/gi,
    /(?:https?:)?\/\/[^\s"'<>]*(?:\.mp4|\.m3u8|\.webm|\.ogg)[^\s"'<>]*/gi,
    /(?:https?:)?\/\/(?:iframe\.mediadelivery\.net|video-[a-z0-9]+\.xx\.fbcdn\.net|[a-z0-9-]+\.googlevideo\.com)[^\s"'<>]+/gi,
  ];

  for (const pattern of embedPatterns) {
    while ((match = pattern.exec(html)) !== null) {
      const url = match[0].startsWith('//') ? 'https:' + match[0] : match[0];
      if (!iframeUrls.includes(url) && !directUrls.includes(url)) {
        if (url.includes('.mp4') || url.includes('.m3u8') || url.includes('.webm')) {
          directUrls.push(url);
        } else {
          iframeUrls.push(url);
        }
      }
    }
  }

  return { iframeUrls, directUrls };
}

function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /youtube\.com|youtu\.be/i,
    /vimeo\.com/i,
    /dailymotion\.com/i,
    /player\./i,
    /embed/i,
    /video/i,
    /\.mp4|\.m3u8|\.webm|\.ogg/i,
    /mediadelivery\.net/i,
    /streamable\.com/i,
    /ok\.ru/i,
    /vk\.com/i,
  ];
  return videoPatterns.some(pattern => pattern.test(url));
}

// Extract thumbnail from HTML
export function extractThumbnail(html: string): string | null {
  // Try og:image first
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImageMatch) return ogImageMatch[1];

  // Try twitter:image
  const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
  if (twitterImageMatch) return twitterImageMatch[1];

  // Try poster attribute on video
  const posterMatch = html.match(/<video[^>]*poster=["']([^"']+)["']/i);
  if (posterMatch) return posterMatch[1];

  return null;
}

// Extract title from HTML
export function extractTitle(html: string): string | null {
  // Try og:title first
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch) return decodeHtmlEntities(ogTitleMatch[1]);

  // Try title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return decodeHtmlEntities(titleMatch[1]);

  // Try h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return decodeHtmlEntities(h1Match[1]);

  return null;
}

// Extract description from HTML
export function extractDescription(html: string): string | null {
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogDescMatch) return decodeHtmlEntities(ogDescMatch[1]);

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) return decodeHtmlEntities(descMatch[1]);

  return null;
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };
  return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
}
