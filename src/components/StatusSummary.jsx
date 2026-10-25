import React from 'react'
import { LedCard } from './LedCard'
import { Cpu, Clock, Radio, Activity, CheckCircle2, AlertCircle } from 'lucide-react'

export function StatusSummary({
  deviceId,
  isOnline,
  lastReading,
  totalCount,
  gpioRedPin,
  gpioGreenPin,
  offlineTimeoutSec,
  secondsAgo
}) {
  const formatExactTime = (dateStr) => {
    if (!dateStr) return 'No readings yet'
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString()
    } catch {
      return dateStr
    }
  }

  const redState = lastReading ? lastReading.red_led : false
  const greenState = lastReading ? lastReading.green_led : false

  return (
    <div className="space-y-4">
      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Device Information Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Target Hardware</span>
              <Cpu className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-lg font-bold text-slate-900 font-mono break-all">
                {deviceId || 'ESP32-DEVICE'}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">Espressif ESP32-WROOM-32</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Link State</span>
            <span className={`font-semibold flex items-center gap-1 ${
              isOnline ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {isOnline ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  Disconnected
                </>
              )}
            </span>
          </div>
        </div>

        {/* Last-Seen Timestamp Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Heartbeat / Last Seen</span>
              <Clock className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-slate-900">
                {secondsAgo !== null ? `${secondsAgo}s ago` : 'Never'}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono truncate" title={lastReading?.created_at}>
                {formatExactTime(lastReading?.created_at)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Timeout Threshold</span>
            <span className="font-medium text-slate-700 font-mono">
              {offlineTimeoutSec}s max
            </span>
          </div>
        </div>

        {/* Red LED Card */}
        <LedCard
          color="red"
          state={redState}
          pin={gpioRedPin}
          label="Red LED Status"
        />

        {/* Green LED Card */}
        <LedCard
          color="green"
          state={greenState}
          pin={gpioGreenPin}
          label="Green LED Status"
        />

      </div>
    </div>
  )
}
