import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { MessageCircle, Sparkles } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

// Categories to hide from navigation
const HIDDEN_CATEGORIES = ['hanh-dong', 'tinh-cam', 'chat', 'tro-chuyen'];

export function CategoryTabs() {
  const [categories, setCategories] = useState<Category[]>([]);
  const location = useLocation();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (data) {
        // Filter out hidden categories
        setCategories(data.filter(cat => 
          !HIDDEN_CATEGORIES.some(hidden => cat.slug.toLowerCase().includes(hidden))
        ));
      }
    };

    fetchCategories();
  }, []);

  const isActive = (slug: string) => {
    return location.pathname === `/category/${slug}`;
  };

  const isHome = location.pathname === '/';
  const isChat = location.pathname === '/chat';

  return (
    <div className="overflow-x-auto scrollbar-hide border-b border-border">
      <div className="flex gap-1 px-3 py-2 min-w-max">
        <Link
          to="/"
          className={cn(
            "px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap",
            isHome
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          )}
        >
          Trang chủ
        </Link>

        {/* Chat Tab - moved to second position */}
        <Link
          to="/chat"
          className={cn(
            "px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap flex items-center gap-1.5",
            isChat
              ? "bg-gradient-to-r from-primary to-accent text-primary-foreground"
              : "bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 text-primary border border-primary/20"
          )}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Trò chuyện
          <Sparkles className="w-3 h-3 text-yellow-400" />
        </Link>
        
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className={cn(
              "px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap",
              isActive(cat.slug)
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
