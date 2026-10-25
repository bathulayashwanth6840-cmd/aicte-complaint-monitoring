import React from 'react'

export function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full tracking-wide transition-colors'

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] leading-tight',
    md: 'px-2.5 py-1 text-xs leading-none',
    lg: 'px-3 py-1 text-xs leading-normal font-semibold',
  }

  // Pre-configured government/administrative badge palettes (accessible contrast)
  const variantStyles = {
    default: 'bg-slate-100 text-slate-800 border border-slate-200/80',
    primary: 'bg-blue-50 text-blue-800 border border-blue-200/80',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-900 border border-amber-200/90',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200/80',
    info: 'bg-sky-50 text-sky-800 border border-sky-200/80',
    purple: 'bg-purple-50 text-purple-800 border border-purple-200/80',

    // Status-specific aliases
    'Resolved': 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    'Closed': 'bg-slate-100 text-slate-700 border border-slate-300',
    'Hearing Scheduled': 'bg-purple-50 text-purple-800 border border-purple-200',
    'In Investigation': 'bg-blue-50 text-blue-800 border border-blue-200',
    'Action Initiated': 'bg-amber-50 text-amber-900 border border-amber-200',
    'Assigned': 'bg-sky-50 text-sky-800 border border-sky-200',
    'Submitted': 'bg-slate-100 text-slate-800 border border-slate-200',

    // Priority-specific aliases
    'Critical': 'bg-rose-100 text-rose-900 border border-rose-300 font-semibold',
    'High': 'bg-amber-100 text-amber-900 border border-amber-300 font-medium',
    'Medium': 'bg-blue-50 text-blue-800 border border-blue-200',
    'Low': 'bg-slate-100 text-slate-700 border border-slate-200',

    // Overlap alert specific
    'Overlap Detected': 'bg-rose-50 text-rose-800 border border-rose-300 animate-pulse font-semibold',
  }

  const selectedVariant = variantStyles[variant] || variantStyles.default

  return (
    <span className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${selectedVariant} ${className}`}>
      {children}
    </span>
  )
}
