import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { VideoGrid } from '@/components/VideoGrid';
import { Badge } from '@/components/ui/badge';
import { Search as SearchIcon, Tag } from 'lucide-react';

interface Video {
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

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const tagSlug = searchParams.get('tag') || '';
  const [videos, setVideos] = useState<Video[]>([]);
  const [popularTags, setPopularTags] = useState<TagItem[]>([]);
  const [currentTag, setCurrentTag] = useState<TagItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const searchVideos = async () => {
      setLoading(true);

      // Fetch popular tags
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .order('name')
        .limit(20);
      
      if (tagsData) setPopularTags(tagsData);

      // Search by tag slug
      if (tagSlug) {
        const { data: tagData } = await supabase
          .from('tags')
          .select('*')
          .eq('slug', tagSlug)
          .maybeSingle();
        
        if (tagData) {
          setCurrentTag(tagData);
          
          // Get videos with this tag
          const { data: videoTagsData } = await supabase
            .from('video_tags')
            .select('video_id')
            .eq('tag_id', tagData.id);
          
          if (videoTagsData && videoTagsData.length > 0) {
            const videoIds = videoTagsData.map(vt => vt.video_id);
            const { data: videosData } = await supabase
              .from('videos')
              .select('id, title, thumbnail_url, duration, views, is_vip')
              .in('id', videoIds)
              .order('views', { ascending: false });
            
            if (videosData) setVideos(videosData);
          } else {
            setVideos([]);
          }
        }
        setLoading(false);
        return;
      }

      // Search by query - search in title, description, and tags
      if (!query) {
        setVideos([]);
        setCurrentTag(null);
        setLoading(false);
        return;
      }

      // Search in videos directly
      const { data: directVideos } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, duration, views, is_vip')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('views', { ascending: false });

      // Search in tags and get associated videos
      const { data: matchingTags } = await supabase
        .from('tags')
        .select('id')
        .ilike('name', `%${query}%`);

      let tagVideoIds: string[] = [];
      if (matchingTags && matchingTags.length > 0) {
        const tagIds = matchingTags.map(t => t.id);
        const { data: videoTagsData } = await supabase
          .from('video_tags')
          .select('video_id')
          .in('tag_id', tagIds);
        
        if (videoTagsData) {
          tagVideoIds = videoTagsData.map(vt => vt.video_id);
        }
      }

      // Combine and dedupe results
      const allVideoIds = new Set<string>();
      const allVideos: Video[] = [];
      
      if (directVideos) {
        directVideos.forEach(v => {
          if (!allVideoIds.has(v.id)) {
            allVideoIds.add(v.id);
            allVideos.push(v);
          }
        });
      }

      if (tagVideoIds.length > 0) {
        const { data: tagVideos } = await supabase
          .from('videos')
          .select('id, title, thumbnail_url, duration, views, is_vip')
          .in('id', tagVideoIds)
          .order('views', { ascending: false });
        
        if (tagVideos) {
          tagVideos.forEach(v => {
            if (!allVideoIds.has(v.id)) {
              allVideoIds.add(v.id);
              allVideos.push(v);
            }
          });
        }
      }

      setVideos(allVideos);
      setCurrentTag(null);
      setLoading(false);
    };

    searchVideos();
  }, [query, tagSlug]);

  return (
    <Layout>
      {/* SEO Meta for tag pages */}
      {currentTag && (
        <title>{`${currentTag.name} - Xem video ${currentTag.name}`}</title>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          {currentTag ? (
            <>
              <Tag className="h-4 w-4 text-primary" />
              <h1 className="text-base font-semibold">
                Từ khóa: {currentTag.name}
              </h1>
            </>
          ) : (
            <>
              <SearchIcon className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-base font-semibold">
                Kết quả tìm kiếm: "{query}"
              </h1>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Tìm thấy {videos.length} video
        </p>

        {/* Popular Tags */}
        {popularTags.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Từ khóa phổ biến:</p>
            <div className="flex flex-wrap gap-1.5">
              {popularTags.map((tag) => (
                <Link key={tag.id} to={`/search?tag=${tag.slug}`}>
                  <Badge 
                    variant={currentTag?.id === tag.id ? "default" : "secondary"} 
                    className="text-[10px] cursor-pointer hover:bg-primary/80"
                  >
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        <VideoGrid videos={videos} loading={loading} />
      </section>
    </Layout>
  );
}