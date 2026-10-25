import React from 'react'
import { Lightbulb, Activity } from 'lucide-react'

export function LedCard({ color, state, pin, label }) {
  const isRed = color === 'red'
  const isOn = Boolean(state)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Background ambient tint when turned ON */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          isOn 
            ? isRed 
              ? 'bg-red-500/5' 
              : 'bg-emerald-500/5'
            : 'opacity-0'
        }`} 
      />

      <div className="relative flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Output Indicator
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            {label || (isRed ? 'Red LED' : 'Green LED')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-mono">
            <span>GPIO Pin {pin}</span>
            <span className="text-slate-300">•</span>
            <span>Digital Out</span>
          </p>
        </div>

        {/* Status Pill Badge */}
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
          isOn
            ? isRed
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {isOn ? 'STATE: ON' : 'STATE: OFF'}
        </span>
      </div>

      {/* Visual Realistic LED Bezel & Bulb */}
      <div className="mt-5 flex items-center gap-4 pt-4 border-t border-slate-100">
        <div className="relative flex items-center justify-center">
          {/* Outer Industrial Metallic Ring */}
          <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 shadow-inner flex items-center justify-center p-1">
            {/* LED Lens */}
            <div
              className={`w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center ${
                isOn
                  ? isRed
                    ? 'bg-red-500 border-2 border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                    : 'bg-emerald-500 border-2 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                  : isRed
                    ? 'bg-red-950/60 border border-red-900/40 shadow-inner opacity-75'
                    : 'bg-emerald-950/60 border border-emerald-900/40 shadow-inner opacity-75'
              }`}
            >
              {/* Internal Reflector Highlight */}
              <div
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  isOn
                    ? 'bg-white/80 blur-[1px]'
                    : 'bg-white/10'
                }`}
              />
            </div>
          </div>
        </div>

        {/* LED Diagnostic Text */}
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800">
            {isOn ? (
              <span className={isRed ? 'text-red-600' : 'text-emerald-600'}>
                Active Signal High (3.3V)
              </span>
            ) : (
              <span className="text-slate-500">
                Idle Signal Low (0.0V)
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-slate-400" />
            <span>Logic: {isOn ? 'HIGH (1)' : 'LOW (0)'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
