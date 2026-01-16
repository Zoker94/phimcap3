import { useState, useRef, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  User, 
  Camera, 
  Save, 
  Crown,
  Calendar,
  Shield,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Profile() {
  const { user, profile, isAdmin, loading, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form values when profile loads
  useEffect(() => {
    if (profile && !initialized) {
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
      setDateOfBirth(profile.date_of_birth || '');
      setInitialized(true);
    }
  }, [profile, initialized]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File ảnh không được vượt quá 2MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // If bucket doesn't exist, use a placeholder URL
        console.error('Upload error:', uploadError);
        toast.error('Không thể tải lên ảnh. Vui lòng thử lại sau.');
        setUploadingAvatar(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success('Đã tải lên ảnh đại diện');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Có lỗi xảy ra khi tải ảnh');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const updates: { 
        username?: string; 
        avatar_url?: string;
        date_of_birth?: string | null;
      } = {};

      if (username.trim()) {
        updates.username = username.trim();
      }

      if (avatarUrl) {
        updates.avatar_url = avatarUrl;
      }

      if (dateOfBirth) {
        updates.date_of_birth = dateOfBirth;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Đã cập nhật thông tin cá nhân');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Có lỗi xảy ra khi cập nhật');
    } finally {
      setSaving(false);
    }
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

  const isVip = profile?.membership_status === 'vip' && profile?.vip_expires_at && new Date(profile.vip_expires_at) > new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="relative">
                <User className="w-6 h-6 text-primary" />
                <Sparkles className="w-3 h-3 text-warning absolute -top-1 -right-1" />
              </div>
              <h1 className="font-bold text-lg">Quản lý tài khoản</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-lg mx-auto px-4 py-6">
        {/* Avatar Section */}
        <Card className="mb-6">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Ảnh đại diện</CardTitle>
            <CardDescription>Nhấp vào ảnh để thay đổi</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div 
              className="relative cursor-pointer group"
              onClick={handleAvatarClick}
            >
              <Avatar className={cn(
                "w-28 h-28 ring-4 transition-all",
                isVip ? "ring-yellow-500/50" : isAdmin ? "ring-red-500/50" : "ring-border"
              )}>
                <AvatarImage src={avatarUrl || ''} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-3xl">
                  {(profile?.username || user.email)?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>

              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Badge */}
              {isVip && (
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full p-1.5">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              )}
              {isAdmin && !isVip && (
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full p-1.5">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarChange}
            />

            <div className="mt-3 flex items-center gap-2">
              {isVip && (
                <span className="px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30 text-xs font-medium text-yellow-500 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  VIP Member
                </span>
              )}
              {isAdmin && (
                <span className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full border border-red-500/30 text-xs font-medium text-red-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thông tin cá nhân</CardTitle>
            <CardDescription>Cập nhật thông tin của bạn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email || ''}
                disabled
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">Email không thể thay đổi</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Biệt danh</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập biệt danh của bạn"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Ngày sinh
              </Label>
              <Input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Lưu thay đổi
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Thông tin tài khoản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Số dư</span>
              <span className="font-medium text-green-600">
                {(profile?.balance || 0).toLocaleString()}đ
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Trạng thái</span>
              <span className={cn(
                "font-medium",
                isVip ? "text-yellow-500" : "text-muted-foreground"
              )}>
                {isVip ? 'VIP Member' : 'Thường'}
              </span>
            </div>
            {isVip && profile?.vip_expires_at && (
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">VIP hết hạn</span>
                <span className="font-medium text-yellow-500">
                  {new Date(profile.vip_expires_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
