import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send } from 'lucide-react';

export function TelegramButton() {
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const fetchTelegramLink = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'telegram_link')
        .maybeSingle();
      
      if (data?.value) {
        setTelegramLink(data.value);
      }
    };

    fetchTelegramLink();
  }, []);

  // Check if on chat page and hide button
  useEffect(() => {
    const checkPath = () => {
      setIsHidden(window.location.pathname === '/chat');
    };

    checkPath();
    
    // Listen for URL changes
    window.addEventListener('popstate', checkPath);
    
    // Create observer for URL changes (for SPA navigation)
    const observer = new MutationObserver(checkPath);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('popstate', checkPath);
      observer.disconnect();
    };
  }, []);

  if (!telegramLink || isHidden) return null;

  return (
    <a
      href={telegramLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
      aria-label="Liên hệ qua Telegram"
    >
      <Send className="h-6 w-6" />
    </a>
  );
}
