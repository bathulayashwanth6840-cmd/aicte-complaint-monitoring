import React, { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Pagination } from './Pagination'

export function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  isLoading = false,
  emptyMessage = 'No matching records found in database.',
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  pagination = null, // Optional { currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }
  className = '',
  onRowClick,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const handleSort = (columnKey) => {
    if (!columnKey) return
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { key: columnKey, direction: 'asc' }
    })
  }

  // Client-side sort if keys are specified
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [data, sortConfig])

  // Select all handler
  const handleSelectAll = (e) => {
    if (!onSelectionChange) return
    if (e.target.checked) {
      onSelectionChange(data.map((row) => row[keyField]))
    } else {
      onSelectionChange([])
    }
  }

  // Row select handler
  const handleSelectRow = (e, rowKey) => {
    e.stopPropagation()
    if (!onSelectionChange) return
    if (selectedKeys.includes(rowKey)) {
      onSelectionChange(selectedKeys.filter((k) => k !== rowKey))
    } else {
      onSelectionChange([...selectedKeys, rowKey])
    }
  }

  const isAllSelected = data.length > 0 && selectedKeys.length === data.length

  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-xs tracking-wider uppercase">
              {selectable && (
                <th scope="col" className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = sortConfig.key === (col.sortKey || col.accessorKey)
                const isSortable = Boolean(col.sortable || col.sortKey || col.accessorKey)

                return (
                  <th
                    key={col.header}
                    scope="col"
                    style={{ width: col.width }}
                    className={`px-4 py-3 select-none ${col.headerClassName || ''} ${
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.sortKey || col.accessorKey)}
                        className="inline-flex items-center gap-1.5 group font-semibold text-slate-700 hover:text-slate-950 focus:outline-none"
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                        )}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {selectable && (
                    <td className="px-4 py-3 text-center">
                      <div className="h-4 w-4 bg-slate-200 rounded mx-auto" />
                    </td>
                  )}
                  {columns.map((_, cIdx) => (
                    <td key={`skel-col-${cIdx}`} className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-slate-500 text-xs sm:text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => {
                const rowKey = row[keyField] || index
                const isSelected = selectedKeys.includes(rowKey)

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/50'
                    } ${isSelected ? 'bg-blue-50/60' : ''}`}
                  >
                    {selectable && (
                      <td className="w-10 px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(e, rowKey)}
                          aria-label={`Select row ${rowKey}`}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}

                    {columns.map((col, cIdx) => (
                      <td
                        key={cIdx}
                        className={`px-4 py-3 text-slate-700 ${col.cellClassName || ''} ${
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {col.cell ? col.cell(row) : row[col.accessorKey]}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  )
}
