import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Advertisement {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string;
  position: string;
  display_order: number;
}

export function PopupAdvertisement() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  const { data: advertisements } = useQuery({
    queryKey: ['advertisements', 'popup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('position', 'popup')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Advertisement[];
    }
  });

  useEffect(() => {
    if (advertisements && advertisements.length > 0) {
      // Show popup after 2 seconds delay every time
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [advertisements]);

  if (!advertisements || advertisements.length === 0) {
    return null;
  }

  const currentAd = advertisements[currentAdIndex];

  const handleNext = () => {
    if (currentAdIndex < advertisements.length - 1) {
      setCurrentAdIndex(prev => prev + 1);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Ad content */}
          <a
            href={currentAd.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="block"
          >
            {currentAd.image_url ? (
              <img
                src={currentAd.image_url}
                alt={currentAd.title}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <div className="p-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg text-center">
                <h3 className="text-xl font-bold text-primary-foreground mb-2">
                  {currentAd.title}
                </h3>
                <p className="text-primary-foreground/80 text-sm">
                  Nhấn để xem chi tiết
                </p>
              </div>
            )}
          </a>

          {/* Navigation for multiple ads */}
          {advertisements.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {advertisements.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentAdIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentAdIndex 
                      ? 'bg-primary' 
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
