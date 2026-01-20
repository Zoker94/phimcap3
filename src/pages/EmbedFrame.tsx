import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Video {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
}

export default function EmbedFrame() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;

      const { data } = await supabase
        .from('videos')
        .select('id, title, video_url, thumbnail_url')
        .eq('id', id)
        .single();
      
      if (data) {
        setVideo(data);
        
        // Increment view count - fire and forget
        supabase
          .from('videos')
          .select('views')
          .eq('id', id)
          .single()
          .then(({ data: viewData }) => {
            if (viewData) {
              supabase
                .from('videos')
                .update({ views: (viewData.views || 0) + 1 })
                .eq('id', id)
                .then(() => {});
            }
          });
      }
      setLoading(false);
    };

    fetchVideo();
  }, [id]);

  // Check if this is a Bunny Stream embed URL
  const isBunnyStream = video?.video_url?.includes('iframe.mediadelivery.net') || 
                        video?.video_url?.includes('video.bunnycdn.com');

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

      if (!u.searchParams.has('autoplay')) u.searchParams.set('autoplay', 'false');
      
      // Embedded videos are capped at 720p
      u.searchParams.set('maxResolution', '720');
      u.searchParams.set('showQualitySelector', 'false');

      return u.toString();
    } catch {
      let url = video.video_url.replace('iframe.mediadelivery.net/play/', 'iframe.mediadelivery.net/embed/');
      const extra = 'maxResolution=720&showQualitySelector=false';
      url += (url.includes('?') ? '&' : '?') + extra;
      return url;
    }
  })();

  if (loading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center text-white text-sm">
        Video không tồn tại
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black">
      {isBunnyStream ? (
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
          src={video.video_url}
          className="w-full h-full"
          controls
          poster={video.thumbnail_url || undefined}
        />
      )}
    </div>
  );
}