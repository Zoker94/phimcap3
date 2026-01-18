import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { VideoGrid } from '@/components/VideoGrid';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: string | null;
  views: number;
  is_vip: boolean;
  is_vietsub: boolean;
  is_uncensored: boolean;
}

const Index = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, duration, views, is_vip, is_vietsub, is_uncensored')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (data) {
        setVideos(data);
      }
      setLoading(false);
    };

    fetchVideos();
  }, []);

  return (
    <Layout>
      <section>
        <h2 className="text-base font-semibold mb-3">Video mới nhất</h2>
        <VideoGrid videos={videos} loading={loading} />
      </section>
    </Layout>
  );
};

export default Index;