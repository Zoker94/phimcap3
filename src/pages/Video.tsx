import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { VideoGrid } from '@/components/VideoGrid';
import { VideoComments } from '@/components/VideoComments';
import { Button } from '@/components/ui/button';
import { Crown, Eye, Calendar, ArrowLeft, Lock } from 'lucide-react';

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

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Limit max resolution for non-VIP users to 720p
      if (!isVip) {
        u.searchParams.set('maxResolution', '720');
      }

      return u.toString();
    } catch {
      // Fallback: do a simple string replace if URL constructor fails
      let url = video.video_url.replace('iframe.mediadelivery.net/play/', 'iframe.mediadelivery.net/embed/');
      if (!isVip) {
        url += (url.includes('?') ? '&' : '?') + 'maxResolution=720';
      }
      return url;
    }
  })();

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
        {/* Video Player */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
          {video.video_type === 'bunny' ? (
            <iframe
              src={bunnyEmbedUrl || video.video_url}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              style={{ border: 'none' }}
            />
          ) : (
            <video
              src={video.video_url}
              className="w-full h-full"
              controls
              poster={video.thumbnail_url || undefined}
            />
          )}
          
          {/* Quality indicator for non-VIP users */}
          {!isVip && (
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