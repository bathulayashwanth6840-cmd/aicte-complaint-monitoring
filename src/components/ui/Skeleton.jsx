import React from 'react'
import { Loader2 } from 'lucide-react'

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200/80 ${className}`}
      {...props}
    />
  )
}

export function Spinner({ size = 'md', className = '', label = 'Loading...' }) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-2" role="status">
      <Loader2
        className={`animate-spin text-blue-600 ${sizeMap[size] || sizeMap.md} ${className}`}
      />
      {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3.5 w-36" />
    </div>
  )
}
