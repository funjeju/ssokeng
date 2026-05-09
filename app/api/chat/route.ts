import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

const CATEGORY_LABEL: Record<string, string> = {
  recipe:  'Cooking/Recipe',
  english: 'Language Learning',
  learning:'Education/Lecture',
  news:    'News/Current Events',
  selfdev: 'Self-Development',
  travel:  'Travel',
  story:   'Story/Drama',
  tips:    'Tips/Life Hacks',
}

interface SummaryMeta {
  id: string
  sessionId: string
  title: string
  category: string
  channel?: string
  tags: string[]
  shortText?: string
  createdAt?: string
}

interface ChatMessage { role: 'user' | 'model'; content: string }

export async function POST(req: NextRequest) {
  try {
    const { messages, userId, source, summaryMeta }: {
      messages: ChatMessage[]
      userId?: string
      source: 'mypage' | 'square'
      summaryMeta: SummaryMeta[]
    } = await req.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided.' }, { status: 400 })
    }

    const query = messages[messages.length - 1].content
    const contextLabel = source === 'mypage' ? "user's saved content" : 'public Square content'
    const meta = summaryMeta ?? []

    const contextList = meta.map((s, i) => {
      const cat = CATEGORY_LABEL[s.category] ?? s.category
      const tagStr = s.tags.slice(0, 4).join(', ')
      return [
        `[${i + 1}] ID:${s.id} [${cat}] "${s.title}"`,
        s.channel ? `Channel: ${s.channel}` : '',
        tagStr ? `Tags: ${tagStr}` : '',
        s.shortText ? `Content: ${s.shortText.slice(0, 150)}` : '',
        s.createdAt ? `Saved: ${s.createdAt}` : '',
      ].filter(Boolean).join(' | ')
    }).join('\n')

    const systemInstruction = contextList
      ? `You are an AI search assistant for SSOKENG.
From the candidate video list below, rank and return the most relevant results for the user's query.
Context: ${contextLabel} (${meta.length} candidates)

---CANDIDATES---
${contextList}
---

Response rules:
- Respond in 1–2 natural sentences explaining what you found.
- On a new line at the very end, add: [RELATED:id1,id2,...] — up to 8 IDs in relevance order.
- Judge relevance based on: title, category, channel, tags, content, and save date.
- If nothing matches, say so honestly in one sentence (no [RELATED:] tag needed).
- The [RELATED:...] tag is parsed by the UI — always place it last, alone on its own line.`
      : `You are the SSOKENG AI assistant. No content was found related to "${query}". Let the user know in one sentence.`

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512,
        // @ts-expect-error thinkingConfig not yet in types but supported
        thinkingConfig: { thinkingBudget: 0 },
      },
    })

    const history = messages.slice(0, -1).map(m => ({
      role: m.role as 'user' | 'model',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(query)
    const rawText = result.response.text()

    let relatedIds: string[] = []
    const relatedMatch = rawText.match(/\[RELATED:([^\]]*)\]?/)
    if (relatedMatch) {
      relatedIds = relatedMatch[1].split(',').map(id => id.trim()).filter(Boolean).slice(0, 8)
    }
    const text = rawText.replace(/\[RELATED:[^\]]*\]?/g, '').trim()

    return NextResponse.json({ text, relatedIds })
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error('[Chat API] error:', errMsg)
    return NextResponse.json({ error: 'An error occurred.', detail: errMsg }, { status: 500 })
  }
}
