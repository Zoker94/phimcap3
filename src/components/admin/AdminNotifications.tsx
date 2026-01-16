import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Bell, Trash2, Send, Info, AlertTriangle, CheckCircle, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    const { error } = await supabase.from('notifications').insert({
      title: title.trim(),
      message: message.trim(),
      type,
    });

    if (error) {
      toast.error('Lỗi gửi thông báo');
    } else {
      toast.success('Đã gửi thông báo');
      setTitle('');
      setMessage('');
      setType('info');
      fetchNotifications();
    }
    setSending(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (!error) {
      fetchNotifications();
    }
  };

  const deleteNotification = async (id: string) => {
    if (!confirm('Xác nhận xóa thông báo này?')) return;
    
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      toast.error('Lỗi xóa thông báo');
    } else {
      toast.success('Đã xóa');
      fetchNotifications();
    }
  };

  const getIcon = (notifType: string) => {
    switch (notifType) {
      case 'warning': return <AlertTriangle className="h-3 w-3" />;
      case 'success': return <CheckCircle className="h-3 w-3" />;
      case 'vip': return <Crown className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  const getTypeColor = (notifType: string) => {
    switch (notifType) {
      case 'warning': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      case 'vip': return 'text-yellow-500';
      default: return 'text-primary';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Send notification form */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={sendNotification} className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Gửi thông báo mới</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tiêu đề</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tiêu đề thông báo..."
                  className="h-8 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Loại</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">
                      <span className="flex items-center gap-2">
                        <Info className="h-3 w-3 text-primary" />
                        Thông tin
                      </span>
                    </SelectItem>
                    <SelectItem value="success">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Thành công
                      </span>
                    </SelectItem>
                    <SelectItem value="warning">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        Cảnh báo
                      </span>
                    </SelectItem>
                    <SelectItem value="vip">
                      <span className="flex items-center gap-2">
                        <Crown className="h-3 w-3 text-yellow-500" />
                        VIP
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Nội dung</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nội dung thông báo..."
                rows={2}
                className="text-sm resize-none"
                required
              />
            </div>
            
            <Button type="submit" size="sm" className="w-full h-8 text-xs" disabled={sending}>
              <Send className="h-3 w-3 mr-1.5" />
              {sending ? 'Đang gửi...' : 'Gửi thông báo'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification history */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{notifications.length} thông báo</p>
        
        {notifications.map((notif) => (
          <Card key={notif.id} className={cn('overflow-hidden', !notif.is_active && 'opacity-50')}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className={cn('shrink-0 mt-0.5', getTypeColor(notif.type))}>
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-1">{notif.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {new Date(notif.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={notif.is_active}
                    onCheckedChange={() => toggleActive(notif.id, notif.is_active)}
                    className="scale-75"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => deleteNotification(notif.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {notifications.length === 0 && (
          <p className="text-center py-8 text-xs text-muted-foreground">Chưa có thông báo nào</p>
        )}
      </div>
    </div>
  );
}
