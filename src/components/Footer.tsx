import { Link } from 'react-router-dom';
import { Play, Shield, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card/50 border-t border-border mt-6">
      <div className="px-4 py-4">
        {/* Compact single row layout */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand + Links */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Play className="h-3 w-3 text-primary-foreground fill-current" />
              </div>
              <span className="font-semibold text-sm">phimcap3</span>
            </Link>
            
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-primary" />
                An toàn
              </span>
              <span>•</span>
              <span>HD 1080p</span>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            © {currentYear} phimcap3 
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:flex items-center gap-0.5">
              Made with <Heart className="h-2.5 w-2.5 text-red-500 fill-current" /> in VN
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
