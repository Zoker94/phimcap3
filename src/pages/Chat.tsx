import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Send, 
  MessageCircle, 
  Users, 
  Smile,
  Sparkles,
  Crown,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  content: string;
  created_at: string;
  is_vip?: boolean;
  is_admin?: boolean;
}

interface UserInfo {
  user_id: string;
  membership_status: string | null;
  vip_expires_at: string | null;
  is_admin: boolean;
}

const quickEmojis = ['😀', '😂', '😍', '🥰', '😘', '🔥', '❤️', '👍', '👏', '🎉'];

export default function Chat() {
  const { user, profile, isAdmin, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [showEmojis, setShowEmojis] = useState(false);
  const [userInfoMap, setUserInfoMap] = useState<Map<string, UserInfo>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch user info for VIP/Admin status
  const fetchUserInfo = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, membership_status, vip_expires_at')
      .in('user_id', userIds);

    // Get admin roles
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('user_id', userIds)
      .eq('role', 'admin');

    const adminSet = new Set(adminRoles?.map(r => r.user_id) || []);

    const newMap = new Map(userInfoMap);
    profiles?.forEach(p => {
      newMap.set(p.user_id, {
        user_id: p.user_id,
        membership_status: p.membership_status,
        vip_expires_at: p.vip_expires_at,
        is_admin: adminSet.has(p.user_id)
      });
    });

    setUserInfoMap(newMap);
  };

  // Check if user is VIP
  const isVipUser = (userId: string): boolean => {
    const info = userInfoMap.get(userId);
    if (!info) return false;
    return info.membership_status === 'vip' && 
           info.vip_expires_at !== null && 
           new Date(info.vip_expires_at) > new Date();
  };

  // Check if user is Admin
  const isAdminUser = (userId: string): boolean => {
    const info = userInfoMap.get(userId);
    return info?.is_admin || false;
  };

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (data) {
        setMessages(data);
        // Fetch user info for all message authors
        const userIds = [...new Set(data.map(m => m.user_id))];
        fetchUserInfo(userIds);
      }
    };

    fetchMessages();
  }, []);

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
          // Fetch user info if not already cached
          if (!userInfoMap.has(newMsg.user_id)) {
            fetchUserInfo([newMsg.user_id]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userInfoMap]);

  // Presence for online users count
  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel('chat_presence', {
      config: { presence: { key: user.id } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !profile || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');
    setShowEmojis(false);

    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      username: profile.username || 'Ẩn danh',
      avatar_url: profile.avatar_url,
      content: messageContent
    });

    if (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOwnMessage = (messageUserId: string) => user?.id === messageUserId;

  // Get username color class
  const getUsernameColorClass = (userId: string): string => {
    if (isAdminUser(userId)) return "text-red-500 font-bold";
    if (isVipUser(userId)) return "text-yellow-500 font-semibold";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MessageCircle className="w-6 h-6 text-primary" />
                <Sparkles className="w-3 h-3 text-warning absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Trò chuyện</h1>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <Users className="w-3 h-3" />
                  <span>{onlineCount} đang online</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {profile?.membership_status === 'vip' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30">
                <Crown className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-xs font-medium text-yellow-500">VIP</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-center">Chưa có tin nhắn nào</p>
              <p className="text-sm">Hãy bắt đầu cuộc trò chuyện!</p>
            </div>
          ) : (
            messages.map((message) => {
              const msgIsAdmin = isAdminUser(message.user_id);
              const msgIsVip = isVipUser(message.user_id);

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isOwnMessage(message.user_id) && "flex-row-reverse"
                  )}
                >
                  <div className="relative">
                    <Avatar className={cn(
                      "w-9 h-9 shrink-0 ring-2",
                      msgIsAdmin ? "ring-red-500" : msgIsVip ? "ring-yellow-500" : "ring-border"
                    )}>
                      <AvatarImage src={message.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                        {message.username?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {msgIsAdmin && (
                      <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5">
                        <Shield className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {msgIsVip && !msgIsAdmin && (
                      <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                        <Crown className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className={cn(
                    "flex flex-col max-w-[75%]",
                    isOwnMessage(message.user_id) && "items-end"
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs flex items-center gap-1",
                        isOwnMessage(message.user_id) 
                          ? "text-primary font-medium" 
                          : getUsernameColorClass(message.user_id)
                      )}>
                        {msgIsAdmin && !isOwnMessage(message.user_id) && (
                          <Shield className="w-3 h-3 text-red-500" />
                        )}
                        {msgIsVip && !msgIsAdmin && !isOwnMessage(message.user_id) && (
                          <Crown className="w-3 h-3 text-yellow-500" />
                        )}
                        {isOwnMessage(message.user_id) ? 'Bạn' : message.username}
                        {msgIsAdmin && !isOwnMessage(message.user_id) && (
                          <span className="text-[10px] bg-red-500/20 text-red-500 px-1 rounded">Admin</span>
                        )}
                        {msgIsVip && !msgIsAdmin && !isOwnMessage(message.user_id) && (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1 rounded">VIP</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl shadow-sm",
                      isOwnMessage(message.user_id)
                        ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-tr-sm"
                        : msgIsAdmin
                          ? "bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-tl-sm"
                          : msgIsVip
                            ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-tl-sm"
                            : "bg-card border border-border rounded-tl-sm"
                    )}>
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Emoji Picker */}
      {showEmojis && (
        <div className="px-4 py-2 bg-card border-t border-border">
          <div className="flex flex-wrap gap-2 max-w-3xl mx-auto">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-secondary"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur border-t border-border p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setShowEmojis(!showEmojis)}
          >
            <Smile className={cn(
              "w-5 h-5 transition-colors",
              showEmojis && "text-primary"
            )} />
          </Button>
          
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="pr-10 rounded-full bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
              maxLength={500}
            />
          </div>
          
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sending}
            className="shrink-0 rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        
        <p className="text-center text-xs text-muted-foreground mt-2 max-w-3xl mx-auto">
          {newMessage.length}/500 ký tự
        </p>
      </div>
    </div>
  );
}
