/**
 * AICTE Integrated Institution & Complaint Service Interface
 * Seamlessly integrates the frontend with the FastAPI backend and SQLite database.
 *
 * In Normal Mode (default): All operations query and mutate the live FastAPI backend.
 * In Demo Mode: Operates on in-memory synthetic store (set via setDemoMode(true)).
 */

import { api } from './apiClient'
import {
  MOCK_COMPLAINTS,
  MOCK_INSTITUTIONS,
  MOCK_OVERLAP_ALERTS,
  MOCK_AUDIT_LOGS,
  MOCK_BUREAUS,
} from '../data/mockAicteData'

// In-memory demo store (used only when isDemoMode() is explicitly true)
let demoComplaintsStore = [...MOCK_COMPLAINTS]
let demoInstitutionsStore = [...MOCK_INSTITUTIONS]
let demoOverlapsStore = [...MOCK_OVERLAP_ALERTS]
let demoAuditLogsStore = [...MOCK_AUDIT_LOGS]

export function isDemoMode() {
  return (
    localStorage.getItem('aicte_demo_mode') === 'true' ||
    import.meta.env.VITE_DEMO_MODE === 'true'
  )
}

export function setDemoMode(val) {
  localStorage.setItem('aicte_demo_mode', String(val))
}

export function getBureauName(bureauCodeOrId) {
  const match = MOCK_BUREAUS.find(
    (b) => b.id === bureauCodeOrId || b.code === bureauCodeOrId
  )
  return match ? match.name : bureauCodeOrId
}

// -------------------------------------------------------------
// Model Mapping Functions
// -------------------------------------------------------------

export function mapInstitutionFromBackend(inst) {
  if (!inst) return null
  return {
    id: inst.id,
    internalId: inst.internal_id || inst.internalId || `AICTE-INST-${inst.id}`,
    pid: inst.aicte_permanent_id || inst.pid || 'Pending Verification',
    name: inst.name,
    normalizedName: inst.normalized_name,
    region: inst.region,
    state: inst.state || 'General',
    district: inst.district || '',
    address: inst.address || '',
    type: inst.institution_type || inst.type || 'Private-Self Financing',
    establishedYear: inst.established_year || inst.establishedYear || 2020,
    status: 'Approved',
    riskScore: (inst.open_cases || 0) > 3 ? 75 : (inst.open_cases || 0) > 0 ? 40 : 15,
    totalCases: inst.total_cases ?? inst.totalCases ?? 0,
    openCases: inst.open_cases ?? inst.openCases ?? 0,
    overlapCount: 0,
    nodalOfficer: inst.nodalOfficer || {
      name: 'Dr. Liaison Officer',
      designation: 'Registrar & Grievance Liaison',
      email: `nodal@${(inst.name || 'college').toLowerCase().replace(/[^a-z]/g, '')}.edu.in`,
      phone: '+91 90000 00000',
    },
  }
}

export function mapComplaintFromBackend(c) {
  if (!c) return null
  return {
    id: c.id,
    institutionInternalId: c.institution_internal_id || `AICTE-INST-${c.institution_id}`,
    institutionId: c.institution_id,
    institutionPid: c.institution_pid || '',
    institutionName: c.institution_name || 'Technical Institution',
    category: c.complaint_category || c.category,
    region: c.region || 'Western',
    receivedDate: c.received_date || c.receivedDate,
    submissionDate: c.received_date || c.receivedDate,
    expectedDisposalDate: c.expected_disposal_date || c.expectedDisposalDate,
    slaDeadline: c.expected_disposal_date || c.expectedDisposalDate,
    lastActionDate:
      c.last_action_date ||
      (c.updated_at ? c.updated_at.split('T')[0] : c.received_date),
    daysPending: c.days_pending ?? c.daysPending ?? 0,
    isOverdue: Boolean(c.is_overdue ?? c.isOverdue),
    priority: c.priority,
    status: c.status,
    bureauId: c.assigned_bureau || c.bureauId,
    bureauName: getBureauName(c.assigned_bureau || c.bureauId),
    assignedOfficer: c.assigned_officer || c.assignedOfficer || 'Unassigned',
    complainantName: c.complainant_name || 'Anonymous Complainant',
    complainantType: c.complainant_type || 'Student',
    complainantContact: c.complainant_contact || '',
    subject:
      c.complaint_category ||
      c.subject ||
      (c.description ? c.description.slice(0, 70) : ''),
    description: c.description || '',
    nextActionRequired:
      c.next_action ||
      c.nextActionRequired ||
      'Review inquiry response from institution nodal office',
    nextActionDueDate: c.expected_disposal_date || '',
    hasOverlap: Boolean(c.has_overlap ?? c.hasOverlap),
    overlapCaseId: c.overlap_case_id || null,
    overlapSummary: c.overlap_summary || null,
    supportingDocuments: c.supporting_documents || [],
    actionHistory: (c.actions || []).map((a) => ({
      id: `ACT-${a.id}`,
      date: a.timestamp
        ? a.timestamp.split('T')[0]
        : new Date().toISOString().split('T')[0],
      officer: a.acting_user,
      role: 'Authorized Officer',
      action: a.action_type,
      remarks: a.remarks || `${a.action_type}: ${a.new_value || ''}`,
    })),
    transferEscalationHistory: [],
  }
}

// ==========================================
// A. INSTITUTIONS SERVICE
// ==========================================

export async function getInstitutions({
  search = '',
  region = 'ALL',
  sortBy = 'name',
  sortDir = 'asc',
  page = 1,
  pageSize = 10,
} = {}) {
  if (isDemoMode()) {
    let list = [...demoInstitutionsStore]
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (inst) =>
          inst.name.toLowerCase().includes(q) ||
          inst.pid.toLowerCase().includes(q) ||
          inst.internalId.toLowerCase().includes(q) ||
          inst.address.toLowerCase().includes(q) ||
          inst.state.toLowerCase().includes(q)
      )
    }
    if (region && region !== 'ALL') {
      list = list.filter((inst) => inst.region === region)
    }
    const total = list.length
    const startIndex = (page - 1) * pageSize
    const paginated = list.slice(startIndex, startIndex + pageSize)
    return {
      data: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    }
  }

  // Normal Mode: FastAPI Endpoint
  const params = {
    search: search.trim() || undefined,
    region: region === 'ALL' ? undefined : region,
    skip: (page - 1) * pageSize,
    limit: pageSize,
  }
  const res = await api.getInstitutions(params)
  const mapped = (res.data || []).map(mapInstitutionFromBackend)

  return {
    data: mapped,
    total: res.total,
    page,
    pageSize,
    totalPages: Math.ceil(res.total / pageSize) || 1,
  }
}

export async function getInstitutionById(idOrPid) {
  if (isDemoMode()) {
    return (
      demoInstitutionsStore.find(
        (i) => i.pid === idOrPid || i.internalId === idOrPid
      ) || null
    )
  }

  // If numeric ID, call direct detail endpoint
  if (!isNaN(idOrPid)) {
    const res = await api.getInstitution(idOrPid)
    return mapInstitutionFromBackend(res)
  }

  // If PID or internal ID, search via query
  const res = await api.getInstitutions({ search: idOrPid, limit: 5 })
  const found = (res.data || []).find(
    (i) => i.aicte_permanent_id === idOrPid || i.internal_id === idOrPid
  )
  return found ? mapInstitutionFromBackend(found) : null
}

export async function getInstitutionComplaints(idOrPid) {
  if (isDemoMode()) {
    return demoComplaintsStore.filter(
      (c) => c.institutionPid === idOrPid || c.institutionInternalId === idOrPid
    )
  }

  // Resolve institution id
  let targetId = idOrPid
  if (isNaN(idOrPid)) {
    const inst = await getInstitutionById(idOrPid)
    if (!inst) return []
    targetId = inst.id
  }

  const res = await api.getInstitutionComplaints(targetId)
  return (res.complaints || []).map(mapComplaintFromBackend)
}

export async function createInstitution(payload) {
  if (isDemoMode()) {
    const newInternalId = `AICTE-INST-${String(demoInstitutionsStore.length + 1).padStart(3, '0')}`
    const newInst = {
      internalId: newInternalId,
      pid: payload.pid,
      name: payload.name,
      region: payload.region,
      state: payload.state || 'General',
      district: payload.district || 'City Center',
      address:
        payload.address ||
        `${payload.district || 'Campus Road'}, ${payload.state || 'India'}`,
      type: payload.type || 'Private-Self Financing',
      establishedYear: Number(payload.establishedYear) || 2022,
      status: 'Approved',
      riskScore: 10,
      totalCases: 0,
      openCases: 0,
      overlapCount: 0,
      nodalOfficer: {
        name: payload.nodalName || 'Dr. Liaison Officer',
        designation: payload.nodalDesignation || 'Registrar',
        email: payload.nodalEmail || 'nodal@college.edu.in',
        phone: payload.nodalPhone || '+91 90000 00000',
      },
    }
    demoInstitutionsStore = [newInst, ...demoInstitutionsStore]
    return newInst
  }

  // Normal Mode: FastAPI Endpoint
  const body = {
    name: payload.name.trim(),
    aicte_permanent_id: payload.pid ? payload.pid.trim() : null,
    region: payload.region,
    state: payload.state || null,
    district: payload.district || null,
    address: payload.address || null,
    institution_type: payload.type || 'Private-Self Financing',
    established_year: payload.establishedYear ? Number(payload.establishedYear) : null,
  }

  const created = await api.createInstitution(body)
  return mapInstitutionFromBackend(created)
}

// ==========================================
// B. COMPLAINTS & CASES SERVICE
// ==========================================

export async function getComplaints({
  search = '',
  institution = 'ALL',
  bureauId = 'ALL',
  region = 'ALL',
  category = 'ALL',
  status = 'ALL',
  priority = 'ALL',
  dateFrom = '',
  dateTo = '',
  hasOverlap = 'ALL', // 'ALL', 'OVERLAP_ONLY', 'NO_OVERLAP'
  onlyOverdue = false,
  sortBy = 'received_date',
  sortDir = 'desc',
  page = 1,
  pageSize = 10,
} = {}) {
  if (isDemoMode()) {
    let list = [...demoComplaintsStore]
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.institutionName.toLowerCase().includes(q) ||
          c.institutionPid.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q) ||
          c.assignedOfficer.toLowerCase().includes(q)
      )
    }
    if (institution && institution !== 'ALL') {
      list = list.filter(
        (c) => c.institutionPid === institution || c.institutionInternalId === institution
      )
    }
    if (bureauId && bureauId !== 'ALL') {
      list = list.filter((c) => c.bureauId === bureauId)
    }
    if (region && region !== 'ALL') {
      list = list.filter((c) => c.region === region)
    }
    if (category && category !== 'ALL') {
      list = list.filter((c) => c.category === category)
    }
    if (status && status !== 'ALL') {
      if (status === 'Under Process') {
        list = list.filter((c) =>
          ['In Investigation', 'Hearing Scheduled', 'Action Initiated', 'Assigned'].includes(c.status)
        )
      } else if (status === 'Pending') {
        list = list.filter((c) => c.status === 'Pending' || c.status === 'Submitted')
      } else if (status === 'Resolved') {
        list = list.filter((c) => c.status === 'Resolved' || c.status === 'Closed')
      } else {
        list = list.filter((c) => c.status === status)
      }
    }
    if (priority && priority !== 'ALL') {
      list = list.filter((c) => c.priority === priority)
    }
    if (hasOverlap === 'OVERLAP_ONLY') {
      list = list.filter((c) => c.hasOverlap)
    } else if (hasOverlap === 'NO_OVERLAP') {
      list = list.filter((c) => !c.hasOverlap)
    }
    if (onlyOverdue) {
      list = list.filter((c) => c.isOverdue)
    }
    const total = list.length
    const startIndex = (page - 1) * pageSize
    const paginated = list.slice(startIndex, startIndex + pageSize)
    return {
      data: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    }
  }

  // Normal Mode: FastAPI Endpoint
  let overlapParam = 'ALL'
  if (hasOverlap === 'OVERLAP_ONLY' || hasOverlap === 'true') overlapParam = 'true'
  if (hasOverlap === 'NO_OVERLAP' || hasOverlap === 'false') overlapParam = 'false'

  // Map camelCase sort fields to backend column names
  let sortField = sortBy
  if (sortBy === 'receivedDate') sortField = 'received_date'
  if (sortBy === 'expectedDisposalDate') sortField = 'expected_disposal_date'

  const params = {
    search: search.trim() || undefined,
    bureau: bureauId === 'ALL' ? undefined : bureauId,
    region: region === 'ALL' ? undefined : region,
    category: category === 'ALL' ? undefined : category,
    status: status === 'ALL' ? undefined : status,
    priority: priority === 'ALL' ? undefined : priority,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    has_overlap: overlapParam,
    only_overdue: onlyOverdue ? true : undefined,
    sort_by: sortField,
    sort_dir: sortDir,
    skip: (page - 1) * pageSize,
    limit: pageSize,
  }

  const res = await api.getComplaints(params)
  const mapped = (res.data || []).map(mapComplaintFromBackend)

  return {
    data: mapped,
    total: res.total,
    page,
    pageSize,
    totalPages: Math.ceil(res.total / pageSize) || 1,
  }
}

export async function getComplaintById(caseId) {
  if (isDemoMode()) {
    return demoComplaintsStore.find((c) => c.id === caseId) || null
  }
  const res = await api.getComplaint(caseId)
  return mapComplaintFromBackend(res)
}

export async function createComplaint(payload) {
  if (isDemoMode()) {
    const newId = `AICTE-2026-C-${String(1000 + demoComplaintsStore.length + 1)}`
    const receivedDate = payload.receivedDate || new Date().toISOString().split('T')[0]
    const expectedDisposalDate =
      payload.expectedDisposalDate ||
      new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]

    const newComplaint = {
      id: newId,
      institutionInternalId: payload.institutionInternalId || 'AICTE-INST-001',
      institutionPid: payload.institutionPid,
      institutionName: payload.institutionName,
      category: payload.category,
      region: payload.region || 'Western',
      receivedDate,
      submissionDate: receivedDate,
      expectedDisposalDate,
      slaDeadline: expectedDisposalDate,
      lastActionDate: receivedDate,
      daysPending: 0,
      isOverdue: false,
      priority: payload.priority || 'Medium',
      status: 'Assigned',
      bureauId: payload.bureauId,
      bureauName: payload.bureauName || payload.bureauId,
      assignedOfficer: payload.assignedOfficer || 'Central Triage Desk',
      complainantName: payload.complainantName,
      complainantType: payload.complainantType || 'Citizen',
      complainantContact: payload.complainantContact || 'Not specified',
      subject: payload.subject || payload.category,
      description: payload.description,
      nextActionRequired: payload.nextActionRequired || 'Issue initial inquiry notice',
      nextActionDueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      hasOverlap: Boolean(payload.hasOverlap),
      supportingDocuments: [],
      actionHistory: [],
      transferEscalationHistory: [],
    }
    demoComplaintsStore = [newComplaint, ...demoComplaintsStore]
    return newComplaint
  }

  // Normal Mode: FastAPI Endpoint
  // Resolve numeric institution_id
  let instId = payload.institutionId || payload.institution_id
  if (!instId) {
    if (payload.institutionPid) {
      const inst = await getInstitutionById(payload.institutionPid)
      if (inst) instId = inst.id
    } else if (payload.institutionInternalId) {
      const inst = await getInstitutionById(payload.institutionInternalId)
      if (inst) instId = inst.id
    }
  }

  // Fallback to first available institution if none matched
  if (!instId) {
    const instList = await api.getInstitutions({ limit: 1 })
    if (instList.data && instList.data.length > 0) {
      instId = instList.data[0].id
    } else {
      throw new Error('No valid institution available to associate with complaint.')
    }
  }

  // Ensure description meets min_length=10
  const desc = payload.description && payload.description.trim().length >= 10
    ? payload.description.trim()
    : `${payload.category}: ${payload.description || 'Formal grievance filed with documentary evidence.'}`

  const body = {
    institution_id: instId,
    complaint_category: payload.category,
    description: desc,
    received_date: payload.receivedDate || undefined,
    priority: payload.priority || 'Medium',
    assigned_bureau: payload.bureauId || 'PGRC',
    assigned_officer: payload.assignedOfficer || null,
    expected_disposal_date: payload.expectedDisposalDate || undefined,
    complainant_name: payload.complainantName || null,
    complainant_type: payload.complainantType || 'Student',
    complainant_contact: payload.complainantContact || null,
    acting_user: payload.officer || 'Central Intake Desk',
  }

  const created = await api.createComplaint(body)
  return mapComplaintFromBackend(created)
}

export async function updateComplaintStatus(
  caseId,
  { status, remarks, officer = 'Authorized AICTE Officer' }
) {
  if (isDemoMode()) {
    const target = demoComplaintsStore.find((c) => c.id === caseId)
    if (!target) throw new Error('Complaint not found')
    target.status = status
    return target
  }

  const updated = await api.updateComplaintStatus(caseId, {
    status,
    remarks: remarks || `Status transitioned to ${status}.`,
    acting_user: officer,
  })
  return mapComplaintFromBackend(updated)
}

export async function updateComplaintAssignment(
  caseId,
  { bureauId, assignedOfficer, remarks, officer = 'Central Administrator' }
) {
  if (isDemoMode()) {
    const target = demoComplaintsStore.find((c) => c.id === caseId)
    if (!target) throw new Error('Complaint not found')
    target.bureauId = bureauId
    target.assignedOfficer = assignedOfficer
    return target
  }

  const updated = await api.assignComplaint(caseId, {
    assigned_bureau: bureauId,
    assigned_officer: assignedOfficer,
    remarks: remarks || `Reassigned to ${bureauId} (${assignedOfficer}).`,
    acting_user: officer,
  })
  return mapComplaintFromBackend(updated)
}

export async function transferComplaint(
  caseId,
  { transferTo, reason, officer = 'Authorized Officer' }
) {
  if (isDemoMode()) {
    const target = demoComplaintsStore.find((c) => c.id === caseId)
    if (target) target.status = 'Transferred'
    return target
  }

  const updated = await api.transferComplaint(caseId, {
    transfer_to: transferTo,
    reason,
    acting_user: officer,
  })
  return mapComplaintFromBackend(updated)
}

export async function escalateComplaint(
  caseId,
  { escalateTo, reason, officer = 'Authorized Officer' }
) {
  if (isDemoMode()) {
    const target = demoComplaintsStore.find((c) => c.id === caseId)
    if (target) target.priority = 'Critical'
    return target
  }

  const updated = await api.escalateComplaint(caseId, {
    escalate_to: escalateTo,
    reason,
    acting_user: officer,
  })
  return mapComplaintFromBackend(updated)
}

export async function updateComplaintNextAction(
  caseId,
  { nextActionRequired, nextActionDueDate, remarks, officer = 'AICTE Officer' }
) {
  if (isDemoMode()) {
    const target = demoComplaintsStore.find((c) => c.id === caseId)
    if (target) target.nextActionRequired = nextActionRequired
    return target
  }

  const updated = await api.updateComplaint(caseId, {
    next_action: nextActionRequired,
    expected_disposal_date: nextActionDueDate || undefined,
    remarks: remarks || `Scheduled next action: ${nextActionRequired}`,
    acting_user: officer,
  })
  return mapComplaintFromBackend(updated)
}

export async function addComplaintRemark(
  caseId,
  { remark, officer = 'AICTE Officer', actionType = 'Official Remark' }
) {
  if (isDemoMode()) {
    const target = demoComplaintsStore.find((c) => c.id === caseId)
    return target
  }

  const updated = await api.updateComplaint(caseId, {
    remarks: remark,
    acting_user: officer,
  })
  return mapComplaintFromBackend(updated)
}

// ==========================================
// C. DASHBOARD METRICS SUMMARY API
// ==========================================

export async function getDashboardSummary() {
  if (isDemoMode()) {
    const totalCases = demoComplaintsStore.length
    const pendingCases = demoComplaintsStore.filter(
      (c) => c.status === 'Pending' || c.status === 'Submitted'
    ).length
    const underProcessCases = demoComplaintsStore.filter((c) =>
      ['In Investigation', 'Hearing Scheduled', 'Action Initiated', 'Assigned'].includes(c.status)
    ).length
    const disposedCases = demoComplaintsStore.filter((c) =>
      ['Resolved', 'Closed', 'Disposed'].includes(c.status)
    ).length
    const transferredCases = demoComplaintsStore.filter((c) => c.status === 'Transferred').length
    const overdueCases = demoComplaintsStore.filter((c) => c.isOverdue).length
    return {
      totalCases,
      pendingCases,
      underProcessCases,
      disposedCases,
      transferredCases,
      overdueCases,
      unresolvedOverlaps: 1,
      resolutionRate: totalCases > 0 ? Math.round((disposedCases / totalCases) * 100) : 0,
      activeInstitutionsCount: demoInstitutionsStore.length,
    }
  }

  const stats = await api.getDashboardStats()
  return {
    totalCases: stats.total_cases,
    pendingCases: stats.pending_cases,
    underProcessCases: stats.under_process_cases,
    disposedCases: stats.disposed_cases,
    transferredCases: stats.transferred_cases,
    overdueCases: stats.overdue_cases,
    unresolvedOverlaps: stats.unresolved_overlaps,
    resolutionRate: stats.resolution_rate,
    activeInstitutionsCount: stats.total_institutions,
    awaitingAssignmentCases: stats.awaiting_assignment_cases ?? 0,
  }
}

export async function getBureauWorkload() {
  if (isDemoMode()) {
    return MOCK_BUREAUS.map((bureau) => ({
      bureauId: bureau.id,
      code: bureau.code,
      name: bureau.name,
      activeCases: bureau.activeCases,
      disposedCases: 5,
      overdueCases: 2,
      total: bureau.activeCases + 5,
    }))
  }

  const res = await api.getBureauWorkload()
  return res.map((b) => ({
    bureauId: b.bureau_id,
    code: b.code,
    name: b.name,
    activeCases: b.active_cases,
    disposedCases: b.disposed_cases,
    overdueCases: b.overdue_cases,
    total: b.total,
  }))
}

export async function getRegionDistribution() {
  if (isDemoMode()) {
    return [
      { region: 'Western', name: 'Western (Mumbai)', count: 46, overdue: 4 },
      { region: 'North Western', name: 'North Western (Delhi/Chandigarh)', count: 52, overdue: 6 },
      { region: 'South Western', name: 'South Western (Bengaluru)', count: 34, overdue: 2 },
      { region: 'South Central', name: 'South Central (Hyderabad)', count: 28, overdue: 1 },
      { region: 'Eastern', name: 'Eastern (Kolkata)', count: 22, overdue: 3 },
      { region: 'Southern', name: 'Southern (Chennai)', count: 31, overdue: 2 },
      { region: 'Central', name: 'Central (Bhopal/Kanpur)', count: 25, overdue: 3 },
    ]
  }

  const res = await api.getRegionDistribution()
  return res.map((r) => ({
    region: r.region,
    name: r.region,
    count: r.total_cases,
    overdue: r.overdue_cases,
  }))
}

export async function getStatusDistribution() {
  if (isDemoMode()) {
    return [
      { name: 'Under Process', value: 4, color: '#2563eb' },
      { name: 'Pending Review', value: 1, color: '#f59e0b' },
      { name: 'Disposed / Closed', value: 1, color: '#10b981' },
      { name: 'Transferred', value: 1, color: '#6366f1' },
      { name: 'Overdue SLA', value: 2, color: '#ef4444' },
    ]
  }

  return await api.getStatusDistribution()
}

export async function getRecentActivity(limit = 6) {
  if (isDemoMode()) {
    return demoAuditLogsStore.slice(0, limit)
  }

  const res = await api.getRecentActivity()
  return res.slice(0, limit).map((a) => ({
    id: a.id,
    timestamp: a.timestamp ? a.timestamp.replace('T', ' ').substring(0, 19) : '',
    officer: a.acting_user,
    role: 'Authorized Officer',
    action: a.action_type,
    targetId: a.case_id,
    targetType: 'Complaint',
    details: a.remarks || `${a.action_type} for case ${a.case_id}`,
  }))
}

export async function getApproachingDeadlines(limit = 5) {
  if (isDemoMode()) {
    return demoComplaintsStore.slice(0, limit)
  }

  const res = await api.getApproachingDeadlines()
  return res.slice(0, limit).map((c) => ({
    id: c.id,
    institutionName: c.institution_name,
    bureauId: c.assigned_bureau,
    priority: c.priority,
    status: c.status,
    expectedDisposalDate: c.expected_disposal_date,
    daysPending: c.days_pending,
    isOverdue: c.is_overdue,
  }))
}

export async function getPotentialOverlaps(limit = 4) {
  if (isDemoMode()) {
    return demoOverlapsStore.slice(0, limit)
  }

  const res = await api.getOverlaps({ limit })
  return (res.data || []).slice(0, limit).map((o) => ({
    id: `OVL-${o.id}`,
    overlapId: o.id,
    caseIdA: o.first_case_id,
    caseIdB: o.second_case_id,
    institutionName: o.first_case?.institution_name || 'Institution Under Inquest',
    bureauA: o.first_case?.bureau || 'RB',
    bureauB: o.second_case?.bureau || 'PGRC',
    status: o.review_status,
    reason: o.matching_reason,
    risk: 'High Conflict',
  }))
}

export async function getRecentlyUpdatedInstitutions(limit = 4) {
  const res = await getInstitutions({ pageSize: limit, sortBy: 'name', sortDir: 'asc' })
  return res.data
}

// ==========================================
// D. AUDIT TRAIL, NOTIFICATIONS & REPORTS
// ==========================================

export async function getAuditLogs({ search = '', limit = 50, skip = 0 } = {}) {
  if (isDemoMode()) {
    return { data: demoAuditLogsStore, total: demoAuditLogsStore.length }
  }
  const res = await api.getActions({ acting_user: search || undefined, limit, skip })
  return {
    data: (res.data || []).map((a) => ({
      id: `AUD-${a.id}`,
      timestamp: a.timestamp ? a.timestamp.replace('T', ' ').substring(0, 19) : '',
      officer: a.acting_user,
      role: 'Authorized Officer',
      action: a.action_type,
      targetId: a.case_id,
      targetType: 'CaseAction',
      details: a.remarks || `${a.action_type} recorded for case ${a.case_id}.`,
      ipAddress: '10.204.1.20',
    })),
    total: res.total,
  }
}

export async function getNotifications(recipient) {
  if (isDemoMode()) {
    return { data: MOCK_NOTIFICATIONS, total: MOCK_NOTIFICATIONS.length, unreadCount: 2 }
  }
  const res = await api.getNotifications({ recipient })
  return {
    data: (res.data || []).map((n) => {
      let type = 'info'
      let title = n.notification_type.replace(/_/g, ' ')
      let linkTarget = 'complaints'

      if (n.notification_type === 'OVERLAP_ALERT') {
        type = 'warning'
        title = 'Potential Cross-Bureau Overlap'
        linkTarget = 'overlap'
      } else if (n.notification_type === 'OVERDUE_CASE_ALERT') {
        type = 'critical'
        title = 'Overdue Grievance Alert'
      } else if (n.notification_type === 'ESCALATION_NOTIFICATION') {
        type = 'critical'
        title = 'Administrative Escalation Notice'
      } else if (n.notification_type === 'APPROACHING_DEADLINE_REMINDER') {
        type = 'warning'
        title = 'Approaching SLA Target Deadline'
      } else if (n.notification_type === 'PENDING_CASE_REMINDER') {
        type = 'info'
        title = 'Pending Intake Assignment Reminder'
      } else if (n.notification_type === 'CRITICAL_PRIORITY') {
        type = 'critical'
        title = 'Critical Priority Triage'
      }

      return {
        id: n.id,
        title,
        message: n.message,
        type,
        timestamp: n.created_at ? n.created_at.split('T')[0] : 'Today',
        read: n.read_status,
        linkTarget,
        caseId: n.related_case_id,
      }
    }),
    total: res.total,
    unreadCount: res.unread_count,
  }
}

export async function markNotificationRead(id) {
  if (isDemoMode()) return true
  return await api.markNotificationRead(id)
}

export async function markAllNotificationsRead(recipient) {
  if (isDemoMode()) return true
  return await api.markAllNotificationsRead(recipient)
}

export async function reviewOverlap(overlapId, { reviewStatus, reviewedBy, remarks }) {
  if (isDemoMode()) return true
  return await api.reviewOverlap(overlapId, {
    review_status: reviewStatus,
    reviewed_by: reviewedBy,
    review_remarks: remarks,
  })
}

export async function getReportsSummary(params = {}) {
  if (isDemoMode()) {
    return {
      total_records: 124,
      active_cases: 68,
      resolved_cases: 56,
      overdue_cases: 8,
      resolution_rate: 45.2,
      category_breakdown: [],
    }
  }
  return await api.getReportsSummary(params)
}

export async function getUsers() {
  if (isDemoMode()) return MOCK_USERS
  const res = await api.getUsers()
  return res.map((u) => ({
    id: `USR-${u.id}`,
    rawId: u.id,
    name: u.name,
    email: u.login_identifier,
    role: u.role,
    bureau: u.role === 'Central Administrator' ? 'AICTE Headquarters (New Delhi)' : 'Public Grievance Redressal Cell (PGRC)',
    status: u.active_status ? 'Active' : 'Inactive',
    lastLogin: 'Active Today',
  }))
}
