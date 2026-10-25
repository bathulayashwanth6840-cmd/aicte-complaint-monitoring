import React, { forwardRef } from 'react'
import { Search, X } from 'lucide-react'

export const Input = forwardRef(function Input(
  {
    label,
    id,
    type = 'text',
    error,
    helperText,
    icon: Icon = null,
    isSearch = false,
    onClear,
    value,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative rounded-lg shadow-xs">
        {isSearch && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
        )}

        {Icon && !isSearch && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          className={`block w-full rounded-lg border text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150
            ${isSearch || Icon ? 'pl-9' : 'pl-3.5'}
            ${onClear && value ? 'pr-9' : 'pr-3.5'}
            py-2
            ${
              error
                ? 'border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
            }
            bg-white focus:outline-none disabled:bg-slate-50 disabled:text-slate-500
            ${className}`}
          {...props}
        />

        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label="Clear input"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-1 text-xs text-rose-600 font-medium" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  )
})
