const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const BASE_URL = rawBaseUrl.replace(/\/+$/, '');

function getUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${BASE_URL}${cleanEndpoint}`;
}

const TOKEN_KEY = 'FIELD_SERVICE_AUTH_TOKEN';
const USER_KEY = 'FIELD_SERVICE_AUTH_USER';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function setStoredSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = { ...options, headers };

  try {
    const res = await fetch(getUrl(endpoint), config);
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson.message) errorMsg = errJson.message;
        else if (errJson.error) errorMsg = errJson.error;
      } catch { /* use fallback */ }
      throw new Error(errorMsg);
    }
    if (res.status === 204) return null;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  async getHealth() {
    try {
      const res = await fetch(getUrl('/health'));
      if (res.ok) return await res.json();
      return { status: 'OFFLINE' };
    } catch { return { status: 'OFFLINE' }; }
  },

  async login(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (data && data.token) setStoredSession(data.token, data.user);
    return data;
  },

  async register(registerData) {
    const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(registerData) });
    if (data && data.token) setStoredSession(data.token, data.user);
    return data;
  },

  async getMe() { return await request('/auth/me'); },

  async getAllUsers() { return await request('/auth/users'); },
  async adminCreateUser(userData) {
    return await request('/auth/users', { method: 'POST', body: JSON.stringify(userData) });
  },
  async updateUser(id, userData) {
    return await request(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
  },
  async deleteUser(id) {
    return await request(`/auth/users/${id}`, { method: 'DELETE' });
  },

  async getCategories() { return await request('/categories'); },
  async getAllCategories() { return await request('/categories/all'); },
  async createCategory(data) {
    return await request('/categories', { method: 'POST', body: JSON.stringify(data) });
  },
  async getTypesByCategory(categoryId) { return await request(`/categories/${categoryId}/types`); },
  async createServiceType(categoryId, data) {
    return await request(`/categories/${categoryId}/types`, { method: 'POST', body: JSON.stringify(data) });
  },
  async getSkills() { return await request('/skills'); },
  async createSkill(data) {
    return await request('/skills', { method: 'POST', body: JSON.stringify(data) });
  },

  async getServiceLocations(customerId = null) {
    const query = customerId ? `?customerId=${customerId}` : '';
    return await request(`/service-locations${query}`);
  },
  async createServiceLocation(locationData) {
    return await request('/service-locations', { method: 'POST', body: JSON.stringify(locationData) });
  },
  async updateServiceLocation(id, locationData) {
    return await request(`/service-locations/${id}`, { method: 'PUT', body: JSON.stringify(locationData) });
  },
  async deleteServiceLocation(id) {
    return await request(`/service-locations/${id}`, { method: 'DELETE' });
  },

  async getAllServiceRequests(customerId = null) {
    const query = customerId ? `?customerId=${customerId}` : '';
    return await request(`/service-requests${query}`);
  },
  async getMyServiceRequests() { return await request('/service-requests/my-requests'); },
  async getServiceRequestById(id) { return await request(`/service-requests/${id}`); },
  async createServiceRequest(requestData) {
    return await request('/service-requests', { method: 'POST', body: JSON.stringify(requestData) });
  },
  async cancelServiceRequest(id, reason = 'Cancelled by customer') {
    return await request(`/service-requests/${id}/cancel?reason=${encodeURIComponent(reason)}`, { method: 'PUT' });
  },
  async updateServiceRequestPriority(id, priority) {
    return await request(`/service-requests/${id}/priority?priority=${encodeURIComponent(priority)}`, { method: 'PUT' });
  },

  async getAllWorkOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.customerId) params.append('customerId', filters.customerId);
    if (filters.technicianId) params.append('technicianId', filters.technicianId);
    if (filters.status) params.append('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await request(`/work-orders${qs}`);
  },
  async getWorkOrderById(id) { return await request(`/work-orders/${id}`); },
  async createWorkOrder(dto) {
    return await request('/work-orders', { method: 'POST', body: JSON.stringify(dto) });
  },
  async createWorkOrderFromRequest(requestId) {
    return await request(`/work-orders/from-request/${requestId}`, { method: 'POST' });
  },
  async scheduleWorkOrder(id, scheduleData) {
    return await request(`/work-orders/${id}/schedule`, { method: 'PUT', body: JSON.stringify(scheduleData) });
  },
  async assignTechnician(id, assignData) {
    return await request(`/work-orders/${id}/assign`, { method: 'PUT', body: JSON.stringify(assignData) });
  },
  async acceptWorkOrder(id) { return await request(`/work-orders/${id}/accept`, { method: 'PUT' }); },
  async rejectWorkOrder(id, reason) {
    return await request(`/work-orders/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason, rejectionReason: reason }) });
  },
  async startWorkOrder(id) { return await request(`/work-orders/${id}/start`, { method: 'PUT' }); },
  async holdWorkOrder(id, reason) {
    return await request(`/work-orders/${id}/hold`, { method: 'PUT', body: JSON.stringify({ reason, onHoldReason: reason }) });
  },
  async completeWorkOrder(id, completeData) {
    return await request(`/work-orders/${id}/complete`, { method: 'PUT', body: JSON.stringify(completeData) });
  },
  async verifyWorkOrder(id, verifyData) {
    return await request(`/work-orders/${id}/verify`, { method: 'PUT', body: JSON.stringify(verifyData) });
  },
  async reopenWorkOrder(id, reopenData) {
    return await request(`/work-orders/${id}/reopen`, { method: 'PUT', body: JSON.stringify(reopenData) });
  },
  async addPartToWorkOrder(id, partData) {
    return await request(`/work-orders/${id}/parts`, { method: 'POST', body: JSON.stringify(partData) });
  },
  async uploadWorkOrderPhoto(workOrderId, photoUrl, category, caption) {
    const params = new URLSearchParams({ photoUrl });
    if (category) params.append('category', category);
    if (caption) params.append('caption', caption);
    return await request(`/work-orders/${workOrderId}/photos?${params.toString()}`, { method: 'POST' });
  },

  async uploadPhoto(file) {
    const token = getStoredToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(getUrl('/upload/photo'), {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Upload failed');
    }
    return await res.json();
  },

  async getAllTechnicians(availableOnly = false) {
    const query = availableOnly ? '?availableOnly=true' : '';
    return await request(`/technicians${query}`);
  },
  async getTechnicianById(id) { return await request(`/technicians/${id}`); },
  async getMyTechnicianProfile() { return await request('/technicians/me'); },
  async getMyTechnicianWorkOrders() { return await request('/technicians/me/work-orders'); },
  async updateTechnicianStatus(id, statusData) {
    return await request(`/technicians/${id}/status`, { method: 'PUT', body: JSON.stringify(statusData) });
  },
  async createTechnician(data) {
    return await request('/technicians', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateTechnician(id, data) {
    return await request(`/technicians/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async getAllCustomers() { return await request('/customers'); },
  async getCustomerById(id) { return await request(`/customers/${id}`); },
  async getMyCustomerProfile() { return await request('/customers/me'); },
  async updateMyCustomerProfile(profileData) {
    return await request('/customers/me', { method: 'PUT', body: JSON.stringify(profileData) });
  },

  async getInventory() { return await request('/inventory'); },
  async getLowStockParts() { return await request('/inventory/low-stock'); },
  async getInventoryTransactions(partId = null) {
    const endpoint = partId ? `/inventory/${partId}/transactions` : '/inventory/transactions';
    return await request(endpoint);
  },
  async createPart(partData) {
    return await request('/inventory', { method: 'POST', body: JSON.stringify(partData) });
  },
  async adjustInventory(partId, adjustmentData) {
    return await request(`/inventory/${partId}/adjust`, { method: 'POST', body: JSON.stringify(adjustmentData) });
  },

  // Part Requests Workflow
  async getPartRequests() { return await request('/inventory/requests'); },
  async getPartRequestById(id) { return await request(`/inventory/requests/${id}`); },
  async createPartRequest(requestData) {
    return await request('/inventory/requests', { method: 'POST', body: JSON.stringify(requestData) });
  },
  async forwardPartRequest(id, data = {}) {
    return await request(`/inventory/requests/${id}/forward`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async approvePartRequest(id, data = {}) {
    return await request(`/inventory/requests/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async rejectPartRequest(id, data = {}) {
    return await request(`/inventory/requests/${id}/reject`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async getDashboardStats() { return await request('/analytics/dashboard'); },
  async getDetailedAnalytics() { return await request('/analytics/detailed'); },

  async getNotifications() { return await request('/notifications'); },
  async getUnreadNotificationCount() { return await request('/notifications/unread-count'); },
  async markNotificationRead(id) { return await request(`/notifications/${id}/read`, { method: 'PUT' }); },
  async markAllNotificationsRead() { return await request('/notifications/read-all', { method: 'PUT' }); },

  async getAllFeedback(customerId = null) {
    const query = customerId ? `?customerId=${customerId}` : '';
    return await request(`/feedbacks${query}`);
  },
  async getFeedbackByWorkOrderId(workOrderId) { return await request(`/feedbacks/work-order/${workOrderId}`); },

  async getAuditLogs() { return await request('/audit-logs'); },

  async exportWorkOrdersCSV() {
    const token = getStoredToken();
    const res = await fetch(getUrl('/reports/work-orders/csv'), {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    return await res.text();
  },
  async exportTechniciansCSV() {
    const token = getStoredToken();
    const res = await fetch(getUrl('/reports/technicians/csv'), {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    return await res.text();
  },
  async exportInventoryCSV() {
    const token = getStoredToken();
    const res = await fetch(getUrl('/reports/inventory/csv'), {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    return await res.text();
  }
};
