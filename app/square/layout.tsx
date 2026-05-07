import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SQUARE — Knowledge Hub',
  description: 'Explore and share. Browse AI summaries of YouTube, PDFs, and audio created by others, and save them to your library.',
  keywords: ['youtube summary feed', 'public summaries', 'AI summary hub', 'shared youtube library', 'SQUARE'],
  alternates: {
    canonical: 'https://ssokeng.vercel.app/square',
  },
  openGraph: {
    title: 'SQUARE — Knowledge Hub | SSOKENG',
    description: 'Explore and share. Browse AI summaries of YouTube, PDFs, and audio created by others, and save them to your library.',
    url: 'https://ssokeng.vercel.app/square',
    type: 'website',
  },
}

export default function SquareLayout({ children }: { children: React.ReactNode }) {
  return children
}
