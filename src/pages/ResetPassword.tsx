import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session from the reset password link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Link không hợp lệ hoặc đã hết hạn');
        navigate('/forgot-password');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Mật khẩu không khớp');
      return;
    }

    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ 
      password: password 
    });

    if (error) {
      toast.error('Không thể cập nhật mật khẩu', { description: error.message });
    } else {
      setSuccess(true);
      toast.success('Mật khẩu đã được cập nhật');
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 mx-auto mb-2 flex items-center justify-center shadow-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl">Thành công!</CardTitle>
            <CardDescription className="text-sm">
              Mật khẩu của bạn đã được cập nhật thành công
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              className="w-full h-9" 
              onClick={() => navigate('/')}
            >
              Về trang chủ
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 mx-auto mb-2 flex items-center justify-center shadow-lg shadow-primary/20">
            <KeyRound className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Đặt lại mật khẩu</CardTitle>
          <CardDescription className="text-sm">
            Nhập mật khẩu mới cho tài khoản của bạn
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 pr-10"
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-9 w-9 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-9"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full h-9" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
