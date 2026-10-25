import React, { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { StateView } from '../components/ui/StateView'
import { useToast } from '../context/ToastContext'
import * as dataService from '../services/dashboardService'
import { api } from '../services/apiClient'

export function NotificationsPage({ onNavigateTab }) {
  const { addToast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await dataService.getNotifications()
      setNotifications(res.data || [])
    } catch (err) {
      setError(err.message || 'Unable to retrieve notifications from server.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    try {
      await dataService.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      addToast({
        title: 'Notifications Updated',
        message: 'All notifications marked as read in database.',
        type: 'info',
      })
    } catch (err) {
      addToast({
        title: 'Operation Failed',
        message: err.message || 'Could not mark notifications read.',
        type: 'error',
      })
    }
  }

  const handleClearNotification = async (id) => {
    try {
      await dataService.markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }
  }

  const handleTriggerDeadlineScan = async () => {
    setIsScanning(true)
    try {
      const res = await api.triggerDeadlineScan()
      addToast({
        title: 'Deadline Monitoring Scan Complete',
        message: `Inspected ${res.details?.scanned_cases || 0} cases. Generated ${res.details?.notifications_generated || 0} alerts (Overdue: ${res.details?.overdue_cases || 0}, Approaching: ${res.details?.approaching_cases || 0}).`,
        type: 'success',
      })
      await fetchNotifications()
    } catch (err) {
      addToast({
        title: 'Scan Error',
        message: err.message || 'Could not execute deadline monitoring scan.',
        type: 'error',
      })
    } finally {
      setIsScanning(false)
    }
  }

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === 'ALL') return true
    if (activeFilter === 'OVERDUE') {
      return notif.title.toLowerCase().includes('overdue') || notif.title.toLowerCase().includes('escalation')
    }
    if (activeFilter === 'APPROACHING') {
      return notif.title.toLowerCase().includes('approaching')
    }
    if (activeFilter === 'OVERLAP') {
      return notif.title.toLowerCase().includes('overlap')
    }
    if (activeFilter === 'PENDING') {
      return notif.title.toLowerCase().includes('pending')
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Breadcrumb
        title="Official Notifications & SLA Overdue Alerts"
        subtitle="Priority escalation notices, approaching-deadline reminders, and cross-bureau coordination flags."
        items={[{ label: 'Dashboard', onClick: () => onNavigateTab('dashboard') }, { label: 'Notifications' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              isLoading={isScanning}
              onClick={handleTriggerDeadlineScan}
            >
              Scan Deadlines & SLAs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
            >
              Mark All Read
            </Button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'ALL', label: 'All Notifications', count: notifications.length },
          {
            id: 'OVERDUE',
            label: 'Overdue & Escalations',
            count: notifications.filter((n) => n.title.toLowerCase().includes('overdue') || n.title.toLowerCase().includes('escalation')).length,
          },
          {
            id: 'APPROACHING',
            label: 'Approaching Deadlines',
            count: notifications.filter((n) => n.title.toLowerCase().includes('approaching')).length,
          },
          {
            id: 'OVERLAP',
            label: 'Cross-Bureau Overlaps',
            count: notifications.filter((n) => n.title.toLowerCase().includes('overlap')).length,
          },
          {
            id: 'PENDING',
            label: 'Pending Reminders',
            count: notifications.filter((n) => n.title.toLowerCase().includes('pending')).length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeFilter === tab.id
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeFilter === tab.id ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <StateView type="loading" title="Fetching Notifications..." message="Syncing with central alert dispatcher." />
      ) : error ? (
        <StateView
          type="error"
          title="Notification Dispatch Error"
          message={error}
          action={<Button variant="outline" size="sm" onClick={fetchNotifications}>Retry</Button>}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No notifications matching the selected filter criteria.
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                  !notif.read ? 'bg-blue-50/20' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      notif.type === 'critical'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : notif.type === 'warning'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {notif.type === 'critical' ? (
                      <ShieldAlert className="h-4 w-4" />
                    ) : notif.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-slate-900">{notif.title}</h3>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" title="Unread" />
                      )}
                      {notif.caseId && (
                        <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                          {notif.caseId}
                        </Badge>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {notif.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {notif.linkTarget && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateTab(notif.linkTarget)}
                    >
                      Inspect
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleClearNotification(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
                    title="Mark as read"
                    aria-label="Mark as read"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
