import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Check, Sparkles, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function VipPurchase() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const isVip = profile?.membership_status === 'vip' && 
    profile?.vip_expires_at && 
    new Date(profile.vip_expires_at) > new Date();

  const daysRemaining = isVip && profile?.vip_expires_at
    ? Math.ceil((new Date(profile.vip_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để mua VIP');
      navigate('/login');
      return;
    }

    if ((profile?.balance || 0) < 100000) {
      toast.error('Số dư không đủ. Vui lòng nạp thêm tiền.');
      return;
    }

    setLoading(true);
    try {
      // Calculate new expiry date
      const currentExpiry = profile?.vip_expires_at ? new Date(profile.vip_expires_at) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + 3);

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          balance: (profile?.balance || 0) - 100000,
          membership_status: 'vip',
          vip_expires_at: newExpiry.toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Nâng cấp VIP thành công! Chúc bạn xem phim vui vẻ 🎉');
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showCategories={false}>
      <div className="max-w-2xl mx-auto py-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Nâng cấp VIP</h1>
          <p className="text-muted-foreground text-sm">
            Trải nghiệm xem phim chất lượng cao không giới hạn
          </p>
        </div>

        {isVip && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-yellow-600 dark:text-yellow-400">
                    Bạn đang là thành viên VIP
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Còn {daysRemaining} ngày sử dụng
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                Gói phổ biến
              </span>
            </div>
            <CardTitle className="text-xl">VIP 3 Tháng</CardTitle>
            <CardDescription>Truy cập toàn bộ nội dung VIP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                100.000<span className="text-lg font-normal text-muted-foreground">đ</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">~33.000đ/tháng</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-3 w-3 text-green-500" />
                </div>
                <span>Xem video chất lượng <strong>1080p Full HD</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-3 w-3 text-green-500" />
                </div>
                <span>Truy cập <strong>toàn bộ video VIP</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-3 w-3 text-green-500" />
                </div>
                <span>Không quảng cáo khi xem</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-3 w-3 text-green-500" />
                </div>
                <span>Hỗ trợ ưu tiên 24/7</span>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              {user && (
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Số dư: </span>
                  <span className={`font-medium ${(profile?.balance || 0) >= 100000 ? 'text-green-500' : 'text-red-500'}`}>
                    {(profile?.balance || 0).toLocaleString()}đ
                  </span>
                </div>
              )}

              <Button 
                onClick={handlePurchase} 
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white"
                size="lg"
              >
                {loading ? (
                  'Đang xử lý...'
                ) : isVip ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Gia hạn thêm 3 tháng
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Mua VIP ngay
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  Bạn cần <a href="/login" className="text-primary hover:underline">đăng nhập</a> để mua VIP
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Thanh toán an toàn & bảo mật</span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Không có VIP? Bạn vẫn xem được video miễn phí ở chất lượng 720p
          </p>
        </div>
      </div>
    </Layout>
  );
}
