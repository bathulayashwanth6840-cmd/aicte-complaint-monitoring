/**
 * AICTE FastAPI Centralized API Client
 * Connects the frontend directly to the FastAPI REST backend.
 * Reads base URL from import.meta.env.VITE_API_BASE_URL.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://aicte-complaint-monitoring.onrender.com/api'

export function buildQueryString(params = {}) {
  const query = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val))
    }
  }
  const str = query.toString()
  return str ? `?${str}` : ''
}

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}: ${response.statusText}`
      try {
        const errorData = await response.json()
        if (errorData && errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMsg = errorData.detail
          } else if (Array.isArray(errorData.detail)) {
            errorMsg = errorData.detail
              .map((d) => (d.loc ? `${d.loc.slice(-1)}: ${d.msg}` : d.msg || JSON.stringify(d)))
              .join('; ')
          }
        }
      } catch {
        // Fallback to HTTP error
      }
      throw new Error(errorMsg)
    }

    if (response.status === 204) {
      return null
    }

    return await response.json()
  } catch (err) {
    // Re-throw so caller handles and displays error state
    throw err
  }
}

export const api = {
  // Health
  getHealth: () => fetchApi('/health'),

  // Institutions
  getInstitutions: (params = {}) => fetchApi(`/institutions${buildQueryString(params)}`),
  getInstitution: (id) => fetchApi(`/institutions/${id}`),
  createInstitution: (data) =>
    fetchApi('/institutions', { method: 'POST', body: JSON.stringify(data) }),
  updateInstitution: (id, data) =>
    fetchApi(`/institutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInstitution: (id) => fetchApi(`/institutions/${id}`, { method: 'DELETE' }),
  getInstitutionComplaints: (id) => fetchApi(`/institutions/${id}/complaints`),

  // Complaints
  getComplaints: (params = {}) => fetchApi(`/complaints${buildQueryString(params)}`),
  getComplaint: (id) => fetchApi(`/complaints/${id}`),
  createComplaint: (data) =>
    fetchApi('/complaints', { method: 'POST', body: JSON.stringify(data) }),
  updateComplaint: (id, data) =>
    fetchApi(`/complaints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteComplaint: (id) => fetchApi(`/complaints/${id}`, { method: 'DELETE' }),
  assignComplaint: (id, data) =>
    fetchApi(`/complaints/${id}/assign`, { method: 'POST', body: JSON.stringify(data) }),
  updateComplaintStatus: (id, data) =>
    fetchApi(`/complaints/${id}/status`, { method: 'POST', body: JSON.stringify(data) }),
  transferComplaint: (id, data) =>
    fetchApi(`/complaints/${id}/transfer`, { method: 'POST', body: JSON.stringify(data) }),
  escalateComplaint: (id, data) =>
    fetchApi(`/complaints/${id}/escalate`, { method: 'POST', body: JSON.stringify(data) }),
  getComplaintActions: (id) => fetchApi(`/complaints/${id}/actions`),
  getComplaintRelated: (id) => fetchApi(`/complaints/${id}/related`),

  // Overlaps
  getOverlaps: (params = {}) => fetchApi(`/overlaps${buildQueryString(params)}`),
  getOverlap: (id) => fetchApi(`/overlaps/${id}`),
  reviewOverlap: (id, data) =>
    fetchApi(`/overlaps/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),
  createOverlap: (data) =>
    fetchApi('/overlaps', { method: 'POST', body: JSON.stringify(data) }),
  triggerDatabaseOverlapScan: () =>
    fetchApi('/overlaps/scan', { method: 'POST' }),

  // Actions & Audit
  getActions: (params = {}) => fetchApi(`/actions${buildQueryString(params)}`),

  // Notifications & Deadlines
  getNotifications: (params = {}) => fetchApi(`/notifications${buildQueryString(params)}`),
  createNotification: (data) =>
    fetchApi('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  markNotificationRead: (id) => fetchApi(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: (recipient) =>
    fetchApi(`/notifications/mark-all-read${buildQueryString({ recipient })}`, {
      method: 'POST',
    }),
  triggerDeadlineScan: () =>
    fetchApi('/notifications/scan-deadlines', { method: 'POST' }),
  getDeadlineConfig: () =>
    fetchApi('/notifications/deadlines/config'),
  updateDeadlineConfig: (data) =>
    fetchApi('/notifications/deadlines/config', { method: 'PUT', body: JSON.stringify(data) }),
  getApproachingDeadlinesList: (params = {}) =>
    fetchApi(`/notifications/deadlines/approaching${buildQueryString(params)}`),
  getOverdueDeadlinesList: (params = {}) =>
    fetchApi(`/notifications/deadlines/overdue${buildQueryString(params)}`),

  // Dashboard & Statistics
  getDashboardStats: () => fetchApi('/dashboard/stats'),
  getBureauWorkload: () => fetchApi('/dashboard/bureau-workload'),
  getRegionDistribution: () => fetchApi('/dashboard/region-distribution'),
  getStatusDistribution: () => fetchApi('/dashboard/status-distribution'),
  getRecentActivity: () => fetchApi('/dashboard/recent-activity'),
  getApproachingDeadlines: () => fetchApi('/dashboard/approaching-deadlines'),

  // Reports
  getReportsSummary: (params = {}) => fetchApi(`/reports/summary${buildQueryString(params)}`),
  getExportCsvUrl: (params = {}) => `${API_BASE_URL}/reports/export/csv${buildQueryString(params)}`,

  // Users & Auth
  getUsers: () => fetchApi('/users'),
  createUser: (data) => fetchApi('/users', { method: 'POST', body: JSON.stringify(data) }),
  login: (credentials) => fetchApi('/users/login', { method: 'POST', body: JSON.stringify(credentials) }),
}
