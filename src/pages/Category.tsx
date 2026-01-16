import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      // Fetch category
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (catData) {
        setCategory(catData);

        // Fetch videos in category
        const { data: videoData } = await supabase
          .from('videos')
          .select('id, title, thumbnail_url, duration, views, is_vip')
          .eq('category_id', catData.id)
          .order('created_at', { ascending: false });
        
        if (videoData) {
          setVideos(videoData);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [slug]);

  return (
    <Layout>
      <section>
        <h2 className="text-base font-semibold mb-3">
          {category?.name || 'Đang tải...'}
        </h2>
        <VideoGrid videos={videos} loading={loading} />
      </section>
    </Layout>
  );
}