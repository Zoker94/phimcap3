import { ReactNode } from 'react';
import { Header } from './Header';
import { CategoryTabs } from './CategoryTabs';

interface LayoutProps {
  children: ReactNode;
  showCategories?: boolean;
}

export function Layout({ children, showCategories = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {showCategories && <CategoryTabs />}
      <main className="p-3">
        {children}
      </main>
    </div>
  );
}