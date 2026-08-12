import type { Metadata } from 'next';
import AppLayout from '@/components/layout/AppLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'smartC - Peer Platform',
  description: 'Connect with people who truly understand.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white min-h-screen">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}