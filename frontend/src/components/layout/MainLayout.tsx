import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/helpers';

export function MainLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--navy-950)' }}>
      <Sidebar />

      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300',
          sidebarOpen ? 'ml-[240px]' : 'ml-[72px]'
        )}
      >
        <Header />

        <main className="flex-1 pt-[88px] px-4 sm:px-6 pb-10">
          {/* container */}
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}