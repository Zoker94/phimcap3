import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Wallet, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Setting {
  key: string;
  value: string;
}

export function AdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);

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
    }
    setLoading(false);
  };

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('site_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      toast.error('Không thể cập nhật cài đặt');
      console.error('Error updating setting:', error);
    } else {
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
      toast.success('Đã cập nhật cài đặt');
    }
  };

  const getSettingValue = (key: string): boolean => {
    const setting = settings.find(s => s.key === key);
    return setting?.value === 'true';
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
        </CardContent>
      </Card>
    </div>
  );
}
