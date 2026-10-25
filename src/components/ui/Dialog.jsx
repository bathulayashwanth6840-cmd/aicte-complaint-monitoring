import React, { useEffect } from 'react'
import { X, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { Button } from './Button'

export function Dialog({
  isOpen = false,
  onClose,
  title,
  description,
  type = 'warning', // 'warning', 'danger', 'info', 'success'
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  isLoading = false,
  children,
  size = 'md', // 'sm', 'md', 'lg'
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }

  const iconStyles = {
    warning: <AlertTriangle className="h-6 w-6 text-amber-600" />,
    danger: <AlertTriangle className="h-6 w-6 text-rose-600" />,
    info: <Info className="h-6 w-6 text-blue-600" />,
    success: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
  }

  const iconBgStyles = {
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-rose-50 border-rose-200',
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-emerald-50 border-emerald-200',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className={`bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden w-full ${
          sizeStyles[size] || sizeStyles.md
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${
                iconBgStyles[type] || iconBgStyles.warning
              }`}
            >
              {iconStyles[type]}
            </div>
            <div>
              <h2 id="dialog-title" className="text-base font-bold text-slate-900">
                {title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 py-4 space-y-3">
          {description && (
            <p className="text-sm text-slate-600 leading-relaxed">
              {description}
            </p>
          )}
          {children}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>

          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
