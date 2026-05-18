'use client'

interface Props {
  id: string
  text: string
  author: string
  color: string   // tailwind bg class e.g. 'bg-yellow-200'
  onDelete?: () => void
  canDelete?: boolean
}

export default function ClassWallCard({ text, author, color, onDelete, canDelete }: Props) {
  return (
    <div className={`relative rounded-xl p-3 shadow-md ${color} text-zinc-800 flex flex-col gap-1 min-h-[80px] group`}>
      <p className="text-sm leading-snug whitespace-pre-wrap break-words flex-1">{text}</p>
      <p className="text-[10px] font-semibold text-zinc-500 text-right">{author}</p>
      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-black/20 hover:bg-red-400/80 text-white text-[10px] flex items-center justify-center leading-none"
        >
          ✕
        </button>
      )}
    </div>
  )
}
