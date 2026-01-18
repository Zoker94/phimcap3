import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Settings, Send, QrCode, Upload, Loader2, CreditCard, Video, Cloud, CheckCircle, XCircle, Key } from 'lucide-react';
import { toast } from 'sonner';

interface Setting {
  key: string;
  value: string;
}

interface HostTestResult {
  host: string;
  success: boolean;
  status?: number;
  message: string;
}

interface BunnyTestResult {
  hasApiKey: boolean;
  hasStorageZone: boolean;
  storageZoneName: string | null;
  apiKeyLength: number;
  apiKeyPreview: string | null;
  hostTests: HostTestResult[];
  recommendedHost: string | null;
}

export function AdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [telegramLink, setTelegramLink] = useState('');
  const [uploadingQR, setUploadingQR] = useState(false);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [testingBunny, setTestingBunny] = useState(false);
  const [bunnyTestResult, setBunnyTestResult] = useState<BunnyTestResult | null>(null);
  const [bunnyStorageZone, setBunnyStorageZone] = useState('');
  const [bunnyApiKey, setBunnyApiKey] = useState('');
  const [savingBunny, setSavingBunny] = useState(false);
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value');
    
    if (error) {
      console.error('Error fetching settings:', error);
    } else {
      setSettings(data || []);
      const tgLink = data?.find(s => s.key === 'telegram_link')?.value || '';
      setTelegramLink(tgLink);
      const qrUrl = data?.find(s => s.key === 'payment_qr_url')?.value || '';
      if (qrUrl) setQrPreview(qrUrl);
      
      // Bank info
      setBankName(data?.find(s => s.key === 'bank_name')?.value || '');
      setBankAccount(data?.find(s => s.key === 'bank_account')?.value || '');
      setBankHolder(data?.find(s => s.key === 'bank_holder')?.value || '');
    }
    setLoading(false);
  };

  const updateSetting = async (key: string, value: string) => {
    // Check if setting exists
    const existing = settings.find(s => s.key === key);
    
    if (existing) {
      const { error } = await supabase
        .from('site_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (error) {
        toast.error('Không thể cập nhật cài đặt');
        console.error('Error updating setting:', error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('site_settings')
        .insert({ key, value });

      if (error) {
        toast.error('Không thể tạo cài đặt');
        console.error('Error creating setting:', error);
        return false;
      }
    }

    setSettings(prev => {
      const idx = prev.findIndex(s => s.key === key);
      if (idx >= 0) {
        return prev.map(s => s.key === key ? { ...s, value } : s);
      }
      return [...prev, { key, value }];
    });
    toast.success('Đã cập nhật cài đặt');
    return true;
  };

  const getSettingValue = (key: string): boolean => {
    const setting = settings.find(s => s.key === key);
    return setting?.value === 'true';
  };

  const handleTelegramSave = async () => {
    await updateSetting('telegram_link', telegramLink);
  };

  const handleBankInfoSave = async () => {
    await Promise.all([
      updateSetting('bank_name', bankName),
      updateSetting('bank_account', bankAccount),
      updateSetting('bank_holder', bankHolder)
    ]);
  };

  const handleTestBunny = async () => {
    setTestingBunny(true);
    setBunnyTestResult(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      const response = await supabase.functions.invoke('test-bunny');
      
      if (response.error) {
        toast.error('Không thể kiểm tra kết nối Bunny');
        console.error('Test Bunny error:', response.error);
        return;
      }

      const result = response.data as BunnyTestResult;
      setBunnyTestResult(result);
      
      const hasSuccess = result.hostTests?.some(h => h.success);
      if (hasSuccess) {
        toast.success(`Kết nối Bunny.net thành công! Host: ${result.recommendedHost}`);
      } else {
        const firstError = result.hostTests?.[0]?.message || 'Kết nối thất bại';
        toast.error(firstError);
      }
    } catch (error) {
      console.error('Test Bunny error:', error);
      toast.error('Có lỗi xảy ra khi kiểm tra');
    } finally {
      setTestingBunny(false);
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File ảnh không được lớn hơn 5MB');
      return;
    }

    setUploadingQR(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-qr-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('advertisements')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('advertisements')
        .getPublicUrl(filePath);

      await updateSetting('payment_qr_url', publicUrl.publicUrl);
      setQrPreview(publicUrl.publicUrl);
      toast.success('Đã tải lên mã QR thanh toán');
    } catch (error) {
      console.error('Error uploading QR:', error);
      toast.error('Không thể tải lên ảnh QR');
    } finally {
      setUploadingQR(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Cài đặt hệ thống</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Quản lý các cài đặt chung của website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deposit Toggle */}
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Wallet className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <Label htmlFor="deposit-toggle" className="font-medium text-sm">
                  Trang nạp tiền
                </Label>
                <p className="text-xs text-muted-foreground">
                  Bật/tắt chức năng nạp tiền cho người dùng
                </p>
              </div>
            </div>
            <Switch
              id="deposit-toggle"
              checked={getSettingValue('deposit_enabled')}
              onCheckedChange={(checked) => updateSetting('deposit_enabled', checked.toString())}
            />
          </div>

          {/* Upload Video Toggle */}
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Video className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <Label htmlFor="upload-toggle" className="font-medium text-sm">
                  Upload video
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cho phép thành viên upload video lên hệ thống
                </p>
              </div>
            </div>
            <Switch
              id="upload-toggle"
              checked={getSettingValue('upload_enabled')}
              onCheckedChange={(checked) => updateSetting('upload_enabled', checked.toString())}
            />
          </div>

          {/* Bunny.net Credentials */}
          <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Key className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <Label className="font-medium text-sm">Bunny.net Credentials</Label>
                <p className="text-xs text-muted-foreground">
                  Cấu hình Storage Zone và API Key cho video upload
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Storage Zone Name</Label>
                <Input
                  placeholder="zoker941"
                  value={bunnyStorageZone}
                  onChange={(e) => setBunnyStorageZone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tên Storage Zone (không phải URL)
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">API Key (Password)</Label>
                <Input
                  type="password"
                  placeholder="531d52e9-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={bunnyApiKey}
                  onChange={(e) => setBunnyApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lấy từ Bunny Dashboard → Storage Zone → FTP & API Access → Password (không phải Read-only)
                </p>
              </div>
              <Button 
                onClick={async () => {
                  if (!bunnyStorageZone.trim() || !bunnyApiKey.trim()) {
                    toast.error('Vui lòng nhập đầy đủ Storage Zone và API Key');
                    return;
                  }
                  setSavingBunny(true);
                  try {
                    // Call edge function to save credentials
                    const response = await supabase.functions.invoke('save-bunny-credentials', {
                      body: { storageZone: bunnyStorageZone.trim(), apiKey: bunnyApiKey.trim() }
                    });
                    if (response.error) {
                      toast.error('Không thể lưu credentials');
                    } else {
                      toast.success('Đã lưu Bunny credentials! Hãy bấm Test để kiểm tra.');
                      setBunnyApiKey('');
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('Có lỗi xảy ra');
                  } finally {
                    setSavingBunny(false);
                  }
                }} 
                disabled={savingBunny}
                size="sm" 
                className="w-full"
              >
                {savingBunny ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  'Lưu Bunny Credentials'
                )}
              </Button>
            </div>
          </div>

          {/* Bunny.net Test */}
          <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Cloud className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <Label className="font-medium text-sm">Test Bunny.net Connection</Label>
                <p className="text-xs text-muted-foreground">
                  Kiểm tra kết nối với cả 2 host: global và Singapore
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleTestBunny} 
              disabled={testingBunny}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {testingBunny ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 mr-2" />
                  Test Bunny Credentials
                </>
              )}
            </Button>

            {bunnyTestResult && (
              <div className="space-y-2">
                {bunnyTestResult.hostTests?.map((hostResult, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg text-sm ${hostResult.success ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}
                  >
                    <div className="flex items-center gap-2">
                      {hostResult.success ? (
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="font-medium text-xs">{hostResult.host}</span>
                      <span className="text-xs opacity-75">- {hostResult.message}</span>
                    </div>
                  </div>
                ))}
                <div className="p-2 bg-secondary rounded-lg text-xs space-y-1">
                  <div>Storage Zone: <span className="font-mono">{bunnyTestResult.storageZoneName || 'Chưa cấu hình'}</span></div>
                  <div>API Key: {bunnyTestResult.hasApiKey ? (
                    <span className="font-mono">{bunnyTestResult.apiKeyPreview} ({bunnyTestResult.apiKeyLength} ký tự)</span>
                  ) : 'Chưa cấu hình'}</div>
                  {bunnyTestResult.recommendedHost && (
                    <div className="text-green-600 dark:text-green-400 font-medium">
                      ✓ Đề xuất dùng host: {bunnyTestResult.recommendedHost}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0088cc]/10 rounded-lg">
                <Send className="h-4 w-4 text-[#0088cc]" />
              </div>
              <div>
                <Label className="font-medium text-sm">Link Telegram</Label>
                <p className="text-xs text-muted-foreground">
                  Link Telegram để người dùng liên hệ
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="https://t.me/yourusername"
                value={telegramLink}
                onChange={(e) => setTelegramLink(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleTelegramSave} size="sm">
                Lưu
              </Button>
            </div>
          </div>

          {/* Bank Info Settings */}
          <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CreditCard className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <Label className="font-medium text-sm">Thông tin ngân hàng</Label>
                <p className="text-xs text-muted-foreground">
                  Thông tin tài khoản nhận tiền hiển thị ở trang nạp tiền
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Tên ngân hàng</Label>
                <Input
                  placeholder="VietinBank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Số tài khoản</Label>
                <Input
                  placeholder="9191919191994"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Chủ tài khoản</Label>
                <Input
                  placeholder="NGUYEN QUOC DUNG"
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                />
              </div>
              <Button onClick={handleBankInfoSave} size="sm" className="w-full mt-2">
                Lưu thông tin ngân hàng
              </Button>
            </div>
          </div>

          {/* Payment QR Upload */}
          <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <QrCode className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <Label className="font-medium text-sm">Mã QR thanh toán</Label>
                <p className="text-xs text-muted-foreground">
                  Thay đổi ảnh mã QR hiển thị ở trang nạp tiền
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              {qrPreview && (
                <img 
                  src={qrPreview} 
                  alt="Payment QR Preview" 
                  className="w-24 h-24 object-cover rounded-lg border"
                />
              )}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQRUpload}
                    className="hidden"
                    disabled={uploadingQR}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    disabled={uploadingQR}
                    asChild
                  >
                    <span>
                      {uploadingQR ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Đang tải...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Tải lên ảnh QR mới
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  Hỗ trợ: JPG, PNG, WEBP. Tối đa 5MB.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
