import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Page — My Library',
  description: 'Manage your saved YouTube AI summaries by folder.',
  robots: { index: false, follow: false },
}

export default function MypageLayout({ children }: { children: React.ReactNode }) {
  return children
}
