import { ReactNode } from 'react';
import { Header } from './Header';
import { CategoryTabs } from './CategoryTabs';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
  showCategories?: boolean;
}

export function Layout({ children, showCategories = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      {showCategories && <CategoryTabs />}
      <main className="p-3 flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}