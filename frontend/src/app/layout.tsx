import type { Metadata } from 'next';
import { Lexend } from 'next/font/google';
import './globals.css';
import Heartbeat from '../components/Heartbeat';
import UpdateBanner from '../components/UpdateBanner';

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
});

export const metadata: Metadata = {
  title: 'Tableau de Bord - Immeuble Coranique',
  description: 'Application de vérification de récitation coranique avec IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={lexend.variable}>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-slate-50 text-slate-800 h-screen overflow-hidden">
        <Heartbeat />
        <UpdateBanner />
        {children}
      </body>
    </html >
  );
}
