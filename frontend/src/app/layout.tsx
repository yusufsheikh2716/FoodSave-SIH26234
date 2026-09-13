import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { NavSidebar } from '@/components/nav-sidebar';

export const metadata: Metadata = {
  title: 'FoodSave — AI-Powered Smart Food Waste Reduction (SIH26234)',
  description:
    'Institutional kitchen food waste reduction and dynamic perishable surplus redistribution ecosystem powered by real-time dispatch and AI demand forecasting.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex">
        <Providers>
          <NavSidebar />
          <main className="flex-1 overflow-y-auto h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
