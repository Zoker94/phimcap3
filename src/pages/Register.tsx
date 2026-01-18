import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Play } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Vui lòng nhập biệt danh');
      return;
    }

    if (username.trim().length < 3) {
      toast.error('Biệt danh phải có ít nhất 3 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Mật khẩu không khớp');
      return;
    }

    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.trim())
      .maybeSingle();

    if (existingUser) {
      toast.error('Biệt danh này đã được sử dụng');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          username: username.trim()
        }
      }
    });
    
    if (error) {
      toast.error('Đăng ký thất bại', { description: error.message });
    } else if (data.user) {
      // Update the profile with the username
      await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('user_id', data.user.id);

      toast.success('Đăng ký thành công');
      navigate('/');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 mx-auto mb-2 flex items-center justify-center shadow-lg shadow-primary/20">
            <Play className="h-6 w-6 text-primary-foreground fill-current" />
          </div>
          <CardTitle className="text-xl">Đăng ký</CardTitle>
          <CardDescription className="text-sm">Tạo tài khoản mới để xem video</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm">Biệt danh <span className="text-destructive">*</span></Label>
              <Input
                id="username"
                type="text"
                placeholder="Nhập biệt danh của bạn"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-9"
                minLength={3}
              />
              <p className="text-xs text-muted-foreground">Biệt danh sẽ được hiển thị trong chat</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Mật khẩu <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 pr-10"
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
              <Label htmlFor="confirmPassword" className="text-sm">Xác nhận mật khẩu <span className="text-destructive">*</span></Label>
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
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full h-9" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Đăng nhập
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
