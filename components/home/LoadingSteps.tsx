'use client'

import { useEffect, useState, useRef } from 'react'
import { Progress } from '@/components/ui/progress'

const STEPS_YOUTUBE = [
  { label: 'Fetching video info...', weight: 1 },
  { label: 'Extracting captions...',  weight: 3 },
  { label: 'Classifying category...', weight: 1 },
  { label: 'Generating summary...',   weight: 2 },
  { label: 'Linking timestamps...',   weight: 1 },
]

const STEPS_PDF = [
  { label: 'Reading PDF...',          weight: 1 },
  { label: 'Extracting text...',      weight: 2 },
  { label: 'Classifying category...', weight: 1 },
  { label: 'Generating summary...',   weight: 3 },
  { label: 'Finishing up...',         weight: 1 },
]

const STEPS_URL = [
  { label: 'Accessing page...',       weight: 1 },
  { label: 'Extracting content...',   weight: 2 },
  { label: 'Classifying category...', weight: 1 },
  { label: 'Generating summary...',   weight: 3 },
  { label: 'Finishing up...',         weight: 1 },
]

const STEPS_VOICE = [
  { label: 'Reading audio file...',   weight: 1 },
  { label: 'Transcribing speech...',  weight: 3 },
  { label: 'Analyzing content...',    weight: 2 },
  { label: 'Building summary...',     weight: 2 },
  { label: 'Wrapping up...',          weight: 1 },
]

const PATIENCE_MESSAGES = [
  'Processing time varies with video length.',
  'Longer videos take a bit more time.',
  'Almost there — hang tight!',
  'Complex content takes a little longer to analyze.',
  'Feel free to cancel and try again later.',
]

function buildThresholds(steps: { label: string; weight: number }[]) {
  const total = steps.reduce((s, step) => s + step.weight, 0)
  let acc = 0
  return steps.map(step => {
    acc += (step.weight / total) * 100
    return acc
  })
}

function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

interface LoadingStepsProps {
  currentStep: number
  mode?: 'youtube' | 'pdf' | 'url' | 'voice'
  onCancel?: () => void
}

export default function LoadingSteps({ currentStep, mode = 'youtube', onCancel }: LoadingStepsProps) {
  const STEPS = mode === 'pdf' ? STEPS_PDF : mode === 'url' ? STEPS_URL : mode === 'voice' ? STEPS_VOICE : STEPS_YOUTUBE
  const STEP_THRESHOLDS = buildThresholds(STEPS)
  const [displayProgress, setDisplayProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [stepElapsed, setStepElapsed] = useState(0)
  const [patienceIdx, setPatienceIdx] = useState(0)
  const stepStartRef = useRef<number>(Date.now())
  const totalStartRef = useRef<number>(Date.now())

  useEffect(() => {
    totalStartRef.current = Date.now()
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - totalStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    stepStartRef.current = Date.now()
    setStepElapsed(0)
    setPatienceIdx(0)
    const t = setInterval(() => {
      setStepElapsed(Math.floor((Date.now() - stepStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [currentStep])

  useEffect(() => {
    if (stepElapsed > 0 && stepElapsed % 30 === 0) {
      setPatienceIdx(prev => (prev + 1) % PATIENCE_MESSAGES.length)
    }
  }, [stepElapsed])

  useEffect(() => {
    if (currentStep < 1) return
    const completedPct = currentStep > 1 ? STEP_THRESHOLDS[currentStep - 2] : 0
    const stepEndPct = STEP_THRESHOLDS[currentStep - 1]
    const slowTarget = completedPct + (stepEndPct - completedPct) * 0.88
    setDisplayProgress(completedPct)
    const timer = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev >= slowTarget) return prev
        const speed = Math.max(0.15, (slowTarget - prev) * 0.06)
        return Math.min(prev + speed, slowTarget)
      })
    }, 120)
    return () => clearInterval(timer)
  }, [currentStep])

  const isLongWait = stepElapsed >= 30

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const idx = i + 1
          const isDone   = currentStep > idx
          const isActive = currentStep === idx
          return (
            <div key={step.label} className="flex items-center gap-3 text-sm">
              <span className="text-lg w-6 text-center shrink-0">
                {isDone ? '✅' : isActive ? (
                  <span className="inline-block animate-spin">⏳</span>
                ) : '⬜'}
              </span>
              <span className={
                isDone   ? 'text-[var(--text-subtle)] line-through' :
                isActive ? 'text-[var(--text-primary)] font-medium' :
                           'text-[var(--text-muted)]'
              }>
                {step.label}
                {isActive && stepElapsed > 0 && (
                  <span className="ml-2 text-[var(--text-subtle)] text-xs font-normal">
                    ({formatElapsed(stepElapsed)})
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>

      {isLongWait && (
        <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] px-4 py-3 text-center">
          <p className="text-[var(--text-muted)] text-xs leading-relaxed transition-all duration-500">
            💡 {PATIENCE_MESSAGES[patienceIdx]}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className={isLongWait ? 'animate-pulse' : ''}>
          <Progress value={displayProgress} className="h-2" />
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] tabular-nums">
          <span>{formatElapsed(elapsed)} elapsed</span>
          <span>{Math.round(displayProgress)}%</span>
        </div>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-subtle)] text-sm hover:bg-[var(--bg-elevated-2)] hover:text-white hover:border-[var(--border-strong)] transition-all"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
