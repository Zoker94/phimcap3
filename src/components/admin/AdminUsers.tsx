import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Ban, Crown, Key, DollarSign, Search, UserX, UserCheck } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  balance: number;
  membership_status: 'free' | 'vip';
  is_banned: boolean;
  created_at: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialogs
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.user_id.includes(searchQuery)
  );

  const toggleBan = async (user: Profile) => {
    const newStatus = !user.is_banned;
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: newStatus })
      .eq('id', user.id);
    
    if (error) {
      toast.error('Lỗi cập nhật trạng thái');
    } else {
      toast.success(newStatus ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      fetchUsers();
    }
  };

  const toggleVip = async (user: Profile) => {
    const newStatus = user.membership_status === 'vip' ? 'free' : 'vip';
    const { error } = await supabase
      .from('profiles')
      .update({ membership_status: newStatus })
      .eq('id', user.id);
    
    if (error) {
      toast.error('Lỗi cập nhật VIP');
    } else {
      toast.success(newStatus === 'vip' ? 'Đã nâng cấp VIP' : 'Đã hủy VIP');
      fetchUsers();
    }
  };

  const openBalanceDialog = (user: Profile) => {
    setSelectedUser(user);
    setNewBalance(user.balance.toString());
    setBalanceDialogOpen(true);
  };

  const updateBalance = async () => {
    if (!selectedUser) return;
    setSubmitting(true);

    const { error } = await supabase
      .from('profiles')
      .update({ balance: parseFloat(newBalance) || 0 })
      .eq('id', selectedUser.id);
    
    if (error) {
      toast.error('Lỗi cập nhật số dư');
    } else {
      toast.success('Đã cập nhật số dư');
      setBalanceDialogOpen(false);
      fetchUsers();
    }
    setSubmitting(false);
  };

  const openPasswordDialog = (user: Profile) => {
    setSelectedUser(user);
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const updatePassword = async () => {
    if (!selectedUser || !newPassword) return;
    setSubmitting(true);

    // Note: This requires admin access which is handled server-side
    // For now, we'll show a message that this needs backend implementation
    toast.info('Chức năng đổi mật khẩu cần được cấu hình ở backend');
    setPasswordDialogOpen(false);
    setSubmitting(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo email hoặc ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <p className="text-sm text-muted-foreground">{filteredUsers.length} thành viên</p>

      <div className="space-y-2">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium truncate">{user.username || 'No name'}</p>
                    {user.membership_status === 'vip' && (
                      <Badge variant="secondary" className="h-4 text-[10px] bg-yellow-500/20 text-yellow-600">
                        VIP
                      </Badge>
                    )}
                    {user.is_banned && (
                      <Badge variant="destructive" className="h-4 text-[10px]">
                        Banned
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Số dư: {user.balance.toLocaleString()}đ
                  </p>
                </div>
                
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => toggleVip(user)}
                    title={user.membership_status === 'vip' ? 'Hủy VIP' : 'Nâng cấp VIP'}
                  >
                    <Crown className={`h-3 w-3 ${user.membership_status === 'vip' ? 'text-yellow-500' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openBalanceDialog(user)}
                    title="Cộng tiền"
                  >
                    <DollarSign className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openPasswordDialog(user)}
                    title="Đổi mật khẩu"
                  >
                    <Key className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 ${user.is_banned ? 'text-green-500' : 'text-destructive'}`}
                    onClick={() => toggleBan(user)}
                    title={user.is_banned ? 'Mở khóa' : 'Khóa'}
                  >
                    {user.is_banned ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Balance Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Cập nhật số dư</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Số dư mới (VNĐ)</Label>
              <Input
                type="number"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Button onClick={updateBalance} className="w-full h-8 text-sm" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Cập nhật'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Đổi mật khẩu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Mật khẩu mới</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-8 text-sm"
                placeholder="Nhập mật khẩu mới"
              />
            </div>
            <Button onClick={updatePassword} className="w-full h-8 text-sm" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}