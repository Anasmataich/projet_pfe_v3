import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/helpers';

export function MainLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy-950)' }}>
      <Sidebar />
      <div className={cn('flex flex-col min-h-screen transition-all duration-300', sidebarOpen ? 'ml-[240px]' : 'ml-[72px]')}>
        <Header />
        <main className="flex-1 p-6 pt-[88px]">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
