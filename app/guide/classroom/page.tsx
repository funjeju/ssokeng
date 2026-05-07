import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'YouTube Classroom for Teachers — Auto AI Worksheet & Student Management | SSOKENG',
  description: 'Turn YouTube videos into classroom materials. AI auto-generates worksheets, distribute via class code, and manage student progress on a dashboard. EdTech tools for teachers and instructors.',
  keywords: ['youtube education', 'youtube classroom materials', 'teacher youtube worksheet', 'youtube edtech', 'student learning management', 'youtube flipped learning', 'english class youtube', 'youtube worksheet automation'],
}

export default function ClassroomGuidePage() {
  return (
    <article className="flex flex-col gap-10 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span>
          <span className="text-white">Classroom</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">🎓 Teachers — Any YouTube Video Becomes a Classroom Worksheet in 10 Seconds</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          YouTube is full of great educational videos, but turning them into classroom materials takes time. SSOKENG <strong className="text-white">Classroom</strong> automatically converts YouTube videos into AI worksheets, distributes them to students via a single class code, and lets you monitor who studied what and when on a dashboard. Built for teachers, instructors, and tutors.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-lime-500 pl-3">Who needs this feature</h2>
        <ul className="flex flex-col gap-2">
          {[
            'English teachers who want to use TED or BBC videos in class',
            'Academy instructors who turn YouTube lectures into online study materials',
            'Middle and high school teachers implementing flipped learning',
            'Professors or instructors who want students to submit assignments after watching videos',
            'Educational institution staff who want to systematically track student learning history',
          ].map(t => (
            <li key={t} className="flex items-start gap-2 text-[var(--text-muted)] text-sm">
              <span className="text-lime-400 mt-0.5 shrink-0">✓</span>{t}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-lime-500 pl-3">Classroom features in detail</h2>
        <div className="flex flex-col gap-3">
          {[
            { icon: '🏫', title: 'Create a class & share a code', desc: 'Generate a class code and share it via message or email — the learning environment is immediately set up. Students access it in any smartphone browser without installing an app.' },
            { icon: '📄', title: 'AI worksheet auto-generation', desc: 'Summarize a YouTube video and a worksheet is automatically generated with fill-in-the-blanks, key questions, and discussion points matched to learning objectives. English videos are adjusted to CEFR A1–C2 levels.' },
            { icon: '📊', title: 'Learning progress dashboard', desc: 'See at a glance which students accessed which materials and when, and what the worksheet completion rate is. You can also send reminders to students who haven\'t participated.' },
            { icon: '📱', title: 'Student mobile access', desc: 'Students access study materials on their smartphones with just the class code — no registration or installation required. Supports both iOS and Android.' },
          ].map(item => (
            <div key={item.title} className="flex gap-4 bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-lime-500 pl-3">Classroom use scenarios</h2>
        <div className="flex flex-col gap-3">
          {[
            { icon: '🔤', title: 'English class — TED video worksheets', desc: 'Summarize a TED talk to the appropriate CEFR level and distribute it as a worksheet with key vocabulary, expressions, and discussion questions. Assign as pre-class homework and use class time for discussion.' },
            { icon: '📰', title: 'Social studies / History — News 5W1H analysis', desc: 'Distribute AI-organized news YouTube videos in 5W1H format. Helps students understand the context of events in a structured way.' },
            { icon: '🍳', title: 'Home economics / Vocational — Practical video guides', desc: 'Extract step-by-step processes from cooking, woodworking, or coding YouTube tutorials and convert them into checklists and practical guides. Students can follow along without pausing the video.' },
          ].map(item => (
            <div key={item.title} className="flex gap-3 bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="text-xl shrink-0">{item.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-lime-500/10 border border-lime-500/20 rounded-2xl p-5">
        <h2 className="text-lime-400 font-bold text-sm mb-3">Recommended subjects for Classroom</h2>
        <div className="grid grid-cols-3 gap-2">
          {['English', 'Social studies', 'History', 'Science', 'Economics', 'Ethics', 'Home economics', 'Vocational', 'Coding / IT'].map(t => (
            <div key={t} className="bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5 text-[var(--text-muted)] text-xs text-center">{t}</div>
          ))}
        </div>
        <p className="text-[var(--text-subtle)] text-xs mt-3">Worksheets can be generated from any educational YouTube video with captions.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-lime-500 pl-3">Frequently asked questions</h2>
        <div className="flex flex-col gap-2">
          {[
            { q: 'Is there a student limit?', a: 'The basic plan has a per-class student limit. For school or academy-wide use, please contact us about the Education Institution plan.' },
            { q: 'How does CEFR level adjustment work?', a: 'When generating a worksheet, select the target student\'s English level from A1 to C2 and vocabulary difficulty and question complexity will be automatically adjusted.' },
          ].map(item => (
            <div key={item.q} className="bg-[var(--bg-elevated)] rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-1">Q. {item.q}</p>
              <p className="text-[var(--text-subtle)] text-xs leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/mypage" className="px-5 py-2.5 bg-lime-700 hover:bg-lime-600 text-white font-bold text-sm rounded-xl transition-colors">
          Get started with Classroom
        </Link>
        <Link href="/guide/square" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          ← Square guide
        </Link>
      </div>
    </article>
  )
}
