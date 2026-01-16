import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
}

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
        setCategories(data);
      }
    };

    fetchCategories();
  }, []);

  const isActive = (slug: string) => {
    return location.pathname === `/category/${slug}`;
  };

  const isHome = location.pathname === '/';

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
          Tất cả
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