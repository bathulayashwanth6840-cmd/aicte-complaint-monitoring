import React from 'react'
import { Loader2 } from 'lucide-react'

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = 'left',
  onClick,
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none'

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-xs sm:text-sm gap-2',
    lg: 'px-4 py-2.5 text-sm gap-2.5',
    icon: 'p-2 text-slate-600 hover:text-slate-900',
  }

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs border border-blue-600',
    secondary: 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs border border-slate-800',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs hover:border-slate-400',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-rose-600',
    subtleDanger: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-600',
  }

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-current" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="h-4 w-4 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="h-4 w-4 shrink-0" />}
        </>
      )}
    </button>
  )
}
