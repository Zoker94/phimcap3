import { ReactNode } from 'react';
import { Header } from './Header';
import { CategoryTabs } from './CategoryTabs';
import { Footer } from './Footer';
import { AdvertisementBanner } from './AdvertisementBanner';

interface LayoutProps {
  children: ReactNode;
  showCategories?: boolean;
  showSidebar?: boolean;
}

export function Layout({ children, showCategories = true, showSidebar = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <AdvertisementBanner position="header" className="px-3 py-2" />
      {showCategories && <CategoryTabs />}
      <div className="flex flex-1">
        <main className="p-3 flex-1">
          {children}
        </main>
        {showSidebar && (
          <aside className="hidden lg:block w-64 p-3 space-y-3">
            <AdvertisementBanner position="sidebar" />
          </aside>
        )}
      </div>
      <AdvertisementBanner position="footer" className="px-3 py-2" />
      <Footer />
    </div>
  );
}