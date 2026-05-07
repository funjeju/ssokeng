import { GoogleGenerativeAI } from '@google/generative-ai'
import { Category, SummaryData } from '@/types/summary'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

const classifyModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: 'You are a JSON generator. Always respond with valid JSON only. No explanation, no markdown, no code blocks.',
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 1000,
    responseMimeType: 'application/json',
    // @ts-expect-error thinkingConfig not yet in types but supported
    thinkingConfig: { thinkingBudget: 0 },
  },
})

const summaryModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: 'You are a JSON generator. Always respond with valid JSON only. No explanation, no markdown, no code blocks. Start with { and end with }.',
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 65536,
    responseMimeType: 'application/json',
    // @ts-expect-error thinkingConfig not yet in types but supported
    thinkingConfig: { thinkingBudget: 0 },
  },
})

// 스토리 전용 모델 — 웹소설 서술 품질을 위해 temperature 높게
const storyModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: 'You are a JSON generator. Always respond with valid JSON only. No explanation, no markdown, no code blocks. Start with { and end with }.',
  generationConfig: {
    temperature: 0.6,
    maxOutputTokens: 16384,
    // @ts-expect-error thinkingConfig not yet in types but supported
    thinkingConfig: { thinkingBudget: 0 },
  },
})

const VALID_CATEGORIES: Category[] = ['recipe', 'english', 'learning', 'news', 'selfdev', 'travel', 'story', 'tips', 'report']

/**
 * AI 응답에서 JSON을 견고하게 추출합니다.
 * - 마크다운 코드 블록 제거
 * - 마지막 쉼표(Trailing commas) 제거
 * - 제어 문자 정리
 */
function extractJSON(text: string): unknown {
  // 1. 마크다운 코드블록 제거
  let cleaned = text.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim()

  // 2. JSON 부분만 추출 ({ ... })
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON structure found in response.')
  cleaned = match[0]

  try {
    return JSON.parse(cleaned)
  } catch {
    // 3. Trailing comma 제거
    try {
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')
      return JSON.parse(cleaned)
    } catch {
      // 4. JSON 문자열 값 안의 raw 제어문자 이스케이프 (Gemini가 가끔 넣는 literal \n 등)
      try {
        cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, m =>
          m.replace(/[\u0000-\u001F]/g, c => {
            if (c === '\n') return '\\n'
            if (c === '\r') return '\\r'
            if (c === '\t') return '\\t'
            if (c === '\b') return '\\b'
            if (c === '\f') return '\\f'
            return ''  // 나머지 제어문자는 제거
          })
        )
        return JSON.parse(cleaned)
      } catch {
        // 5. 미완성 JSON 복구 — 열린 괄호/배열 자동 닫기
        try {
          let depth = 0
          let inString = false
          let escape = false
          const stack: string[] = []
          for (const ch of cleaned) {
            if (escape) { escape = false; continue }
            if (ch === '\\' && inString) { escape = true; continue }
            if (ch === '"') { inString = !inString; continue }
            if (inString) continue
            if (ch === '{') stack.push('}')
            else if (ch === '[') stack.push(']')
            else if (ch === '}' || ch === ']') stack.pop()
          }
          const repaired = cleaned + stack.reverse().join('')
          return JSON.parse(repaired)
        } catch (finalError) {
          console.error('[JSON Parse Error Source]:', text.slice(0, 500))
          throw finalError
        }
      }
    }
  }
}

export async function classifyCategory(transcript: string): Promise<{ category: Category; confidence: number }> {
  try {
    const result = await classifyModel.generateContent(`Classify this YouTube transcript into exactly one of these categories:
- "recipe": cooking, baking, food preparation
- "english": videos whose MAIN PURPOSE is teaching English language (lessons, expressions, grammar). NOT just videos that contain English words.
- "learning": academic lectures, science, math, history, certifications. NOT travel guides, NOT destination/place lists, NOT product reviews.
- "news": news, current events, reviews, analysis, information
- "selfdev": self-improvement, motivation, psychology, meditation
- "travel": travel vlogs, place introductions, destination guides, tourism, local food tours, ranked travel destination lists ("TOP N 여행지" etc.)
- "story": drama, movies, storytelling, gossip, narrative content focusing on a sequence of events
- "tips": life hacks, how-to guides, productivity tips, daily life tips, saving money, home organization, app/tool usage tips. Use this when the video presents a numbered or listed set of practical tips/hacks — but NOT if the topic is travel destinations.

Transcript:
${transcript.slice(0, 2000)}

Respond with JSON: {"category": "news", "confidence": 0.95}`)

    const text = result.response.text().trim()
    const parsed = extractJSON(text) as { category: Category; confidence: number }

    if (!VALID_CATEGORIES.includes(parsed.category)) {
      return { category: 'news', confidence: 0.5 }
    }
    return parsed
  } catch (e) {
    console.warn('[classifyCategory] ⚠️ Gemini non-JSON response, defaulting to news:', e instanceof Error ? e.message : e)
    return { category: 'news', confidence: 0.5 }
  }
}

const SUMMARY_PROMPTS: Record<Category, string> = {
  recipe: `Analyze the following cooking video transcript and create a recipe JSON.

Group ingredients by role. Examples: "Main Ingredients", "Seasoning", "Broth", "Sauce", "Garnish", "Batter", "Vegetables" — use only relevant groups. Use ingredient_groups even if there is only one group.

{"square_meta":{"tags":["keyword1","keyword2","keyword3","keyword4","keyword5"],"topic_cluster":"main topic","vibe":"mood"},"dish_name":"dish name","difficulty":"beginner","total_time":"time","servings":"servings","ingredient_groups":[{"group":"Main Ingredients","items":[{"name":"ingredient","amount":"amount"}]},{"group":"Seasoning","items":[{"name":"ingredient","amount":"amount"}]}],"steps":[{"step":1,"desc":"description","timestamp":"MM:SS"}],"key_tips":["tip"]}`,

  english: `Analyze the following language learning video transcript and create a study card JSON for English-speaking learners.

[Guidelines]
- expressions: Extract key expressions actually used in the video with meaning and nuance explained in English.
- vocabulary: Select advanced or tricky words with definitions and example explanations in English.
- patterns: Identify recurring grammar patterns or structures as "pattern → explanation" in English.
- cultural_context: Explain cultural background or nuance in English.
- key_message: Summarize the core message of the video in 2-3 sentences in English.

{"square_meta":{"tags":["keyword1","keyword2","keyword3","keyword4","keyword5"],"topic_cluster":"main topic","vibe":"mood"},"title":"video title","key_message":"2-3 sentence summary in English","expressions":[{"text":"expression","meaning":"meaning in English","note":"nuance and usage in English","timestamp":"MM:SS"}],"vocabulary":[{"word":"word","meaning":"definition in English","example":"example sentence","example_ko":"translation"}],"patterns":[{"pattern":"grammar/expression pattern","desc":"explanation in English"}],"cultural_context":"cultural context in English"}`,

  learning: `Analyze the following educational video transcript and create a study summary JSON.

[Guidelines]
- concepts: Use only terms that actually appear in the transcript. Do not invent concepts.
- concepts.desc: Explain "what this concept is" and "why it matters" in 2 sentences. Go beyond a simple definition — add context.
- key_points: Write the essential insights as complete sentences.
- examples: Reproduce specific examples, analogies, or cases the instructor used, as close to the original as possible.

{"square_meta":{"tags":["keyword1","keyword2","keyword3","keyword4","keyword5"],"topic_cluster":"main topic","vibe":"mood"},"subject":"subject","concepts":[{"name":"concept name","desc":"2-sentence explanation (definition + importance/context)","timestamp":"MM:SS"}],"key_points":[{"point":"key insight as a complete sentence","timestamp":"MM:SS"}],"examples":[{"desc":"specific example or analogy from the instructor","timestamp":"MM:SS"}]}`,

  news: `Read the transcript from start to finish and complete the JSON for this news/current events video.

[Guidelines]
- Use actual names, organizations, dates, places, and figures from the transcript. Do not speculate or generalize.
- headline: A headline-style title capturing the core of this video.
- three_line_summary: Exactly 3 independent sentences. 1=what happened, 2=why it happened (background/cause), 3=outcome/current situation or outlook. Separate with newline (\n).
- five_w: The 5W1H of this video. Each field must be a specific fact.
  · who: Key actor (name or organization)
  · when: When the event occurred
  · where: Location or country/region
  · what: What actually happened — be as specific as possible
  · how: How or by what means it happened
  · why: Cause/motive/reason stated in the transcript (use "" if not mentioned)
- background: Relevant context or historical background prior to this event.
- key_moments: 5–10 key scenes/statements/points covering the full video in chronological order. Extract evenly from the entire transcript; timestamp = when it is actually mentioned.
- implications: 2–4 independent takeaways that do not overlap.

{"square_meta":{"tags":["keyword1","keyword2","keyword3","keyword4","keyword5"],"topic_cluster":"main topic","vibe":"mood"},"headline":"title","three_line_summary":"What happened.\nWhy it happened.\nOutcome/outlook.","five_w":{"who":"","when":"","where":"","what":"","how":"","why":""},"background":{"desc":"","timestamp":"MM:SS"},"key_moments":[{"point":"key scene/statement in one sentence","timestamp":"MM:SS"}],"implications":[{"point":"","timestamp":"MM:SS"}]}`,

  selfdev: `Analyze the following self-development video transcript and create an insight JSON.

[Guidelines]
- core_message: The single core message of this video — clear and impactful, in one sentence.
- insights: Not a simple list — write each insight in 2 sentences from the angle of "why this changes your life." Be honest and persuasive rather than generic.
- checklist: Concrete actions you can take tomorrow. Use action verb form.
- quotes: Impressive actual statements or key lines from the video, verbatim.

{"square_meta":{"tags":["keyword1","keyword2","keyword3","keyword4","keyword5"],"topic_cluster":"main topic","vibe":"mood"},"core_message":{"text":"core message in one sentence","timestamp":"MM:SS"},"insights":[{"point":"insight in 2 sentences (observation + reason/meaning)","timestamp":"MM:SS"}],"checklist":["actionable step you can take tomorrow"],"quotes":[{"text":"impressive actual quote from the video","timestamp":"MM:SS"}]}`,

  travel: `Analyze the following travel video transcript and create a travel guide JSON.

{"square_meta":{"tags":["keyword1","keyword2","keyword3","keyword4","keyword5"],"topic_cluster":"main topic","vibe":"mood"},"destination":"destination","places":[{"name":"place","desc":"description","price":"price","tip":"tip","timestamp":"MM:SS"}],"route":"itinerary","practical_info":["info"],"warnings":["warning"]}`,

  story: `Analyze the following story/drama/gossip video transcript and create an immersive story JSON.

[Guidelines — follow strictly]
- Each event in timeline should be written in 2–3 vivid sentences, as if a storyteller is narrating to the reader.
  · Capture the character's emotions, expressions, reactions, and dialogue nuance.
  · Naturally weave in tension, twists, and humor where they exist.
  · Example style: "At that moment, A's expression froze. Nobody expected B to say what they said — not then, not like that."
  · Never write dry lists like "A meets B", "C event occurs."
- characters.desc: 2 sentences that let the reader imagine this person's personality, behavior patterns, and relationships.
- conclusion: End with 1–2 sentences that carry the weight of the ending or a twist.
- genre: Reflect the actual tone (e.g., "shocking twist", "sweet romance", "tear-jerking drama").

{"square_meta":{"tags":["keyword1","keyword2","keyword3","keyword4","keyword5"],"topic_cluster":"main topic","vibe":"mood (e.g. tense, hilarious, emotional)"},"title":"story title","genre":"genre (e.g. shocking twist, romance drama, mystery)","characters":[{"name":"character name or title","desc":"2 sentences on personality, behavior, and relationships"}],"timeline":[{"timestamp":"MM:SS","event":"vivid 2–3 sentences as a storyteller. Capture emotions, nuance, and twists."}],"conclusion":"1–2 sentences carrying the weight of the ending or a twist"}`,

  tips: `Analyze the following tips/how-to video transcript and create a tip card JSON.
Each tip should have a clear title and practical description. difficulty must be one of: "easy" / "medium" / "hard".

{"square_meta":{"tags":["keyword1","keyword2","keyword3","keyword4","keyword5"],"topic_cluster":"main topic","vibe":"mood"},"topic":"tip topic (e.g. home organization hacks)","tips":[{"number":1,"title":"tip title","desc":"1-2 sentence description","timestamp":"MM:SS","difficulty":"easy"}],"key_message":"one-line core message of the video","tools":["tools or apps needed (empty array if none)"],"top3":["top tip summary 1","top tip summary 2","top tip summary 3"]}`,

  // voice는 별도 API에서 Gemini가 직접 처리하므로 placeholder만 사용
  voice: '',

  report: `__REPORT_DYNAMIC__`,
}

/**
 * 긴 자막을 전체적으로 커버하도록 샘플링
 * - 6만자 이하: 전체 사용
 * - 6만자 초과: 앞 40% + 중간 30% + 뒤 30% 균등 분배
 */
function sampleTranscript(transcript: string, maxChars = 60000): string {
  if (transcript.length <= maxChars) return transcript

  const frontChars  = Math.floor(maxChars * 0.40)
  const middleChars = Math.floor(maxChars * 0.30)
  const endChars    = Math.floor(maxChars * 0.30)

  const midStart = Math.floor(transcript.length / 2) - Math.floor(middleChars / 2)
  const endStart = transcript.length - endChars

  const front  = transcript.slice(0, frontChars)
  const middle = transcript.slice(midStart, midStart + middleChars)
  const end    = transcript.slice(endStart)

  return [front, '\n...[continued]...\n', middle, '\n...[continued]...\n', end].join('')
}

export async function generateSummary(
  category: Category,
  transcript: string,
  source: 'youtube' | 'pdf' | 'web' = 'youtube',
  outputLang: 'en' | 'ja' | 'zh' | 'es' = 'en'
): Promise<SummaryData> {
  // report 카테고리: 영상 길이에 비례해 섹션 수 동적 결정
  let prompt = SUMMARY_PROMPTS[category]
  if (category === 'report') {
    const approxMinutes = Math.round(transcript.length / 800)
    const sectionCount = approxMinutes >= 40 ? '12–18 sections' : approxMinutes >= 20 ? '8–12 sections' : approxMinutes >= 10 ? '5–8 sections' : '4–6 sections'
    const bodyLen = approxMinutes >= 20 ? '3–5 sentences' : '2–3 sentences'
    prompt = `Analyze the following video transcript and create a structured report JSON.
Organize sections according to the video flow — ${sectionCount} sections total. Each section body should be ${bodyLen} in narrative prose.
Distribute timestamps evenly to cover the entire video without gaps.
Timestamp = the moment in the video where that section begins (MM:SS or HH:MM:SS format).
context_summary = 50–80 word contextual overview of the entire video.
conclusion = one sentence capturing the core conclusion.

{"square_meta":{"tags":["keyword1","keyword2","keyword3","keyword4","keyword5"],"topic_cluster":"main topic","vibe":"mood"},"title":"report title","context_summary":"50–80 word contextual overview","table_of_contents":["1. Section Title","2. Section Title"],"sections":[{"number":1,"heading":"subheading","timestamp":"MM:SS","body":"narrative summary in prose"}],"conclusion":"core conclusion in one sentence"}`
  }

  const sampled = sampleTranscript(transcript)  // 기본 6만자

  const sourceNote = source === 'pdf'
    ? `\n※ This content is from a PDF document. The text contains [PAGE N] markers. For the timestamp field, always use "p.N" format (e.g. "p.3", "p.7") for the page where the content appears. Do NOT use MM:SS format. Use an empty string if the page cannot be determined.`
    : source === 'web'
    ? `\n※ This content is from a web page. Set all timestamp fields to empty strings ("").`
    : ''

  const langMap: Record<string, string> = {
    en: 'English',
    ja: 'Japanese (日本語)',
    zh: 'Simplified Chinese (中文)',
    es: 'Spanish (Español)',
  }
  const langNote = `\n\n[IMPORTANT: Write ALL text values in ${langMap[outputLang] ?? 'English'}. Do NOT output in any other language.]`

  const model = category === 'story' ? storyModel : summaryModel
  const result = await model.generateContent(`${prompt}${sourceNote}${langNote}

${source === 'youtube' ? 'Transcript' : 'Content'}:
${sampled}`)

  const text = result.response.text().trim()
  return extractJSON(text) as SummaryData
}

const reportModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: 8192,
    // @ts-expect-error thinkingConfig not yet in types but supported
    thinkingConfig: { thinkingBudget: 0 },
  },
})

export async function generateReportSummary(
  category: Category,
  title: string,
  fullContext: string,
  outputLang: 'en' | 'ja' | 'zh' | 'es' = 'en'
): Promise<string> {
  // 자막 길이로 영상 분량 추정 → 보고서 분량 동적 조절
  const approxMinutes = Math.round(fullContext.length / 800)
  const targetChars = approxMinutes >= 30 ? '800–1200 words' : approxMinutes >= 15 ? '500–800 words' : '300–500 words'
  const sectionCount = approxMinutes >= 30 ? '8–12 sections' : approxMinutes >= 15 ? '6–8 sections' : '4–6 sections'
  const categoryHint: Record<Category, string> = {
    recipe:   'Cooking/Recipe video',
    english:  'Language Learning video',
    learning: 'Educational/Lecture video',
    news:     'News/Current Events video',
    selfdev:  'Self-Development video',
    travel:   'Travel video',
    story:    'Story/Drama video',
    tips:     'Tips/Life Hacks video',
    voice:    'Voice Recording memo',
    report:   'Report format summary',
  }

  const reportLangMap: Record<string, string> = {
    en: 'English',
    ja: 'Japanese (日本語)',
    zh: 'Simplified Chinese (中文)',
    es: 'Spanish (Español)',
  }
  const reportLang = reportLangMap[outputLang] ?? 'English'

  const result = await reportModel.generateContent(`You are a professional content editor.
Read the transcript/content of the following "${categoryHint[category]}" and write a structured report document entirely in ${reportLang}.
[IMPORTANT: Write the entire report in ${reportLang} regardless of the source language of the transcript.]

Requirements:
- ${sectionCount} sections with subheadings (##)
- Each section: 3–5 sentences in narrative paragraph form (minimize bullet points)
- First section must start with "## Overview" introducing the background and topic
- Last section must end with "## Key Takeaways" covering conclusions/implications
- Middle section headings can be set freely based on content
- Total length: ${targetChars} (detailed in proportion to video length)
- Use markdown only (bold, subheadings), no tables or code blocks

Video title: ${title}
Category: ${categoryHint[category]}

Transcript/Content:
${sampleTranscript(fullContext, 60000)}`)

  return result.response.text().trim()
}

/**
 * 맥락 요약 생성 — 200~300자, 검색·임베딩 최적화
 * 저장 시 1회 생성 후 Firestore에 보관
 */
export async function generateContextSummary(
  title: string,
  category: Category,
  summaryData: SummaryData
): Promise<string> {
  const categoryHint: Record<Category, string> = {
    recipe: 'Cooking/Recipe',
    english: 'Language Learning',
    learning: 'Educational/Lecture',
    news: 'News/Current Events',
    selfdev: 'Self-Development',
    travel: 'Travel',
    story: 'Story/Drama',
    tips: 'Tips/Life Hacks',
    voice: 'Voice Recording',
    report: 'Report',
  }

  const result = await classifyModel.generateContent(`Summarize the following content in context within 50–80 words.

Rules:
- This text is used for search and AI recommendations
- Cover the core topic, what it addresses, target audience, and practical value in natural sentences
- Do not repeat the title — explain the "context" of the content
- Write in English, 50–80 words, single paragraph without line breaks

Title: ${title}
Category: ${categoryHint[category]}
Summary data: ${JSON.stringify(summaryData).slice(0, 2000)}`)

  const text = result.response.text().trim()
  return text.slice(0, 350)  // 최대 350자 안전 마진
}

export async function generateQuiz(
  category: 'english' | 'learning',
  summaryData: unknown,
  title: string
): Promise<import('@/types/summary').QuizData> {
  const hint = category === 'english'
    ? `From a language learning summary, create word/expression flashcards and multiple-choice usage questions.
flashcard: front=English word/expression, back=meaning + real-world example sentence in English
multiple_choice: find correct usage in real sentences, distinguish from easily confused expressions, 4 options`
    : `Create questions that verify true understanding of the core concepts from this educational video.

[Flashcard principles]
- Front: name of concept/principle OR a question like "What happens when...?"
- Back: explanation of the reason, principle, or mechanism (no simple definitions)

[Multiple-choice principles — strictly follow]
1. Never ask "what did the video say" verbatim recall questions
2. Must include questions applying concepts to new situations/cases
3. Prefer "why", "how", "what happens in this situation" formats
4. Incorrect options should be based on common misconceptions (not random nonsense)
5. Answering correctly must require understanding the underlying principle`

  const result = await classifyModel.generateContent(`${hint}

Summary data:
${JSON.stringify(summaryData).slice(0, 3000)}

Video title: ${title}

Create 8–12 questions total, mixing flashcard and multiple_choice.
multiple_choice options must be an array of 4 strings including the correct answer.

JSON format:
{"category":"${category}","title":"Quiz title","questions":[{"type":"flashcard","question":"front","answer":"back","hint":"hint (optional)"},{"type":"multiple_choice","question":"question","answer":"correct answer string","options":["option1","option2","option3","option4"]}]}`)

  const text = result.response.text().trim()
  return extractJSON(text) as import('@/types/summary').QuizData
}

// ─────────────────────────────────────────────
// 구간별 요약 (30분+ 영상)
// ─────────────────────────────────────────────

export interface SegmentSummary {
  index: number
  startTimestamp: string
  endTimestamp: string
  headline: string
  keyPoints: string[]
}

export interface SegmentQuizQuestion {
  question: string
  options: string[]
  answer: number  // 0-based index
}

/**
 * 타임스탬프 문자열 → 초
 */
function tsToSec(ts: string): number {
  const parts = ts.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

/**
 * 자막에서 마지막 타임스탬프를 파싱하여 영상 길이(초) 추정
 */
export function estimateVideoDuration(transcript: string): number {
  const matches = [...transcript.matchAll(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g)]
  if (matches.length === 0) return 0
  return tsToSec(matches[matches.length - 1][1])
}

/**
 * 자막을 chunkMinutes 단위 구간으로 분할
 * 각 구간: { start, end, text }
 */
export function splitTranscriptIntoChunks(
  transcript: string,
  chunkMinutes = 10
): { start: string; end: string; text: string }[] {
  const lines = transcript.split('\n').filter(l => l.trim())
  const chunkSec = chunkMinutes * 60

  // [timestamp] text 형태의 줄 파싱
  const parsed: { sec: number; ts: string; text: string }[] = []
  for (const line of lines) {
    const m = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s(.+)/)
    if (m) parsed.push({ sec: tsToSec(m[1]), ts: m[1], text: m[2] })
    else if (parsed.length > 0) {
      // 타임스탬프 없는 라인은 이전 구간에 붙임
      parsed[parsed.length - 1].text += ' ' + line.trim()
    }
  }

  if (parsed.length === 0) {
    // 타임스탬프 없는 자막 → 단일 청크
    return [{ start: '00:00', end: '', text: transcript.slice(0, 50000) }]
  }

  const totalSec = parsed[parsed.length - 1].sec
  const numChunks = Math.max(1, Math.ceil(totalSec / chunkSec))
  const chunks: { start: string; end: string; text: string }[] = []

  for (let i = 0; i < numChunks; i++) {
    const startSec = i * chunkSec
    const endSec = (i + 1) * chunkSec
    const lines = parsed.filter(p => p.sec >= startSec && p.sec < endSec)
    if (lines.length === 0) continue
    chunks.push({
      start: lines[0].ts,
      end: lines[lines.length - 1].ts,
      text: lines.map(l => `[${l.ts}] ${l.text}`).join('\n'),
    })
  }

  return chunks.length > 0 ? chunks : [{ start: '00:00', end: '', text: transcript.slice(0, 50000) }]
}

const segmentModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: 'You are a JSON generator. Always respond with valid JSON only. No explanation, no markdown, no code blocks. Start with { and end with }.',
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
    // @ts-expect-error thinkingConfig not yet in types but supported
    thinkingConfig: { thinkingBudget: 0 },
  },
})

/**
 * 단일 구간 요약 생성
 */
export async function generateSegmentSummary(
  chunk: { start: string; end: string; text: string },
  index: number
): Promise<SegmentSummary> {
  const result = await segmentModel.generateContent(`The following is the transcript for the ${chunk.start}–${chunk.end} segment of a video.
Analyze this segment and organize it as JSON.

[Guidelines]
- headline: A compelling title capturing the core of this segment (under 10 words)
- keyPoints: 3–5 points. Each point should be 1–2 complete sentences explaining "what was covered and why it matters." Write full sentences, not words or phrases.

{"headline":"core title for this segment (under 10 words)","keyPoints":["complete sentence: what + why it matters","point2","point3"]}

[IMPORTANT: Write ALL text values in English.]

Transcript:
${chunk.text.slice(0, 25000)}`)

  const text = result.response.text().trim()
  const parsed = extractJSON(text) as { headline: string; keyPoints: string[] }
  return {
    index,
    startTimestamp: chunk.start,
    endTimestamp: chunk.end,
    headline: parsed.headline || `${chunk.start} ~ ${chunk.end}`,
    keyPoints: (parsed.keyPoints || []).slice(0, 5),
  }
}

/**
 * 구간별 퀴즈 생성 (2~3문항)
 */
export async function generateSegmentQuiz(
  segment: SegmentSummary,
  chunkText: string
): Promise<SegmentQuizQuestion[]> {
  const result = await segmentModel.generateContent(`Based on the following segment content, create 3 comprehension quiz questions.
Each question is multiple-choice with 4 options and 1 correct answer.

[IMPORTANT: Write ALL text values in English.]

{"questions":[{"question":"question text","options":["option1","option2","option3","option4"],"answer":0}]}

Segment summary:
${segment.headline}
${segment.keyPoints.join('\n')}

Transcript:
${chunkText.slice(0, 10000)}`)

  const text = result.response.text().trim()
  const parsed = extractJSON(text) as { questions: SegmentQuizQuestion[] }
  return (parsed.questions || []).slice(0, 3)
}

export async function classifyFolder(videoTitle: string, tags: string[], existingFolders: string[]): Promise<{ suggestedFolder: string, isNew: boolean }> {
  const result = await classifyModel.generateContent(`You are a smart YouTube library organizer.
The user wants to save a summarized video.
Title: "${videoTitle}"
Tags: [${tags.join(', ')}]

The user already has the following folders:
[${existingFolders.join(', ')}]

Task: Determine the best folder for this video.
If an existing folder perfectly fits or generally encompasses this topic, select it.
If none of the existing folders fit, suggest a concise new folder name (1-2 words).

Respond in JSON ONLY:
{"suggestedFolder": "exact existing folder name OR new folder name", "isNew": true OR false}
`)

  const text = result.response.text().trim()
  try {
    return extractJSON(text) as { suggestedFolder: string, isNew: boolean }
  } catch (e) {
    return { suggestedFolder: existingFolders[0] || 'Other', isNew: existingFolders.length === 0 }
  }
}
