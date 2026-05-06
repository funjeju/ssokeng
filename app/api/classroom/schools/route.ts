import { NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'

export async function GET() {
  initAdminApp()
  const { getFirestore } = await import('firebase-admin/firestore')
  const db = getFirestore()

  const snap = await db.collection('classes').get()
  const schools = [...new Set(
    snap.docs.map(d => d.data().schoolName as string).filter(Boolean)
  )].sort()

  return NextResponse.json({ schools })
}
