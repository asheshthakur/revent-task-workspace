import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Social Economy | VEYA',
  description: 'Plan social content and consolidate social media performance analytics with VEYA Social Economy.',
  keywords: [
    'social media analytics',
    'social media management',
    'content planning',
    'marketing analytics',
    'CSV analytics',
    'agency dashboard',
    'VEYA Social Economy'
  ],
  openGraph: {
    title: 'Social Economy | VEYA',
    description: 'Plan social content and consolidate social media performance analytics with VEYA Social Economy.',
    type: 'website'
  }
};

export default function SocialEconomyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
