import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';

interface Advertisement {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string;
  position: string;
  display_order: number;
}

interface AdvertisementBannerProps {
  position: 'sidebar' | 'header' | 'footer' | 'video-page' | 'popup';
  className?: string;
  maxItems?: number;
}

export function AdvertisementBanner({ position, className = '', maxItems }: AdvertisementBannerProps) {
  const { data: advertisements } = useQuery({
    queryKey: ['advertisements', position],
    queryFn: async () => {
      let query = supabase
        .from('advertisements')
        .select('*')
        .eq('position', position)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (maxItems) {
        query = query.limit(maxItems);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Advertisement[];
    }
  });

  if (!advertisements || advertisements.length === 0) {
    return null;
  }

  if (position === 'sidebar') {
    return (
      <div className={`space-y-3 ${className}`}>
        {advertisements.map((ad) => (
          <a
            key={ad.id}
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="rounded-lg overflow-hidden border border-border bg-card hover:border-primary/50 transition-colors">
              {ad.image_url ? (
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  className="w-full h-auto object-cover"
                />
              ) : (
                <div className="p-3 flex items-center gap-2 text-sm">
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <span className="group-hover:text-primary transition-colors">{ad.title}</span>
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    );
  }

  if (position === 'header' || position === 'footer') {
    return (
      <div className={`flex flex-wrap justify-center gap-3 ${className}`}>
        {advertisements.map((ad) => (
          <a
            key={ad.id}
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            {ad.image_url ? (
              <img
                src={ad.image_url}
                alt={ad.title}
                className="h-16 md:h-20 w-auto object-contain rounded-md hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="px-4 py-2 rounded-md bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 hover:border-primary/50 transition-colors">
                <span className="text-sm font-medium">{ad.title}</span>
              </div>
            )}
          </a>
        ))}
      </div>
    );
  }

  if (position === 'video-page') {
    return (
      <div className={`space-y-2 ${className}`}>
        {advertisements.map((ad) => (
          <a
            key={ad.id}
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {ad.image_url ? (
              <img
                src={ad.image_url}
                alt={ad.title}
                className="w-full h-auto object-cover rounded-lg hover:opacity-90 transition-opacity"
              />
            ) : (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 hover:border-primary/50 transition-colors text-center">
                <span className="font-medium">{ad.title}</span>
              </div>
            )}
          </a>
        ))}
      </div>
    );
  }

  return null;
}
