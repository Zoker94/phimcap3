import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { VideoGrid } from '@/components/VideoGrid';
import { VideoComments } from '@/components/VideoComments';
import { AdvertisementBanner } from '@/components/AdvertisementBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Eye, Calendar, ArrowLeft, Tag, Code, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string;
  video_type: string;
  is_vip: boolean;
  views: number;
  duration: string | null;
  created_at: string;
  category_id: string | null;
}

interface Profile {
  membership_status: 'free' | 'vip';
  vip_expires_at: string | null;
}

interface RelatedVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: string | null;
  views: number;
  is_vip: boolean;
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
  const [videoTags, setVideoTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate embed code
  const embedCode = video ? `<iframe src="https://phimcap3.lovable.app/embedframe/${video.id}" frameborder="0" width="510" height="400" scrolling="no" allowfullscreen></iframe>` : '';

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Đã sao chép mã nhúng');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;

      const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (data) {
        setVideo(data);
        
        // Increment view count
        await supabase
          .from('videos')
          .update({ views: (data.views || 0) + 1 })
          .eq('id', id);

        // Fetch video tags
        const { data: tagsData } = await supabase
          .from('video_tags')
          .select('tag_id, tags(id, name, slug)')
          .eq('video_id', id);
        
        if (tagsData) {
          const tags = tagsData.map((vt: any) => vt.tags).filter(Boolean);
          setVideoTags(tags);
        }

        // Fetch related videos
        const { data: related } = await supabase
          .from('videos')
          .select('id, title, thumbnail_url, duration, views, is_vip')
          .neq('id', id)
          .limit(10);
        
        if (related) {
          setRelatedVideos(related);
        }
      }
      setLoading(false);
    };

    fetchVideo();
  }, [id]);

  const isVip = profile?.membership_status === 'vip' && 
    profile?.vip_expires_at && 
    new Date(profile.vip_expires_at) > new Date();

  // Check if this is a Bunny Stream embed URL, iframe embed, or a storage URL
  const isBunnyStream = video?.video_url?.includes('iframe.mediadelivery.net') || 
                        video?.video_url?.includes('video.bunnycdn.com');
  
  // Check if video type is iframe (external embed)
  const isIframeEmbed = video?.video_type === 'iframe';
  // For Bunny Storage URLs (*.b-cdn.net), convert to direct storage access
  const getStorageUrl = (url: string) => {
    try {
      const u = new URL(url);
      // If using Pull Zone CDN that's not configured, try direct storage access
      if (u.hostname.endsWith('.b-cdn.net')) {
        // Extract storage zone from hostname (e.g., zoker941 from zoker941.b-cdn.net)
        const storageZone = u.hostname.split('.')[0];
        // Use Singapore storage endpoint for direct access
        return `https://sg.storage.bunnycdn.com/${storageZone}${u.pathname}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const bunnyEmbedUrl = (() => {
    if (!video?.video_url) return '';

    try {
      const u = new URL(video.video_url);

      // Convert /play/... -> /embed/...
      if (u.hostname === 'iframe.mediadelivery.net') {
        u.pathname = u.pathname.replace(/^\/play\//, '/embed/');
      }

      // Some users paste video.bunnycdn.com/play/...; map to iframe embed.
      if (u.hostname === 'video.bunnycdn.com' && u.pathname.startsWith('/play/')) {
        u.hostname = 'iframe.mediadelivery.net';
        u.pathname = u.pathname.replace(/^\/play\//, '/embed/');
        u.protocol = 'https:';
      }

      // Ensure a stable mobile experience
      if (!u.searchParams.has('autoplay')) u.searchParams.set('autoplay', 'false');

      // Non‑VIP: cap stream to 720p and hide quality selector so they can't pick 1080p
      if (!isVip) {
        u.searchParams.set('maxResolution', '720');
        u.searchParams.set('showQualitySelector', 'false');
      }

      return u.toString();
    } catch {
      // Fallback: do a simple string replace if URL constructor fails
      let url = video.video_url.replace('iframe.mediadelivery.net/play/', 'iframe.mediadelivery.net/embed/');
      if (!isVip) {
        const extra = 'maxResolution=720&showQualitySelector=false';
        url += (url.includes('?') ? '&' : '?') + extra;
      }
      return url;
    }
  })();
  
  // Final video URL - use storage URL for non-stream videos
  const finalVideoUrl = isBunnyStream ? bunnyEmbedUrl : video?.video_url || '';

  if (loading) {
    return (
      <Layout showCategories={false}>
        <div className="animate-pulse space-y-4">
          <div className="aspect-video bg-muted rounded-lg" />
          <div className="h-6 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </Layout>
    );
  }

  if (!video) {
    return (
      <Layout showCategories={false}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Video không tồn tại</p>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Về trang chủ
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showCategories={false}>
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-3 w-3" />
        Quay lại
      </Link>

      <div className="space-y-4">
        {/* Advertisement Banner - Video Page */}
        <AdvertisementBanner position="video-page" className="mb-2" />

        {/* Video Player */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
          {isIframeEmbed ? (
            // External iframe embed (from paste code)
            <iframe
              src={video.video_url}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              scrolling="no"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              style={{ border: 'none' }}
            />
          ) : isBunnyStream ? (
            <iframe
              src={bunnyEmbedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              style={{ border: 'none' }}
            />
          ) : (
            <video
              src={finalVideoUrl}
              className="w-full h-full"
              controls
              poster={video.thumbnail_url || undefined}
            />
          )}
          
          {/* Quality indicator for non-VIP users - only for bunny stream */}
          {!isVip && isBunnyStream && !isIframeEmbed && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
              <span>720p</span>
              <Link to={user ? "/vip" : "/login"} className="text-yellow-400 hover:underline ml-1">
                Nâng cấp VIP để xem 1080p
              </Link>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-base font-semibold line-clamp-2">{video.title}</h1>
            {video.is_vip && (
              <span className="shrink-0 bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-0.5">
                <Crown className="h-3 w-3" />
                VIP
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {video.views.toLocaleString()} lượt xem
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(video.created_at).toLocaleDateString('vi-VN')}
            </span>
          </div>

          {video.description && (
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              {video.description}
            </p>
          )}

          {/* Video Tags */}
          {videoTags.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {videoTags.map((tag) => (
                <Link key={tag.id} to={`/search?tag=${tag.slug}`}>
                  <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-primary/20">
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Embed Code Section */}
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmbed(!showEmbed)}
              className="text-xs gap-1"
            >
              <Code className="h-3 w-3" />
              Mã nhúng
            </Button>
            
            {showEmbed && (
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Sao chép mã nhúng:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyEmbedCode}
                    className="h-7 text-xs gap-1"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Đã sao chép' : 'Sao chép'}
                  </Button>
                </div>
                <code className="block text-[10px] bg-background p-2 rounded border break-all">
                  {embedCode}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <VideoComments videoId={video.id} />

        {/* Related Videos */}
        {relatedVideos.length > 0 && (
          <section className="pt-4 border-t border-border">
            <h2 className="text-sm font-semibold mb-3">Video liên quan</h2>
            <VideoGrid videos={relatedVideos} />
          </section>
        )}
      </div>
    </Layout>
  );
}