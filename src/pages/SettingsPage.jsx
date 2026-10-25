import React, { useState } from 'react'
import {
  Settings,
  Sliders,
  Shield,
  Save,
  CheckCircle2,
  Clock,
  Layers,
  BellRing,
} from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Button } from '../components/ui/Button'
import { useToast } from '../context/ToastContext'

export function SettingsPage({ onNavigateTab }) {
  const { addToast } = useToast()

  const [slaDays, setSlaDays] = useState('15')
  const [overlapThreshold, setOverlapThreshold] = useState('75')
  const [autoEscalateDays, setAutoEscalateDays] = useState('30')
  const [notifyNodalSms, setNotifyNodalSms] = useState(true)
  const [requireDualSignoff, setRequireDualSignoff] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveSettings = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      addToast({
        title: 'Regulatory Parameters Saved',
        message: 'Updated AICTE Portal thresholds and SLA rules across all regional nodes.',
        type: 'success',
      })
    }, 600)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Breadcrumb
        title="Regulatory Parameters & Portal Configuration"
        subtitle="Manage national SLA resolution limits, algorithmic overlap sensitivity, and automated supervisory escalation rules."
        items={[{ label: 'Dashboard', onClick: () => onNavigateTab('dashboard') }, { label: 'Settings' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            isLoading={isSaving}
            onClick={handleSaveSettings}
          >
            Save Parameters
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: SLA Thresholds */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Clock className="h-4 w-4 text-blue-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Grievance Resolution SLA Thresholds
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Standard Resolution Window (Days)
                </label>
                <select
                  value={slaDays}
                  onChange={(e) => setSlaDays(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  <option value="15">15 Working Days (Standard Statutory SLA)</option>
                  <option value="21">21 Working Days (Extended Regulatory)</option>
                  <option value="30">30 Calendar Days (Maximum Cap)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Complaints exceeding this period are marked as "Overdue" and flagged on the dashboard.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Executive Escalation Threshold (Days)
                </label>
                <select
                  value={autoEscalateDays}
                  onChange={(e) => setAutoEscalateDays(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  <option value="25">25 Days (Early Alert)</option>
                  <option value="30">30 Days (Direct Notice to Vice Chancellor)</option>
                  <option value="45">45 Days (Mandatory Fact-Finding Committee)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dispatches automated high-priority show-cause notices to college management.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Overlap Detection Tuning */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Layers className="h-4 w-4 text-purple-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Cross-Bureau Overlap Engine Tuning
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Duplicate Entity Similarity Cutoff ({overlapThreshold}%)
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={overlapThreshold}
                  onChange={(e) => setOverlapThreshold(e.target.value)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>50% (Loose Matching)</span>
                  <span className="font-bold text-blue-700">{overlapThreshold}% (Recommended)</span>
                  <span>95% (Exact Keywords Only)</span>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireDualSignoff}
                    onChange={(e) => setRequireDualSignoff(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      Enforce Dual Bureau Sign-off for Overlapping Cases
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Requires approvals from both Primary and Secondary Bureau Heads before a case can be closed.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Portal Security & System Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>National Node Security</span>
            </div>

            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Security Clearance:</span>
                <span className="font-semibold text-emerald-700">Level 4 (Cert-In Verified)</span>
              </div>
              <div className="flex justify-between">
                <span>Central Encrypted Storage:</span>
                <span className="font-semibold text-slate-800">AES-256 Enabled</span>
              </div>
              <div className="flex justify-between">
                <span>Active Server Time:</span>
                <span className="font-mono text-slate-700">2026-10-25 UTC</span>
              </div>
              <div className="flex justify-between">
                <span>Portal Protocol:</span>
                <span className="font-mono text-slate-700">TLS 1.3 / NIC VPN</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-lg p-5 shadow-sm space-y-3 text-xs">
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-blue-400" />
              <span>Notification Dispatchers</span>
            </h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Direct web-hook links dispatch official reminders to Vice Chancellors and Institutional Nodal Officers whenever SLA deadlines reach within 72 hours.
            </p>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px]">
              <span className="text-slate-400">SMS Gateway:</span>
              <span className="text-emerald-400 font-semibold">Active (Govt. NIC SMS)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
