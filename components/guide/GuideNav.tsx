'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV = [
  {
    label: 'Getting Started',
    href: '/guide',
    icon: '🚀',
  },
  {
    label: 'Video Summary',
    icon: '✨',
    children: [
      { label: 'Cooking Recipes', href: '/guide/summary/recipe', icon: '🍳' },
      { label: 'English Learning', href: '/guide/summary/english', icon: '🔤' },
      { label: 'News & Economics', href: '/guide/summary/news', icon: '🗞️' },
      { label: 'Travel Spots', href: '/guide/summary/travel', icon: '🧳' },
    ],
  },
  { label: 'Import Playlist', href: '/guide/import', icon: '📋' },
  { label: 'Blog Draft', href: '/guide/blog', icon: '✍️' },
  { label: 'Shorts Script', href: '/guide/shorts', icon: '🎬' },
  { label: 'AI Chat Search', href: '/guide/search', icon: '🔍' },
  { label: 'Square Guide', href: '/guide/square', icon: '🌐' },
  { label: 'Classroom', href: '/guide/classroom', icon: '🎓' },
]

export default function GuideNav() {
  const pathname = usePathname()
  const [openGroup, setOpenGroup] = useState<string | null>('Video Summary')

  return (
    <nav className="sticky top-6">
      <p className="text-[10px] text-[var(--text-subtle)] uppercase tracking-widest mb-3 font-semibold">User Guide</p>
      <ul className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          if (item.children) {
            const isOpen = openGroup === item.label
            const isActive = item.children.some(c => pathname === c.href)
            return (
              <li key={item.label}>
                <button
                  onClick={() => setOpenGroup(isOpen ? null : item.label)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                    isActive ? 'text-white font-semibold' : 'text-[var(--text-subtle)] hover:text-white'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {isOpen && (
                  <ul className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--border-subtle)] pl-3">
                    {item.children.map(child => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                            pathname === child.href
                              ? 'text-white font-semibold bg-[var(--overlay-subtle)]'
                              : 'text-[var(--text-subtle)] hover:text-white'
                          }`}
                        >
                          <span>{child.icon}</span>
                          <span>{child.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href!}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                  pathname === item.href
                    ? 'text-white font-semibold bg-[var(--overlay-subtle)]'
                    : 'text-[var(--text-subtle)] hover:text-white'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
