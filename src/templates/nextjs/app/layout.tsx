import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '{{PROJECT_NAME}}',
  description: 'Email editor powered by Unlayer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
