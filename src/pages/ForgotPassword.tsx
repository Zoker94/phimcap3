import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Play, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error('Không thể gửi email', { description: error.message });
    } else {
      setSent(true);
      toast.success('Đã gửi email khôi phục mật khẩu');
    }
    
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 mx-auto mb-2 flex items-center justify-center shadow-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl">Kiểm tra email</CardTitle>
            <CardDescription className="text-sm">
              Chúng tôi đã gửi link khôi phục mật khẩu đến <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Vui lòng kiểm tra hộp thư (bao gồm cả thư rác) và nhấp vào link trong email để đặt lại mật khẩu.
                </span>
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button 
              variant="outline" 
              className="w-full h-9"
              onClick={() => setSent(false)}
            >
              Gửi lại email
            </Button>
            <Link to="/login" className="text-xs text-primary hover:underline">
              ← Quay lại đăng nhập
            </Link>
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
            <Play className="h-6 w-6 text-primary-foreground fill-current" />
          </div>
          <CardTitle className="text-xl">Quên mật khẩu</CardTitle>
          <CardDescription className="text-sm">
            Nhập email của bạn để nhận link khôi phục mật khẩu
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
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
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full h-9" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi email khôi phục'}
            </Button>
            <Link to="/login" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Quay lại đăng nhập
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
