import React from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-600 shrink-0" />,
  }

  const borderStyles = {
    success: 'border-l-4 border-l-emerald-600 bg-white',
    error: 'border-l-4 border-l-rose-600 bg-white',
    warning: 'border-l-4 border-l-amber-600 bg-white',
    info: 'border-l-4 border-l-blue-600 bg-white',
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 shadow-lg text-slate-800 transition-all transform translate-y-0 ${
            borderStyles[toast.type] || borderStyles.info
          }`}
        >
          {icons[toast.type] || icons.info}

          <div className="flex-1 text-xs">
            {toast.title && (
              <h4 className="font-semibold text-slate-900 mb-0.5">
                {toast.title}
              </h4>
            )}
            <p className="text-slate-600 leading-normal">{toast.message}</p>
          </div>

          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded focus:outline-none"
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
