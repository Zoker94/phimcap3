import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { VideoGrid } from '@/components/VideoGrid';
import { Search as SearchIcon } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: string | null;
  views: number;
  is_vip: boolean;
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const searchVideos = async () => {
      if (!query) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, duration, views, is_vip')
        .ilike('title', `%${query}%`)
        .order('views', { ascending: false });
      
      if (data) {
        setVideos(data);
      }
      setLoading(false);
    };

    searchVideos();
  }, [query]);

  return (
    <Layout>
      <section>
        <div className="flex items-center gap-2 mb-3">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">
            Kết quả tìm kiếm: "{query}"
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Tìm thấy {videos.length} video
        </p>
        <VideoGrid videos={videos} loading={loading} />
      </section>
    </Layout>
  );
}