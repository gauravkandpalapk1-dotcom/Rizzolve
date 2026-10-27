import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import DashboardOverview from './DashboardOverview'
import DoubtBoardsView from '../doubts/DoubtBoardsView'
import ImmersiveBackground from '../background/ImmersiveBackground'
import {
  MessageSquareQuote,
  Users,
  Sparkles,
  Coins,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  CheckCircle,
} from 'lucide-react'

export default function DashboardShell({ currentUser, onSignOut, onReplayIntro }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverview
            currentUser={currentUser}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )

      case 'doubts':
        return (
          <DoubtBoardsView
            currentUser={currentUser}
            onOpenAiChat={() => setActiveTab('ai-chat')}
          />
        )


      case 'communities':
        return (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#111111] border border-white/10 shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ff0c0c]">
              Module: Academic Communities
            </span>
            <h2 className="text-2xl sm:text-[2rem] font-bold text-white mt-1">
              Public & Private Communities
            </h2>
            <p className="text-sm text-white/70 mt-1 max-w-xl">
              Collaborate within your verified college cohort, department groups, or platform-wide study circles.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: 'Apex CS Class of 2026',
                  type: 'Private College Cohort',
                  members: '184 Members',
                  status: 'Joined',
                },
                {
                  title: 'Competitive Programming Guild',
                  type: 'Public Community',
                  members: '2,420 Members',
                  status: 'Joined',
                },
                {
                  title: 'GATE & Higher Studies Prep',
                  type: 'Public Community',
                  members: '1,150 Members',
                  status: 'Discover',
                },
              ].map((c, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-[#ff0c0c]/40 transition-all"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#ff0c0c] mb-2 font-medium">
                    <span>{c.type}</span>
                    <span className="text-white/50">{c.members}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{c.title}</h4>
                  <button className="mt-4 w-full py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors">
                    {c.status === 'Joined' ? 'Open Community Hub' : 'Request Access'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )

      case 'ai-chat':
        return (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#111111] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#ff0c0c]/10 rounded-full blur-[100px] pointer-events-none" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#ff0c0c]">
              Module: AI Academic Copilot
            </span>
            <h2 className="text-2xl sm:text-[2rem] font-bold text-white mt-1">
              Multi-Model AI Tutor
            </h2>
            <p className="text-sm text-white/70 mt-1 max-w-xl">
              Ask academic questions, debug coursework, and derive mathematical equations with token-metered models.
            </p>

            <div className="mt-6 p-4 rounded-xl bg-[#0a0a0a] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ff0c0c]/15 text-[#ff0c0c] border border-[#ff0c0c]/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Ready for Academic Prompts
                  </p>
                  <p className="text-xs text-white/50">
                    Active Model: Claude 3.5 Sonnet (STEM Specialized) • 5 Tokens/Prompt
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#ff0c0c] px-3 py-1 rounded-lg bg-[#ff0c0c]/10 border border-[#ff0c0c]/30">
                🪙 450 Tokens Ready
              </span>
            </div>
          </div>
        )

      case 'wallet':
        return (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#111111] border border-white/10 shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ff0c0c]">
              Module: Token Wallet & Ledger
            </span>
            <h2 className="text-2xl sm:text-[2rem] font-bold text-white mt-1">
              Student Platform Credits
            </h2>
            <p className="text-sm text-white/70 mt-1 max-w-xl">
              Tokens are earned by solving doubts and providing accepted solutions to peers. Tokens can be spent on AI reasoning runs.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-gradient-to-br from-[#ff0c0c]/15 to-transparent border border-[#ff0c0c]/30">
                <p className="text-xs text-white/60">Current Balance</p>
                <p className="text-3xl font-black text-white mt-1">
                  🪙 {currentUser?.tokenBalance ?? 450}
                </p>
                <p className="text-[11px] text-emerald-400 mt-2 font-medium">
                  +50 Welcome Bonus Included
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-xs text-white/60">Total Earned (Lifetime)</p>
                <p className="text-3xl font-black text-white mt-1">🪙 620</p>
                <p className="text-[11px] text-white/50 mt-2">
                  From 12 accepted peer answers
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-xs text-white/60">Total Spent on AI</p>
                <p className="text-3xl font-black text-white mt-1">🪙 170</p>
                <p className="text-[11px] text-white/50 mt-2">
                  34 AI queries processed
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="relative min-h-screen bg-transparent text-[#fef9f8] flex overflow-x-hidden">
      {/* 1. Live Spider-Man Background Video Running Behind the Dashboard */}
      <ImmersiveBackground />

      {/* 2. Main Dashboard Content Layer */}
      <div className="relative z-10 flex w-full min-h-screen">
        {/* Sidebar Navigation (Desktop and Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tabId) => setActiveTab(tabId)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          currentUser={currentUser}
          onSignOut={onSignOut}
        />

        {/* Main Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <Header
            currentUser={currentUser}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onSignOut={onSignOut}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onReplayIntro={onReplayIntro}
          />

          {/* Main Content Area: Clean, padded container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {renderContent()}
          </main>

          {/* Minimal Dashboard Footer */}
          <footer className="border-t border-white/[0.06] py-4 px-6 text-xs text-white/40 flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#090b12]/40 backdrop-blur-md">
            <span>&copy; {new Date().getFullYear()} Rizzolve SaaS Platform • Multi-College Academic Network</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="hover:text-white cursor-pointer transition-colors">Honor Code</span>
              <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
              <span className="hover:text-white cursor-pointer transition-colors">API Status</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
