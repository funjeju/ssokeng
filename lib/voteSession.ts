import { db } from './firebase'
import {
  doc, setDoc, updateDoc, onSnapshot, getDoc,
  increment, serverTimestamp, Unsubscribe,
} from 'firebase/firestore'

export interface VoteSession {
  active: boolean
  question: string
  yesCount: number
  noCount: number
  teacherId: string
  classCode: string
  createdAt: any
}

export interface VoteResult {
  yesCount: number
  noCount: number
}

export async function activateVote(
  sessionId: string,
  teacherId: string,
  classCode: string,
  question: string,
): Promise<void> {
  await setDoc(doc(db, 'vote_sessions', sessionId), {
    active: true,
    question,
    yesCount: 0,
    noCount: 0,
    teacherId,
    classCode,
    createdAt: serverTimestamp(),
  })
}

export async function deactivateVote(sessionId: string): Promise<void> {
  await updateDoc(doc(db, 'vote_sessions', sessionId), { active: false })
}

export async function submitVote(
  sessionId: string,
  userId: string,
  vote: 'yes' | 'no',
): Promise<void> {
  const voteRef = doc(db, 'vote_sessions', sessionId, 'votes', userId)
  const existing = await getDoc(voteRef)
  if (existing.exists()) return  // 중복 투표 방지

  await setDoc(voteRef, { vote, votedAt: serverTimestamp() })
  await updateDoc(doc(db, 'vote_sessions', sessionId), {
    [vote === 'yes' ? 'yesCount' : 'noCount']: increment(1),
  })
}

export function subscribeVoteSession(
  sessionId: string,
  callback: (session: VoteSession | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'vote_sessions', sessionId), snap => {
    callback(snap.exists() ? (snap.data() as VoteSession) : null)
  })
}
