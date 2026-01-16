import { Link } from 'react-router-dom';
import { Play, Mail, Shield, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-8">
      {/* Main Footer */}
      <div className="px-4 py-8">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <Play className="h-5 w-5 text-primary-foreground fill-current" />
          </div>
          <span className="font-bold text-xl tracking-tight">phimcap3</span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">
            Trang chủ
          </Link>
          <Link to="/category/moi-nhat" className="hover:text-foreground transition-colors">
            Mới nhất
          </Link>
          <Link to="/category/xu-huong" className="hover:text-foreground transition-colors">
            Xu hướng
          </Link>
          <span className="hover:text-foreground transition-colors cursor-pointer">
            Liên hệ
          </span>
          <span className="hover:text-foreground transition-colors cursor-pointer">
            Điều khoản
          </span>
        </nav>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>An toàn & Bảo mật</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
            <Play className="h-3.5 w-3.5 text-primary" />
            <span>HD 1080p</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span>Hỗ trợ 24/7</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

        {/* Copyright */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">
            © {currentYear} <span className="font-semibold text-foreground">phimcap3</span>. Tất cả quyền được bảo lưu.
          </p>
          <p className="text-[10px] text-muted-foreground/70 flex items-center justify-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-500 fill-current" /> in Vietnam
          </p>
        </div>
      </div>

      {/* Bottom Gradient Bar */}
      <div className="h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
    </footer>
  );
}
