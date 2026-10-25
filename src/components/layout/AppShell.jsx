import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { ToastContainer } from '../ui/Toast'

export function AppShell({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  children,
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
      {/* Skip to Content Accessible Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 z-50 bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-lg"
      >
        Skip to main administrative content
      </a>

      {/* Main Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Column */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Navigation */}
        <TopNav
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />

        {/* Dynamic Page Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto outline-none"
        >
          {children}
        </main>

        {/* Official Portal Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div>
              <span className="font-semibold text-slate-700">
                All India Council for Technical Education (AICTE)
              </span>{' '}
              • Ministry of Education, Govt. of India
            </div>
            <div className="text-[11px] text-slate-400">
              National Institutional Grievance & Cross-Bureau Overlap Monitoring Network
            </div>
          </div>
        </footer>
      </div>

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  )
}
