import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import defaultPaymentQR from '@/assets/payment-qr.jpg';

interface BankInfo {
  name: string;
  account: string;
  bank: string;
}

export default function Deposit() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentQR, setPaymentQR] = useState<string>(defaultPaymentQR);
  const [displayId, setDisplayId] = useState<number | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    name: 'NGUYEN QUOC DUNG',
    account: '9191919191994',
    bank: 'VietinBank'
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch site settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['deposit_enabled', 'payment_qr_url', 'bank_name', 'bank_account', 'bank_holder']);
      
      if (settingsData) {
        const depositEnabled = settingsData.find(s => s.key === 'deposit_enabled');
        setIsEnabled(depositEnabled?.value === 'true');
        
        const qrUrl = settingsData.find(s => s.key === 'payment_qr_url');
        if (qrUrl?.value) {
          setPaymentQR(qrUrl.value);
        }

        const bankName = settingsData.find(s => s.key === 'bank_name')?.value;
        const bankAccount = settingsData.find(s => s.key === 'bank_account')?.value;
        const bankHolder = settingsData.find(s => s.key === 'bank_holder')?.value;
        
        if (bankName || bankAccount || bankHolder) {
          setBankInfo({
            bank: bankName || 'VietinBank',
            account: bankAccount || '9191919191994',
            name: bankHolder || 'NGUYEN QUOC DUNG'
          });
        }
      }

      // Fetch user's display_id if logged in
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileData?.display_id) {
          setDisplayId(profileData.display_id);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Đã sao chép!');
    setTimeout(() => setCopiedField(null), 2000);
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
                  onClick={() => copyToClipboard(bankInfo.account, 'account')}
                  className="h-8 w-8 p-0"
                >
                  {copiedField === 'account' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Ngân hàng</p>
                  <p className="font-medium text-sm">{bankInfo.bank}</p>
                </div>
              </div>

              {/* Transfer Content with User ID */}
              <div className="flex items-center justify-between p-2 bg-primary/10 border border-primary/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Nội dung chuyển khoản</p>
                  <p className="font-bold text-sm text-primary">
                    {user && displayId ? displayId : 'Đăng nhập để xem ID'}
                  </p>
                </div>
                {user && displayId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(displayId.toString(), 'transfer')}
                    className="h-8 w-8 p-0"
                  >
                    {copiedField === 'transfer' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                <strong>Lưu ý:</strong> Vui lòng ghi chính xác nội dung chuyển khoản là ID của bạn để hệ thống tự động cộng tiền.
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
