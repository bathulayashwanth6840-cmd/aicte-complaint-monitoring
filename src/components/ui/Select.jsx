import React, { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

export const Select = forwardRef(function Select(
  {
    label,
    id,
    options = [],
    error,
    helperText,
    value,
    onChange,
    className = '',
    containerClassName = '',
    placeholder = 'Select an option',
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative rounded-lg shadow-xs">
        <select
          ref={ref}
          id={selectId}
          value={value}
          onChange={onChange}
          className={`block w-full appearance-none rounded-lg border text-sm text-slate-900 transition-colors duration-150 pl-3.5 pr-9 py-2 bg-white
            ${
              error
                ? 'border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
            }
            focus:outline-none disabled:bg-slate-50 disabled:text-slate-500
            ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-slate-400">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
          <ChevronDown className="h-4 w-4" />
        </div>
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
