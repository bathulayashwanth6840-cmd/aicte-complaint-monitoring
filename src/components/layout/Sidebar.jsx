import React from 'react'
import {
  LayoutDashboard,
  Building2,
  FileText,
  AlertOctagon,
  History,
  BarChart3,
  Bell,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'institutions', label: 'Institutions', icon: Building2 },
  { id: 'complaints', label: 'Complaints & Cases', icon: FileText, badge: '7' },
  { id: 'overlap', label: 'Overlap Alerts', icon: AlertOctagon, badge: '2', badgeVariant: 'danger' },
  { id: 'action-history', label: 'Action History', icon: History },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell, badge: '4', badgeVariant: 'warning' },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({
  activeTab,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) {
  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200 flex flex-col transition-all duration-200 ease-in-out
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Main Navigation"
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Government / AICTE Monogram Emblem */}
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs border border-blue-950">
              AICTE
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs text-slate-900 truncate tracking-tight uppercase">
                  Govt. of India
                </span>
                <span className="font-semibold text-[11px] text-blue-700 truncate">
                  Grievance & Overlap Portal
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition focus:outline-none focus:ring-1 focus:ring-blue-600"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="mb-2 px-3">
            {!isCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Administration
              </span>
            ) : (
              <div className="h-px bg-slate-200 my-2" />
            )}
          </div>

          <nav className="space-y-1">
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id)
                    if (onCloseMobile) onCloseMobile()
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-150 relative group ${
                    isActive
                      ? 'bg-blue-50 text-blue-800 font-semibold shadow-2xs border border-blue-200/80'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />

                  {!isCollapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}

                  {!isCollapsed && item.badge && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        item.badgeVariant === 'danger'
                          ? 'bg-rose-100 text-rose-800'
                          : item.badgeVariant === 'warning'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Indicator Pip when active and collapsed */}
                  {isCollapsed && isActive && (
                    <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Portal Status Footer in Sidebar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          {!isCollapsed ? (
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  System Operational
                </span>
                <span className="text-[10px] font-mono text-slate-400">v2.4</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                National Grievance Network • Central Security Clearance
              </p>
            </div>
          ) : (
            <div className="flex justify-center" title="System Operational">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
