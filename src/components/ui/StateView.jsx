import React from 'react'
import { FolderOpen, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({
  title = 'No Records Found',
  message = 'There are no active entries matching your filter criteria.',
  icon: Icon = FolderOpen,
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-8 sm:p-12 text-center shadow-xs ${className}`}
    >
      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3.5 border border-slate-200">
          <Icon className="h-6 w-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
          {message}
        </p>

        {actionText && onAction && (
          <div className="mt-5">
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionText}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ErrorState({
  title = 'Failed to Load Information',
  message = 'An unexpected system error occurred while retrieving official records from the database.',
  error,
  onRetry,
  isRetrying = false,
  className = '',
}) {
  const errorMessage = error?.message || (typeof error === 'string' ? error : null)

  return (
    <div
      className={`bg-white rounded-lg border border-rose-200 p-8 sm:p-10 shadow-xs max-w-2xl mx-auto ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
          <AlertCircle className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">{message}</p>

          {errorMessage && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-xs font-mono text-rose-700 break-all">
              {errorMessage}
            </div>
          )}

          {onRetry && (
            <div className="mt-5">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                isLoading={isRetrying}
                onClick={onRetry}
              >
                Retry Request
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function StateView({
  type = 'empty',
  title,
  message,
  action,
  onRetry,
  className = '',
}) {
  if (type === 'error') {
    return (
      <div className={className}>
        <ErrorState
          title={title || 'An Error Occurred'}
          message={message || 'Unable to load records.'}
          onRetry={onRetry}
        />
        {action && <div className="mt-4 text-center">{action}</div>}
      </div>
    )
  }

  if (type === 'loading') {
    return (
      <div
        className={`bg-white rounded-lg border border-slate-200 p-8 sm:p-12 text-center shadow-xs ${className}`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mb-3" />
          <h4 className="text-sm font-bold text-slate-900">{title || 'Loading Records...'}</h4>
          <p className="text-xs text-slate-500 mt-1">{message || 'Fetching real-time updates from database.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <EmptyState
        title={title || 'No Records Found'}
        message={message || 'There are no active entries matching your filter criteria.'}
      />
      {action && <div className="mt-4 text-center">{action}</div>}
    </div>
  )
}
