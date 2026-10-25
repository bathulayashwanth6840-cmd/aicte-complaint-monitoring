import React from 'react'
import { ResponsiveContainer } from 'recharts'

export function ChartContainer({
  title,
  subtitle,
  children,
  height = 300,
  action = null,
  periods = null, // e.g. ['30 Days', 'Quarter', 'Annual']
  selectedPeriod = null,
  onPeriodChange = null,
  className = '',
}) {
  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col justify-between ${className}`}
    >
      {/* Chart Header */}
      {(title || subtitle || action || periods) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-4">
          <div>
            {title && (
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            {periods && onPeriodChange && (
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                {periods.map((p) => {
                  const isActive = p === selectedPeriod
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onPeriodChange(p)}
                      className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            )}
            {action}
          </div>
        </div>
      )}

      {/* Chart Body */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
