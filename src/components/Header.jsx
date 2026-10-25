import React from 'react'
import { Cpu, RefreshCw, Settings, Wifi, WifiOff, ShieldCheck, PlayCircle, Database } from 'lucide-react'

export function Header({
  isOnline,
  lastSeenText,
  isRefreshing,
  onRefresh,
  autoRefreshInterval,
  isDemoMode,
  onToggleDemoMode,
  onOpenSettings,
  isConfigured
}) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">ESP32 Cloud Dashboard</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                IoT Telemetry & State Monitor • Wokwi & Supabase
              </p>
            </div>
          </div>

          {/* Status & Controls */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            
            {/* Mode Switcher Badge */}
            <button
              onClick={onToggleDemoMode}
              title={isDemoMode ? "Click to switch to Live Supabase database mode" : "Click to switch to Demo Simulation mode"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                isDemoMode
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {isDemoMode ? (
                <>
                  <PlayCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span>DEMO MODE</span>
                </>
              ) : (
                <>
                  <Database className="h-3.5 w-3.5 text-emerald-400" />
                  <span>LIVE CLOUD</span>
                </>
              )}
            </button>

            {/* Online / Offline Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
            }`}>
              <span className="relative flex h-2.5 w-2.5">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              <span>{isOnline ? 'Device Online' : 'Device Offline'}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
              title="Manually fetch latest telemetry readings"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Settings Trigger */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Dashboard Settings & Thresholds"
            >
              <Settings className="h-4 w-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  )
}
