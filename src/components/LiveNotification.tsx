import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Bell, AlertTriangle, CheckCircle, Crown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

export function LiveNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch existing active notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) {
        setNotifications(data);
      }
    };

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('live-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev].slice(0, 5));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const updated = payload.new as Notification & { is_active: boolean };
          if (!updated.is_active) {
            setNotifications((prev) => prev.filter((n) => n.id !== updated.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismissNotification = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const visibleNotifications = notifications.filter((n) => !dismissed.has(n.id));

  if (visibleNotifications.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-6 w-6" />;
      case 'success':
        return <CheckCircle className="h-6 w-6" />;
      case 'vip':
        return <Crown className="h-6 w-6" />;
      default:
        return <Info className="h-6 w-6" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400';
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400';
      case 'vip':
        return 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400';
      default:
        return 'bg-primary/10 border-primary/30 text-primary';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
      <div className="space-y-3 w-full max-w-lg">
        {visibleNotifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              'pointer-events-auto rounded-xl border-2 px-6 py-5 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-300',
              getStyles(notification.type)
            )}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-1">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xl">{notification.title}</p>
                <p className="text-base opacity-90 mt-2 leading-relaxed">{notification.message}</p>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="shrink-0 p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
