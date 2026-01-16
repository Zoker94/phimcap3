import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import paymentQR from '@/assets/payment-qr.jpg';

export default function Deposit() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [copied, setCopied] = useState(false);

  const bankInfo = {
    name: 'NGUYEN QUOC DUNG',
    account: '9191919191994',
    bank: 'VietinBank'
  };

  useEffect(() => {
    const checkDepositStatus = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'deposit_enabled')
        .maybeSingle();
      
      setIsEnabled(data?.value === 'true');
      setLoading(false);
    };

    checkDepositStatus();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Đã sao chép!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Layout showCategories={false}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!isEnabled) {
    return (
      <Layout showCategories={false}>
        <div className="max-w-md mx-auto py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h1 className="text-xl font-bold mb-2">Tạm ngừng nạp tiền</h1>
          <p className="text-muted-foreground text-sm">
            Chức năng nạp tiền hiện đang bảo trì. Vui lòng quay lại sau.
          </p>
          <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
            Về trang chủ
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showCategories={false}>
      <div className="max-w-md mx-auto py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 mb-3">
            <Wallet className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold mb-1">Nạp tiền</h1>
          <p className="text-muted-foreground text-sm">
            Quét mã QR hoặc chuyển khoản để nạp tiền
          </p>
        </div>

        {user && (
          <Card className="mb-4 border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Số dư hiện tại:</span>
                <span className="font-bold text-green-600">
                  {(profile?.balance || 0).toLocaleString()}đ
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-base">Quét mã QR để nạp tiền</CardTitle>
            <CardDescription className="text-xs">
              Hỗ trợ tất cả ngân hàng qua VietQR
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <img 
                src={paymentQR} 
                alt="Payment QR Code" 
                className="w-full max-w-[280px] rounded-lg shadow-lg"
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Chủ tài khoản</p>
                  <p className="font-medium text-sm">{bankInfo.name}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Số tài khoản</p>
                  <p className="font-medium text-sm">{bankInfo.account}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(bankInfo.account)}
                  className="h-8 w-8 p-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Ngân hàng</p>
                  <p className="font-medium text-sm">{bankInfo.bank}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                <strong>Lưu ý:</strong> Nội dung chuyển khoản ghi: <br />
                <code className="bg-yellow-500/20 px-1 rounded">
                  {user ? profile?.username || user.email : 'Email đăng ký'}
                </code>
              </p>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              Tiền sẽ được cộng vào tài khoản trong vòng 5-15 phút sau khi chuyển khoản thành công.
            </p>

            {!user && (
              <Button 
                className="w-full mt-2" 
                onClick={() => navigate('/login')}
              >
                Đăng nhập để nạp tiền
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
