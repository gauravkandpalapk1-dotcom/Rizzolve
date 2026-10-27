import { useState } from 'react'
import {
  TrendingUp,
  ThumbsUp,
  MessageSquare,
  Coins,
  ArrowRight,
  Flame,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react'

export default function TrendingQuestions({ onNavigateTab }) {
  const [filter, setFilter] = useState('all')

  const initialQuestions = [
    {
      id: 1,
      title: 'How does Peterson’s algorithm guarantee mutual exclusion without atomic hardware instructions (like TSL)?',
      snippet: 'I am struggling to understand step 3 in Tanenbaum where turn and interested flags interact concurrently in memory...',
      subject: 'Operating Systems',
      subjectCode: 'CS-302',
      author: 'Kavya Sharma',
      authorBatch: 'Sem 4 CS',
      upvotes: 42,
      userUpvoted: false,
      answersCount: 5,
      hasAcceptedAnswer: true,
      bounty: 30,
      time: '18m ago',
      category: 'cs',
    },
    {
      id: 2,
      title: 'Intuitive geometric explanation for why SVD eigenvectors are orthogonal in A^T A and A A^T',
      snippet: 'When mapping a sphere into an ellipsoid, why do the principal axes preserve orthogonality under linear transformations?',
      subject: 'Applied Mathematics',
      subjectCode: 'MA-201',
      author: 'Dev Mukherjee',
      authorBatch: 'Sem 3 CS',
      upvotes: 38,
      userUpvoted: true,
      answersCount: 3,
      hasAcceptedAnswer: false,
      bounty: 45,
      time: '42m ago',
      category: 'math',
    },
    {
      id: 3,
      title: 'Difference between TCP CUBIC and BBR congestion control in high-latency satellite links',
      snippet: 'Loss-based vs bottleneck bandwidth estimation: why does packet loss unfairly penalize CUBIC when RTT is high?',
      subject: 'Computer Networks',
      subjectCode: 'CS-301',
      author: 'Rohan Patel',
      authorBatch: 'Sem 4 CS',
      upvotes: 29,
      userUpvoted: false,
      answersCount: 6,
      hasAcceptedAnswer: true,
      bounty: 20,
      time: '1h ago',
      category: 'cs',
    },
    {
      id: 4,
      title: 'Proof for Red-Black tree insertion needing maximum 2 rotations while deletion may need 3',
      snippet: 'Can someone provide a concise invariant breakdown for recoloring cases vs rotation restructuring?',
      subject: 'Data Structures',
      subjectCode: 'CS-204',
      author: 'Ankit Verma',
      authorBatch: 'Sem 4 CS',
      upvotes: 23,
      userUpvoted: false,
      answersCount: 2,
      hasAcceptedAnswer: false,
      bounty: 50,
      time: '3h ago',
      category: 'cs',
    },
    {
      id: 5,
      title: 'Why is Boyce-Codd Normal Form (BCNF) strictly stronger than 3NF, and what dependency loss can occur?',
      snippet: 'Looking for a clean real-world college database example showing FD preservation failure in BCNF decomposition...',
      subject: 'Database Management',
      subjectCode: 'CS-304',
      author: 'Sneha Rao',
      authorBatch: 'Sem 4 CS',
      upvotes: 19,
      userUpvoted: false,
      answersCount: 4,
      hasAcceptedAnswer: true,
      bounty: 25,
      time: '4h ago',
      category: 'db',
    },
  ]

  const [questions, setQuestions] = useState(initialQuestions)

  const handleToggleUpvote = (id, e) => {
    e.stopPropagation()
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const newUpvoted = !q.userUpvoted
          return {
            ...q,
            userUpvoted: newUpvoted,
            upvotes: newUpvoted ? q.upvotes + 1 : q.upvotes - 1,
          }
        }
        return q
      })
    )
  }

  const filteredQuestions = questions.filter((q) => {
    if (filter === 'bounty') return q.bounty >= 30
    if (filter === 'unresolved') return !q.hasAcceptedAnswer
    return true
  })

  return (
    <div className="rounded-2xl bg-slate-950/35 border border-white/[0.08] p-5 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:border-cyan-500/25">
      <div>
        {/* Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                Trending Academic Doubts
              </h3>
              <p className="text-xs text-slate-400">
                Most discussed peer questions across campus this semester
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/[0.08] rounded-xl self-start sm:self-auto text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Trending
            </button>
            <button
              onClick={() => setFilter('bounty')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'bounty'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              High Bounty
            </button>
            <button
              onClick={() => setFilter('unresolved')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'unresolved'
                  ? 'bg-rose-500/20 text-rose-300 shadow-sm border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Needs Answer
            </button>
          </div>
        </div>

        {/* List of Questions */}
        <div className="space-y-3">
          {filteredQuestions.map((q) => (
            <div
              key={q.id}
              onClick={() => onNavigateTab && onNavigateTab('doubts')}
              className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-cyan-400/40 transition-all cursor-pointer group"
            >
              {/* Meta Top Line */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/25">
                    {q.subject}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    By {q.author} ({q.authorBatch})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {q.hasAcceptedAnswer ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle className="w-3 h-3" />
                      <span>Resolved</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <Clock className="w-3 h-3" />
                      <span>Open</span>
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">
                    {q.time}
                  </span>
                </div>
              </div>

              {/* Title & Snippet */}
              <h4 className="text-sm sm:text-base font-semibold text-white group-hover:text-cyan-200 transition-colors leading-snug">
                {q.title}
              </h4>
              <p className="text-xs text-slate-300/70 mt-1 line-clamp-2 leading-relaxed">
                {q.snippet}
              </p>

              {/* Action & Stats Footer */}
              <div className="mt-3.5 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  {/* Interactive Upvote Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleUpvote(q.id, e)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      q.userUpvoted
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:border-cyan-400/40'
                    }`}
                    title="Upvote this academic doubt"
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${q.userUpvoted ? 'fill-cyan-400' : ''}`} />
                    <span>{q.upvotes}</span>
                  </button>

                  {/* Answers Count */}
                  <div className="flex items-center gap-1 text-slate-300">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{q.answersCount} answers</span>
                  </div>

                  {/* Bounty Tokens Badge */}
                  <div className="flex items-center gap-1 text-amber-400 font-medium">
                    <Coins className="w-3.5 h-3.5" />
                    <span>+{q.bounty} Tokens</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400 group-hover:text-cyan-300 font-medium transition-colors">
                  <span>Open Thread</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Explore Link */}
      <div className="mt-4 pt-3 border-t border-white/[0.08] text-center">
        <button
          onClick={() => onNavigateTab && onNavigateTab('doubts')}
          className="text-xs font-medium text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer inline-flex items-center gap-1.5"
        >
          <span>View all 148 active syllabus discussions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
