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
  const seenUrls = new Set<string>();

  const addUrl = (url: string, type: 'iframe' | 'direct') => {
    // Clean and normalize URL
    let cleanUrl = url.trim();
    if (cleanUrl.startsWith('//')) {
      cleanUrl = 'https:' + cleanUrl;
    }
    if (!cleanUrl.startsWith('http')) return;
    if (seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    
    if (type === 'iframe') {
      iframeUrls.push(cleanUrl);
    } else {
      directUrls.push(cleanUrl);
    }
  };

  // 1. Extract iframe src URLs
  const iframeRegex = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = iframeRegex.exec(html)) !== null) {
    if (isVideoUrl(match[1])) {
      addUrl(match[1], 'iframe');
    }
  }

  // 2. Extract video/source tag URLs
  const videoSrcRegex = /<(?:video|source)[^>]*src=["']([^"']+)["'][^>]*>/gi;
  while ((match = videoSrcRegex.exec(html)) !== null) {
    addUrl(match[1], 'direct');
  }

  // 3. Extract from data attributes (data-src, data-video-src, etc.)
  const dataAttrRegex = /data-(?:src|video|stream|file|url|source)=["']([^"']+)["']/gi;
  while ((match = dataAttrRegex.exec(html)) !== null) {
    if (isVideoFileUrl(match[1])) {
      addUrl(match[1], 'direct');
    }
  }

  // 4. Extract HLS/M3U8 streams from JavaScript
  const hlsPatterns = [
    /["']([^"']*\.m3u8[^"']*)["']/gi,
    /source\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/gi,
    /file\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/gi,
    /src\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/gi,
  ];
  for (const pattern of hlsPatterns) {
    while ((match = pattern.exec(html)) !== null) {
      addUrl(match[1], 'direct');
    }
  }

  // 5. Extract MP4 URLs from JavaScript
  const mp4Patterns = [
    /["']([^"']*\.mp4[^"']*)["']/gi,
    /["']([^"']*\.webm[^"']*)["']/gi,
    /source\s*[:=]\s*["']([^"']+\.mp4[^"']*)["']/gi,
    /file\s*[:=]\s*["']([^"']+\.mp4[^"']*)["']/gi,
  ];
  for (const pattern of mp4Patterns) {
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1];
      // Filter out obvious non-video files
      if (!url.includes('poster') && !url.includes('thumb') && !url.includes('preview')) {
        addUrl(url, 'direct');
      }
    }
  }

  // 6. Extract embed URLs from common video hosts and CDNs
  const embedPatterns = [
    // Popular video platforms
    /(?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/embed\/|player\.vimeo\.com\/video\/|dailymotion\.com\/embed\/)[^\s"'<>]+/gi,
    // Social video embeds
    /(?:https?:)?\/\/(?:www\.)?(?:ok\.ru\/videoembed\/|vk\.com\/video_ext\.php)[^\s"'<>]+/gi,
    // Video CDNs
    /(?:https?:)?\/\/(?:iframe\.mediadelivery\.net|[a-z0-9-]+\.bunnycdn\.ru|[a-z0-9-]+\.b-cdn\.net)[^\s"'<>]+/gi,
    // Google/Facebook video
    /(?:https?:)?\/\/(?:video-[a-z0-9]+\.xx\.fbcdn\.net|[a-z0-9-]+\.googlevideo\.com)[^\s"'<>]+/gi,
    // Generic stream/player URLs
    /(?:https?:)?\/\/[^\s"'<>]*(?:\/stream\/|\/player\/|\/video\/|\/embed\/)[^\s"'<>]+/gi,
  ];

  for (const pattern of embedPatterns) {
    while ((match = pattern.exec(html)) !== null) {
      const url = match[0];
      if (isVideoFileUrl(url)) {
        addUrl(url, 'direct');
      } else {
        addUrl(url, 'iframe');
      }
    }
  }

  // 7. Extract from JSON data in scripts
  const jsonVideoRegex = /"(?:video_url|videoUrl|src|file|source|stream|hls|mp4)":\s*"([^"]+)"/gi;
  while ((match = jsonVideoRegex.exec(html)) !== null) {
    const url = match[1].replace(/\\/g, '');
    if (isVideoFileUrl(url) || isVideoUrl(url)) {
      addUrl(url, isVideoFileUrl(url) ? 'direct' : 'iframe');
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
    /\/video\//i,
    /\.mp4|\.m3u8|\.webm|\.ogg|\.flv/i,
    /mediadelivery\.net/i,
    /streamable\.com/i,
    /ok\.ru/i,
    /vk\.com/i,
    /bunnycdn/i,
    /b-cdn\.net/i,
    /stream/i,
  ];
  return videoPatterns.some(pattern => pattern.test(url));
}

function isVideoFileUrl(url: string): boolean {
  return /\.(mp4|m3u8|webm|ogg|flv|avi|mov|mkv)/i.test(url);
}

// Extract thumbnail from HTML - enhanced to find thumbnails from multiple sources
export function extractThumbnail(html: string): string | null {
  // 1. Try og:image first (most common)
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogImageMatch && isValidImageUrl(ogImageMatch[1])) return normalizeUrl(ogImageMatch[1]);

  // 2. Try twitter:image
  const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  if (twitterImageMatch && isValidImageUrl(twitterImageMatch[1])) return normalizeUrl(twitterImageMatch[1]);

  // 3. Try poster attribute on video
  const posterMatch = html.match(/<video[^>]*poster=["']([^"']+)["']/i);
  if (posterMatch && isValidImageUrl(posterMatch[1])) return normalizeUrl(posterMatch[1]);

  // 4. Try data-poster or data-thumb attributes
  const dataThumbPatterns = [
    /data-poster=["']([^"']+)["']/i,
    /data-thumb(?:nail)?=["']([^"']+)["']/i,
    /data-preview=["']([^"']+)["']/i,
    /data-image=["']([^"']+)["']/i,
    /data-src=["']([^"']+\.(jpg|jpeg|png|webp|gif)[^"']*)["']/i,
  ];
  for (const pattern of dataThumbPatterns) {
    const match = html.match(pattern);
    if (match && isValidImageUrl(match[1])) return normalizeUrl(match[1]);
  }

  // 5. Try thumbnail URLs in JSON data
  const jsonThumbPatterns = [
    /"(?:thumbnail|thumb|poster|preview|image)(?:_url|Url)?"\s*:\s*"([^"]+)"/gi,
    /'(?:thumbnail|thumb|poster|preview|image)(?:_url|Url)?'\s*:\s*'([^']+)'/gi,
  ];
  for (const pattern of jsonThumbPatterns) {
    const match = pattern.exec(html);
    if (match && isValidImageUrl(match[1])) return normalizeUrl(match[1].replace(/\\/g, ''));
  }

  // 6. Try to find main/featured images with class names
  const imgClassPatterns = [
    /<img[^>]*class=["'][^"']*(?:thumb|poster|preview|cover|featured)[^"']*["'][^>]*src=["']([^"']+)["']/gi,
    /<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*(?:thumb|poster|preview|cover|featured)[^"']*["']/gi,
  ];
  for (const pattern of imgClassPatterns) {
    const match = pattern.exec(html);
    if (match && isValidImageUrl(match[1])) return normalizeUrl(match[1]);
  }

  // 7. Extract from common video platforms (YouTube, Vimeo, etc.)
  const youtubeIdMatch = html.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (youtubeIdMatch) {
    return `https://img.youtube.com/vi/${youtubeIdMatch[1]}/maxresdefault.jpg`;
  }

  const vimeoIdMatch = html.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoIdMatch) {
    // Vimeo requires API call for thumbnail, so we use a placeholder approach
    return `https://vumbnail.com/${vimeoIdMatch[1]}.jpg`;
  }

  // 8. Try to find any large image as fallback
  const allImgsRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const imgCandidates: string[] = [];
  let imgMatch;
  while ((imgMatch = allImgsRegex.exec(html)) !== null) {
    const src = imgMatch[1];
    if (isValidImageUrl(src) && !isIconOrLogo(src)) {
      imgCandidates.push(normalizeUrl(src));
    }
  }
  // Prefer larger dimension images
  const largeImg = imgCandidates.find(url => 
    /(?:large|big|full|hd|1080|720|poster|thumb)/i.test(url) ||
    /(?:width|height|w|h)[=_](?:[4-9]\d\d|\d{4})/i.test(url)
  );
  if (largeImg) return largeImg;
  
  // Return first valid image as last resort
  if (imgCandidates.length > 0) return imgCandidates[0];

  return null;
}

// Helper to check if URL is a valid image URL
function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  // Must contain image extension or be from known image CDNs
  return /\.(jpg|jpeg|png|webp|gif|bmp|avif)/i.test(url) ||
         /\/image[s]?\//i.test(url) ||
         /img\./i.test(url) ||
         /cdn.*\.(jpg|jpeg|png|webp)/i.test(url) ||
         /cloudfront|cloudinary|imgix|unsplash|pexels/i.test(url);
}

// Helper to normalize URL
function normalizeUrl(url: string): string {
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith('//')) {
    cleanUrl = 'https:' + cleanUrl;
  }
  return cleanUrl;
}

// Helper to filter out icons and logos
function isIconOrLogo(url: string): boolean {
  return /(?:favicon|icon|logo|sprite|button|arrow|close|menu|nav|social)/i.test(url) ||
         /(?:\d{1,2}x\d{1,2}|16x|32x|48x|64x)/i.test(url);
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
