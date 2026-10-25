import React from 'react'
import { ChevronRight, Home } from 'lucide-react'

export function Breadcrumb({
  items = [],
  title,
  subtitle,
  badge = null,
  actions = null,
  onNavigateHome,
}) {
  return (
    <div className="mb-6 space-y-2">
      {/* Breadcrumb Trail */}
      {items.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500">
          <ol className="flex items-center space-x-1.5 sm:space-x-2">
            <li>
              <button
                type="button"
                onClick={onNavigateHome}
                className="flex items-center text-slate-500 hover:text-blue-700 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                title="Go to Dashboard"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="sr-only">Home</span>
              </button>
            </li>
            {items.map((item, index) => {
              const isLast = index === items.length - 1
              return (
                <li key={item.label} className="flex items-center space-x-1.5 sm:space-x-2">
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  {isLast ? (
                    <span className="font-medium text-slate-800" aria-current="page">
                      {item.label}
                    </span>
                  ) : item.onClick ? (
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="text-slate-500 hover:text-blue-700 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className="text-slate-500">{item.label}</span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      {/* Page Title & Actions Row */}
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
