import React from 'react'
import { Inbox, PlayCircle, ArrowRight, Radio } from 'lucide-react'

export function EmptyState({ onSwitchToDemo, onRefresh, isRefreshing }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center shadow-sm">
      <div className="max-w-md mx-auto">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100">
          <Inbox className="h-7 w-7" />
        </div>
        
        <h3 className="text-lg font-bold text-slate-900">No Telemetry Readings Found</h3>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Your cloud database connection is established, but no readings have been received in the <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 text-xs font-mono">device_readings</code> table yet.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onSwitchToDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
          >
            <PlayCircle className="h-4 w-4" />
            <span>Preview with Demo Data</span>
          </button>
          
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition"
          >
            <Radio className="h-4 w-4 text-slate-500" />
            <span>Check for New Packets</span>
          </button>
        </div>

        <div className="mt-8 p-3.5 bg-slate-50 rounded-lg text-left text-xs text-slate-600 border border-slate-200/80">
          <span className="font-semibold text-slate-800 block mb-1">To send your first packet:</span>
          <p>
            Start your Wokwi ESP32 simulation or send a POST request to your ingestion endpoint. The dashboard will automatically detect incoming readings.
          </p>
        </div>
      </div>
    </div>
  )
}
