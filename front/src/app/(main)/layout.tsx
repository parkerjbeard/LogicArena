import ResponsiveNavigation from '@/components/ResponsiveNavigation';
import { OptimizedLayout } from '@/components/OptimizedLayout';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OptimizedLayout>
      <ResponsiveNavigation />
      <main className="flex-1">
        {children}
      </main>
    </OptimizedLayout>
  );
}