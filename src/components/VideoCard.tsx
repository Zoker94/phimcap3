import { Link } from 'react-router-dom';
import { Play, Clock, Eye, Crown } from 'lucide-react';

interface VideoCardProps {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: string | null;
  views: number;
  is_vip: boolean;
}

export function VideoCard({ id, title, thumbnail_url, duration, views, is_vip }: VideoCardProps) {
  return (
    <Link to={`/video/${id}`} className="group block">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center">
            <Play className="h-5 w-5 text-primary-foreground fill-current" />
          </div>
        </div>

        {/* Duration badge */}
        {duration && (
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {duration}
          </div>
        )}

        {/* VIP badge */}
        {is_vip && (
          <div className="absolute top-1 left-1 bg-yellow-500 text-black text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
            <Crown className="h-2.5 w-2.5" />
            VIP
          </div>
        )}
      </div>

      <div className="mt-1.5 px-0.5">
        <h3 className="text-xs font-medium line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
          <Eye className="h-2.5 w-2.5" />
          <span>{views.toLocaleString()} lượt xem</span>
        </div>
      </div>
    </Link>
  );
}