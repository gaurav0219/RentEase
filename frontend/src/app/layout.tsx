import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { DataRefreshProvider } from '@/lib/data-refresh-context';

export const metadata: Metadata = {
  title: 'RentEase - Rental Property Management',
  description: 'Secure, legally compliant rental property management system for Indian house owners',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <DataRefreshProvider>
            {children}
          </DataRefreshProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
