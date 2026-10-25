import React, { useState, useRef, useEffect } from 'react'
import {
  Menu,
  Search,
  Bell,
  User,
  ChevronDown,
  LogOut,
  Shield,
  Building,
  Check,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as dataService from '../../services/dashboardService'
import { MOCK_NOTIFICATIONS } from '../../data/mockAicteData'

export function TopNav({
  onToggleMobileSidebar,
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
}) {
  const { currentUser, switchUser, availableUsers } = useAuth()
  const { addToast } = useToast()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const profileRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    let isMounted = true
    dataService.getNotifications()
      .then((res) => {
        if (isMounted) {
          setNotifications(res.data || [])
          setUnreadCount(res.unreadCount || 0)
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotifications(MOCK_NOTIFICATIONS)
          setUnreadCount(MOCK_NOTIFICATIONS.filter((n) => !n.read).length)
        }
      })
    return () => { isMounted = false }
  }, [activeTab])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const unreadNotifCount = unreadCount

  const handleRoleSwitch = (user) => {
    switchUser(user.id)
    setIsProfileOpen(false)
    addToast({
      title: 'Switched User Profile',
      message: `Operating as ${user.name} (${user.role} - ${user.bureau})`,
      type: 'info',
    })
  }

  const handleNotificationClick = (notif) => {
    setIsNotifOpen(false)
    if (notif.linkTarget) {
      onSelectTab(notif.linkTarget)
    }
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 shadow-2xs">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            aria-label="Open sidebar navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Quick Universal Registry Search */}
          <div className="relative w-full max-w-md hidden sm:block">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by Institution PID, Case ID, or College Name..."
              value={searchQuery || ''}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
            />
          </div>
        </div>

        {/* Right Side: Quick Tools, Notifications, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* AICTE Portal Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-700 border border-slate-200">
            <Shield className="h-3.5 w-3.5 text-blue-700" />
            <span>AICTE HQ • Central Cell</span>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotifOpen(!isNotifOpen)
                setIsProfileOpen(false)
              }}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-blue-600"
              title="Notifications"
              aria-expanded={isNotifOpen}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50 animate-fadeIn">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Official Alerts & Notices
                  </span>
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    {unreadNotifCount} unread
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-2.5 ${
                        !n.read ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          n.type === 'critical'
                            ? 'bg-rose-600'
                            : n.type === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-slate-900 truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5 text-[11px] line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-2 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotifOpen(false)
                      onSelectTab('notifications')
                    }}
                    className="text-xs text-blue-700 font-semibold hover:underline"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(!isProfileOpen)
                setIsNotifOpen(false)
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-expanded={isProfileOpen}
              aria-label="User Profile Menu"
            >
              {/* Officer Initials Avatar */}
              <div className="w-8 h-8 rounded-lg bg-blue-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {currentUser.name
                  .split(' ')
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')}
              </div>

              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                  {currentUser.name}
                </p>
                <p className="text-[10px] font-medium text-slate-500 truncate max-w-[140px]">
                  {currentUser.role}
                </p>
              </div>

              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50 animate-fadeIn">
                {/* Active User Information */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-blue-800 bg-blue-50 px-2 py-1 rounded">
                    <Shield className="h-3 w-3 shrink-0" />
                    <span className="truncate">{currentUser.bureau}</span>
                  </div>
                </div>

                {/* Role Switcher Demo Tool */}
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Demo Role Switcher (RBAC)
                  </span>
                  <div className="space-y-1">
                    {availableUsers.map((u) => {
                      const isCurrent = u.id === currentUser.id
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleRoleSwitch(u)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition ${
                            isCurrent
                              ? 'bg-blue-600 text-white font-medium'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-semibold">{u.name}</span>
                            <span className="block text-[10px] opacity-80">{u.role}</span>
                          </div>
                          {isCurrent && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false)
                      onSelectTab('settings')
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span>System & Portal Preferences</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false)
                      addToast({
                        title: 'Session Locked',
                        message: 'Demo session locked for security compliance.',
                        type: 'info',
                      })
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
