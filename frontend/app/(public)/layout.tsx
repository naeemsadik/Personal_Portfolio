import { StickyNav } from '@/components/nav/StickyNav';
import { Footer } from '@/components/sections/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StickyNav />
      <main className="pt-16">{children}</main>
      <Footer />
    </>
  );
}
