import React from 'react'
import { AlertTriangle, RefreshCw, PlayCircle, Key, FileCode } from 'lucide-react'

export function ErrorState({ error, onRetry, onSwitchToDemo, isRetrying }) {
  return (
    <div className="bg-white rounded-xl border border-rose-200 p-8 sm:p-12 shadow-sm text-left max-w-2xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
          <AlertTriangle className="h-6 w-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-base font-bold text-slate-900">Database Connection Issue</h3>
          <p className="text-xs text-rose-600 font-mono mt-1 bg-rose-50 p-2.5 rounded-lg border border-rose-100 break-all">
            {error?.message || 'Failed to query Supabase device_readings table'}
          </p>

          <div className="mt-4 space-y-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800 block">Common causes and solutions:</span>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong>Missing database schema:</strong> Did you run the SQL migration in <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">supabase/schema.sql</code>?
              </li>
              <li>
                <strong>Environment variables:</strong> Ensure <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">VITE_SUPABASE_URL</code> and <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">.env</code> are correct.
              </li>
              <li>
                <strong>Row Level Security (RLS):</strong> Verify the SELECT policy is enabled for anon access on <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">device_readings</code>.
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>Retry Connection</span>
            </button>

            <button
              onClick={onSwitchToDemo}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-700 border border-amber-300 hover:bg-amber-500/20 transition"
            >
              <PlayCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Continue in Demo Mode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
