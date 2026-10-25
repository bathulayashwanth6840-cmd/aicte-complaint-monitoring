import React, { useState, useEffect, useCallback } from 'react'
import {
  AlertOctagon,
  ShieldAlert,
  ArrowRight,
  Link as LinkIcon,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  FileCheck,
  RefreshCw,
  XCircle,
  HelpCircle,
  Clock,
  Shield,
  Filter,
} from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { StateView } from '../components/ui/StateView'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import * as dataService from '../services/dashboardService'
import { api } from '../services/apiClient'

export function OverlapAlertsPage({ onNavigateTab }) {
  const { addToast } = useToast()
  const { currentUser } = useAuth()

  const [overlaps, setOverlaps] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isScanning, setIsScanning] = useState(false)

  // Review Dialog State
  const [selectedOverlap, setSelectedOverlap] = useState(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState('COORDINATION') // 'COORDINATION', 'CONFIRM', 'REJECT'
  const [leadBureau, setLeadBureau] = useState('PGRC')
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const fetchOverlaps = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (dataService.isDemoMode()) {
        const demoData = await dataService.getPotentialOverlaps(10)
        setOverlaps(demoData)
      } else {
        const res = await api.getOverlaps({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          limit: 50,
        })
        setOverlaps(res.data || [])
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve cross-bureau overlap records.')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchOverlaps()
  }, [fetchOverlaps])

  // Trigger On-Demand Overlap Detection Scan
  const handleTriggerScan = async () => {
    setIsScanning(true)
    try {
      if (!dataService.isDemoMode()) {
        const res = await api.triggerDatabaseOverlapScan()
        addToast({
          title: 'Detection Engine Scan Complete',
          message: `Inspected ${res.details?.checked_case_pairs || 0} case pairs. Identified ${res.details?.new_overlaps_detected || 0} new potential conflicts.`,
          type: 'success',
        })
      } else {
        addToast({
          title: 'Demo Scan Complete',
          message: 'Analyzed in-memory complaints for cross-bureau duplication.',
          type: 'info',
        })
      }
      fetchOverlaps()
    } catch (err) {
      addToast({
        title: 'Scan Error',
        message: err.message || 'Could not complete overlap scan.',
        type: 'error',
      })
    } finally {
      setIsScanning(false)
    }
  }

  // Open Review Dialog
  const handleOpenReview = (overlap, actionType) => {
    setSelectedOverlap(overlap)
    setReviewAction(actionType)
    if (actionType === 'COORDINATION') {
      setLeadBureau(overlap.first_case?.bureau || 'PGRC')
      setReviewRemarks(
        `Coordinate joint hearing between ${overlap.first_case?.bureau || 'Primary'} and ${overlap.second_case?.bureau || 'Secondary'} under AICTE Rule 8(c).`
      )
    } else if (actionType === 'CONFIRM') {
      setReviewRemarks('Confirmed institutional cross-bureau overlap based on verified AICTE Permanent ID.')
    } else if (actionType === 'REJECT') {
      setReviewRemarks('Investigated by authorized officer: grievances concern independent subject matters; no joint hearing required.')
    }
    setIsReviewDialogOpen(true)
  }

  // Submit Review Workflow
  const handleReviewSubmit = async () => {
    if (!reviewRemarks.trim()) {
      addToast({
        title: 'Remarks Required',
        message: 'Please provide official rationale and directives for this review decision.',
        type: 'warning',
      })
      return
    }

    let targetStatus = 'Coordination Mandated'
    if (reviewAction === 'CONFIRM') targetStatus = 'Confirmed'
    if (reviewAction === 'REJECT') targetStatus = 'Rejected'
    if (reviewAction === 'COORDINATION') targetStatus = 'Joint Hearing Constituted'

    setIsSubmittingReview(true)
    try {
      const reviewerName = currentUser?.name || 'Authorized AICTE Official'
      await api.reviewOverlap(selectedOverlap.id, {
        review_status: targetStatus,
        reviewed_by: reviewerName,
        review_remarks: reviewRemarks.trim(),
      })

      addToast({
        title: `Review Decision Recorded: ${targetStatus}`,
        message: `Decision logged in immutable audit history for both linked cases. Original records preserved.`,
        type: 'success',
      })
      setIsReviewDialogOpen(false)
      fetchOverlaps()
    } catch (err) {
      addToast({
        title: 'Decision Submission Failed',
        message: err.message || 'Could not commit review decision to database.',
        type: 'error',
      })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const pendingCount = overlaps.filter((o) => o.review_status === 'Pending Review').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <Breadcrumb
        title="Potential Overlapping Cases - Coordination Required"
        subtitle="Algorithmic identification of interconnected complaints across RB, PGRC, AB and Cells. Facilitates cross-bureau coordination while strictly preserving distinct case records."
        items={[{ label: 'Dashboard', onClick: () => onNavigateTab('dashboard') }, { label: 'Overlap Alerts' }]}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs border border-rose-300">
            {pendingCount} Pending Coordination Alerts
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              isLoading={isScanning}
              onClick={handleTriggerScan}
            >
              Run Overlap Detection Scan
            </Button>
          </div>
        }
      />

      {/* Operational Protocol & Safeguards Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-700" />
              Automated AICTE Bureau De-duplication & Conflict Resolution Protocol
            </h3>
            <p className="text-xs text-blue-900 leading-relaxed max-w-3xl">
              When an institution is simultaneously under inquiry in <strong>Public Grievance Redressal Cell (PGRC)</strong>,{' '}
              <strong>Regulation Bureau (RB)</strong>, or <strong>Approval Bureau (AB)</strong>, this engine alerts designated officials
              to constitute a coordinated hearing, avoiding duplicate notices or conflicting compliance orders.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-blue-300 text-blue-800 font-semibold">
              Rule 8(c) Enforced
            </span>
            <span className="text-[10px] text-blue-700 font-medium">Original dockets preserved unaltered</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Review Status Filter:</span>
          {['ALL', 'Pending Review', 'Joint Hearing Constituted', 'Confirmed', 'Rejected'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                statusFilter === status
                  ? 'bg-blue-800 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 font-mono">Showing {overlaps.length} relationships</span>
      </div>

      {/* Overlaps Content */}
      {isLoading ? (
        <StateView type="loading" title="Analyzing Inter-Bureau Case Graph..." message="Cross-referencing active bureau dockets in database." />
      ) : error ? (
        <StateView
          type="error"
          title="Failed to Load Overlap Alerts"
          message={error}
          action={<Button variant="outline" size="sm" onClick={fetchOverlaps}>Retry</Button>}
        />
      ) : overlaps.length === 0 ? (
        <StateView
          type="empty"
          title="No Overlap Alerts Found"
          message="No matching case relationships found matching the selected filter criteria."
        />
      ) : (
        <div className="space-y-5">
          {overlaps.map((alert) => {
            const isPending = alert.review_status === 'Pending Review'
            const isConfirmed = alert.review_status === 'Confirmed' || alert.review_status === 'Joint Hearing Constituted' || alert.review_status === 'Coordination Mandated'
            const isRejected = alert.review_status === 'Rejected'

            return (
              <div
                key={alert.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 sm:p-6 space-y-4"
              >
                {/* Top Bar: Alert ID, Severity, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-sm">ALERT #{alert.id}</span>
                      <span className="text-slate-400 text-xs ml-2 font-mono">
                        Status: <strong className="text-slate-700">{alert.review_status}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        alert.relationship_type.includes('Duplicate')
                          ? 'warning'
                          : alert.relationship_type.includes('Suggestion')
                          ? 'neutral'
                          : 'danger'
                      }
                    >
                      {alert.relationship_type}
                    </Badge>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                        isPending
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : isConfirmed
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {alert.review_status}
                    </span>
                  </div>
                </div>

                {/* Institution Under Dual Scrutiny */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Target Institution Under Scrutiny
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">
                      {alert.institution_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {alert.institution_pid && (
                        <span className="text-xs font-mono bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                          AICTE PID: {alert.institution_pid}
                        </span>
                      )}
                      {alert.institution_internal_id && (
                        <span className="text-xs font-mono text-slate-500">
                          Internal ID: {alert.institution_internal_id}
                        </span>
                      )}
                      {alert.region && (
                        <span className="text-xs text-slate-500 font-medium">
                          Region: {alert.region}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inter-Bureau Case Comparison Grid */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Case 1 */}
                  <div className="flex-1 w-full bg-white p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                        Primary Bureau Docket
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {alert.first_case?.id || alert.first_case_id}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {alert.first_case?.bureau} Bureau
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-1">
                      Category: {alert.first_case?.category || 'General Grievance'}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Status: <strong className="text-slate-700">{alert.first_case?.status}</strong></span>
                      <span>Received: {alert.first_case?.received_date || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
                      Conflict Overlap
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 my-1 hidden md:block" />
                  </div>

                  {/* Case 2 */}
                  <div className="flex-1 w-full bg-white p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                        Secondary Bureau Docket
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {alert.second_case?.id || alert.second_case_id}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {alert.second_case?.bureau} Bureau
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-1">
                      Category: {alert.second_case?.category || 'General Grievance'}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Status: <strong className="text-slate-700">{alert.second_case?.status}</strong></span>
                      <span>Received: {alert.second_case?.received_date || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Matching Rationale Box */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                    Algorithmic Matching Reason
                  </span>
                  <p className="text-slate-700 leading-relaxed font-mono">
                    {alert.matching_reason}
                  </p>
                </div>

                {/* Audit & Review History */}
                {alert.reviewed_by && (
                  <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px]">
                        Review Decision Record
                      </span>
                      <span className="text-[11px] text-emerald-800 font-mono">
                        {alert.review_timestamp ? alert.review_timestamp.replace('T', ' ').substring(0, 19) : ''}
                      </span>
                    </div>
                    <p className="text-slate-700">
                      <strong>Reviewed By:</strong> {alert.reviewed_by} | <strong>Status:</strong> {alert.review_status}
                    </p>
                    {alert.review_remarks && (
                      <p className="text-slate-600 italic">"{alert.review_remarks}"</p>
                    )}
                  </div>
                )}

                {/* Action Controls */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateTab('complaints')}
                    >
                      Inspect Cases
                    </Button>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={XCircle}
                        onClick={() => handleOpenReview(alert, 'REJECT')}
                      >
                        Reject Suggestion
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={CheckCircle2}
                        onClick={() => handleOpenReview(alert, 'CONFIRM')}
                      >
                        Confirm Relationship
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Users}
                        onClick={() => handleOpenReview(alert, 'COORDINATION')}
                      >
                        Convene Joint Bureau Hearing
                      </Button>
                    </div>
                  )}

                  {!isPending && (
                    <div className="text-xs text-slate-500 font-medium">
                      Review concluded. Original case records remain preserved in central database.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review Workflow Modal */}
      <Dialog
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        title={
          reviewAction === 'COORDINATION'
            ? `Convene Joint Bureau Coordination Hearing`
            : reviewAction === 'CONFIRM'
            ? `Confirm Cross-Bureau Overlap`
            : `Reject Overlap Suggestion`
        }
        type={reviewAction === 'REJECT' ? 'danger' : 'warning'}
        confirmText={
          reviewAction === 'COORDINATION'
            ? 'Dispatch Coordination Directive'
            : reviewAction === 'CONFIRM'
            ? 'Confirm Relationship'
            : 'Reject Suggestion'
        }
        cancelText="Cancel"
        onConfirm={handleReviewSubmit}
        isLoading={isSubmittingReview}
      >
        <div className="space-y-4 text-xs">
          {/* Safeguards Warning Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Shield className="h-4 w-4 text-amber-700" />
              Statutory Safeguard Notice
            </div>
            <p className="text-[11px] leading-relaxed">
              Neither confirming nor rejecting an overlap will delete, merge, or alter the substantive complaint records.
              Both case files remain independent and traceable in the national audit registry.
            </p>
          </div>

          <div>
            <span className="font-semibold text-slate-800 block mb-0.5">Target Institution:</span>
            <p className="text-slate-900 font-bold text-sm">{selectedOverlap?.institution_name}</p>
            <p className="text-slate-500 font-mono text-[11px]">
              AICTE PID: {selectedOverlap?.institution_pid || 'Unverified Record'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Case A</span>
              <span className="font-mono font-bold text-blue-700">{selectedOverlap?.first_case?.id || selectedOverlap?.first_case_id}</span>
              <span className="text-slate-600 block">{selectedOverlap?.first_case?.bureau} Bureau</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Case B</span>
              <span className="font-mono font-bold text-purple-700">{selectedOverlap?.second_case?.id || selectedOverlap?.second_case_id}</span>
              <span className="text-slate-600 block">{selectedOverlap?.second_case?.bureau} Bureau</span>
            </div>
          </div>

          {reviewAction === 'COORDINATION' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Designate Lead Coordination Bureau
              </label>
              <select
                value={leadBureau}
                onChange={(e) => setLeadBureau(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                <option value="RB">Regulation Bureau (RB)</option>
                <option value="AB">Approval Bureau (AB)</option>
                <option value="PAB">Policy & Academic Planning Bureau (PAB)</option>
                <option value="AICTE Central HQ">AICTE Central HQ</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Official Review Decision Remarks & Directives
            </label>
            <textarea
              rows={3}
              value={reviewRemarks}
              onChange={(e) => setReviewRemarks(e.target.value)}
              placeholder="State official reasoning, terms of reference, or basis for rejection..."
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="text-[11px] text-slate-500">
            Reviewing as: <strong>{currentUser?.name || 'Authorized AICTE Official'}</strong> ({currentUser?.role || 'Administrator'})
          </div>
        </div>
      </Dialog>
    </div>
  )
}
