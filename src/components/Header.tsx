import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Moon, Sun, Menu, X, Crown, Shield, Play, Wallet, Settings, MessageCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, profile, isAdmin, isManager, signOut } = useAuth();
  const navigate = useNavigate();
  
  const hasAdminAccess = isAdmin || isManager;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      {/* Search Bar */}
      <div className="bg-secondary/50 px-3 py-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm video..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-background"
            />
          </div>
          <Button type="submit" size="sm" className="h-8 px-3">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Main Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <Link to="/" className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm shadow-primary/20">
            <Play className="h-3.5 w-3.5 text-primary-foreground fill-current" />
          </div>
          <span className="font-bold text-base tracking-tight">phimcap3</span>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
                  <User className="h-4 w-4" />
                  {profile?.membership_status === 'vip' && profile?.vip_expires_at && new Date(profile.vip_expires_at) > new Date() && (
                    <Crown className="h-3 w-3 text-yellow-500" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {profile?.username || user.email}
                </div>
                <div className="px-2 py-1 text-xs">
                  Số dư: <span className="font-medium text-green-600">{(profile?.balance || 0).toLocaleString()}đ</span>
                </div>
                {profile?.membership_status === 'vip' && profile?.vip_expires_at && new Date(profile.vip_expires_at) > new Date() ? (
                  <div className="px-2 py-1 flex items-center gap-1 text-xs text-yellow-600">
                    <Crown className="h-3 w-3" />
                    VIP Member
                  </div>
                ) : (
                  <DropdownMenuItem onClick={() => navigate('/vip')} className="text-yellow-600">
                    <Crown className="h-4 w-4 mr-2" />
                    Mua VIP
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Quản lý tài khoản
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/deposit')} className="text-green-600">
                  <Wallet className="h-4 w-4 mr-2" />
                  Nạp tiền
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/upload')}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload video
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {hasAdminAccess && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="h-4 w-4 mr-2" />
                      Quản trị
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => signOut()}>
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={() => navigate('/login')} className="h-8 text-xs">
              Đăng nhập
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <nav className="border-t border-border px-3 py-2 md:hidden">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="px-3 py-1.5 text-xs bg-secondary rounded-full hover:bg-secondary/80"
              onClick={() => setMenuOpen(false)}
            >
              Trang chủ
            </Link>
            <Link
              to="/chat"
              className="px-3 py-1.5 text-xs bg-gradient-to-r from-primary/10 to-accent/10 rounded-full hover:from-primary/20 hover:to-accent/20 flex items-center gap-1"
              onClick={() => setMenuOpen(false)}
            >
              <MessageCircle className="w-3 h-3" />
              Trò chuyện
            </Link>
            <Link
              to="/category/clip-ngan"
              className="px-3 py-1.5 text-xs bg-secondary rounded-full hover:bg-secondary/80"
              onClick={() => setMenuOpen(false)}
            >
              Clip ngắn
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}