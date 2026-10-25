import React from 'react'
import { X, Sliders, Shield, Zap, Clock, Cpu, Check } from 'lucide-react'

export function SettingsModal({
  isOpen,
  onClose,
  offlineTimeoutSec,
  onSaveOfflineTimeout,
  autoRefreshInterval,
  onSaveAutoRefreshInterval,
  gpioRedPin,
  onSaveGpioRedPin,
  gpioGreenPin,
  onSaveGpioGreenPin,
  filterDeviceId,
  onSaveFilterDeviceId,
  isConfigured
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-blue-400" />
            <h2 className="text-base font-bold">Dashboard & Hardware Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Offline Timeout setting */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Device Offline Timeout Threshold</span>
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Mark the ESP32 as offline if no new telemetry packet is received within this duration.
            </p>
            <div className="grid grid-cols-4 gap-2 mt-2.5">
              {[15, 30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  onClick={() => onSaveOfflineTimeout(sec)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                    offlineTimeoutSec === sec
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sec} sec
                </button>
              ))}
            </div>
          </div>

          {/* Auto Refresh Interval */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Auto-Refresh Polling Frequency</span>
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Interval between automated cloud database checks.
            </p>
            <div className="grid grid-cols-4 gap-2 mt-2.5">
              {[
                { label: 'Off', val: 0 },
                { label: '3s', val: 3000 },
                { label: '5s', val: 5000 },
                { label: '10s', val: 10000 }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => onSaveAutoRefreshInterval(opt.val)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                    autoRefreshInterval === opt.val
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Configurable GPIO Pin Labels */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Cpu className="h-4 w-4 text-indigo-600" />
              <span>Wokwi Circuit GPIO Pin Mapping</span>
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Adjust GPIO pin numbers to mirror your physical or Wokwi breadboard wiring.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Red LED GPIO Pin
                </label>
                <input
                  type="number"
                  value={gpioRedPin}
                  onChange={(e) => onSaveGpioRedPin(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Green LED GPIO Pin
                </label>
                <input
                  type="number"
                  value={gpioGreenPin}
                  onChange={(e) => onSaveGpioGreenPin(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Device ID Filter */}
          <div className="pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Filter by Device ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. esp32-wokwi-demo (leave blank for all)"
              value={filterDeviceId}
              onChange={(e) => onSaveFilterDeviceId(e.target.value)}
              className="mt-1.5 w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Cloud Diagnostics */}
          <div className="pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>Cloud Configuration Status</span>
            </div>
            <div className="mt-2 text-xs space-y-1 text-slate-600">
              <div className="flex items-center justify-between">
                <span>Supabase Environment:</span>
                <span className={`font-semibold ${isConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isConfigured ? 'Configured (.env)' : 'Default / Not Set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Vite Client Mode:</span>
                <span className="font-mono text-[11px] text-slate-500">production-ready</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  )
}
