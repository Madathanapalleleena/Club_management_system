import axios from 'axios';
const api = axios.create({ baseURL: '/api', timeout: 20000 });
api.interceptors.request.use(cfg => { const t = localStorage.getItem('cms_token'); if (t) cfg.headers.Authorization = 'Bearer ' + t; return cfg; });
api.interceptors.response.use(r => r, err => { if (err.response?.status === 401) { localStorage.removeItem('cms_token'); window.location.href = '/login'; } return Promise.reject(err); });
export default api;

export const authAPI = {
  login: d  => api.post('/auth/login', d),
  me:    () => api.get('/auth/me'),
  users: p  => api.get('/auth/users', { params: p }),
  create:(d) => api.post('/auth/users', d),
  update:(id,d) => api.put('/auth/users/' + id, d),
  toggle: id => api.put('/auth/users/' + id + '/toggle'),
  changePw: d => api.put('/auth/change-password', d),
};

export const dirAPI = {
  list:   p  => api.get('/directors', { params: p }),
  create: d  => api.post('/directors', d),
  update:(id,d) => api.put('/directors/' + id, d),
  toggle: id => api.delete('/directors/' + id),
};

export const procAPI = {
  // Requirements
  requests: p => api.get('/procurement/requests', { params: p }),
  getRequest: id => api.get('/procurement/requests/' + id),
  createRequest: d => api.post('/procurement/requests', d),
  updateRequest: (id,d) => api.put('/procurement/requests/' + id, d),
  deleteRequest: id => api.delete('/procurement/requests/' + id),
  // Vendors
  vendors: p => api.get('/procurement/vendors', { params: p }),
  getVendor: id => api.get('/procurement/vendors/' + id),
  createVendor: d => api.post('/procurement/vendors', d),
  updateVendor: (id,d) => api.put('/procurement/vendors/' + id, d),
  vendorAnalytics: (id,p) => api.get('/procurement/vendors/' + id + '/analytics', { params: p }),
  addAgreement: (id,f) => api.post('/procurement/vendors/' + id + '/agreement', f, { headers: {'Content-Type':'multipart/form-data'} }),
  // Templates
  templates: p => api.get('/procurement/agreement-templates', { params: p }),
  getTemplate: id => api.get('/procurement/agreement-templates/' + id),
  createTemplate: d => api.post('/procurement/agreement-templates', d),
  updateTemplate: (id,d) => api.put('/procurement/agreement-templates/' + id, d),
  suggestTemplate: d => api.post('/procurement/suggest-template', d),
  fillTemplate: d => api.post('/procurement/fill-template', d),
  // Purchase Orders
  pos: p => api.get('/procurement/purchase-orders', { params: p }),
  getPO: id => api.get('/procurement/purchase-orders/' + id),
  createPO: d => api.post('/procurement/purchase-orders', d),
  updatePO: (id,d) => api.put('/procurement/purchase-orders/' + id, d),
  uploadBill: (id,f) => api.post('/procurement/purchase-orders/' + id + '/bill', f, { headers: {'Content-Type':'multipart/form-data'} }),
  // Order Tracking
  orderTracking: p => api.get('/procurement/order-tracking', { params: p }),
  updateDelivery: (id,d) => api.put('/procurement/order-tracking/' + id + '/delivery', d),
  // GRC / Quality
  grc: p => api.get('/procurement/grc', { params: p }),
  createGRC: f => api.post('/procurement/grc', f, { headers: {'Content-Type':'multipart/form-data'} }),
  verifyGRC: id => api.put('/procurement/grc/' + id + '/verify'),
  // Stats
  stats: () => api.get('/procurement/stats'),
};

export const storeAPI = {
  summary: () => api.get('/store/summary'),
  items: p => api.get('/store/items', { params: p }),
  getItem: id => api.get('/store/items/' + id),
  createItem: d => api.post('/store/items', d),
  updateItem: (id,d) => api.put('/store/items/' + id, d),
  deleteItem: id => api.delete('/store/items/' + id),
  adjust: (id,d) => api.post('/store/items/' + id + '/adjust', d),
  transactions: id => api.get('/store/items/' + id + '/transactions'),
  categories: () => api.get('/store/categories'),
  grc: () => api.get('/store/grc'),
  createGRC: f => api.post('/store/grc', f, { headers: {'Content-Type':'multipart/form-data'} }),
  verifyGRC: id => api.put('/store/grc/' + id + '/verify'),
  internalReqs: p => api.get('/store/internal-requests', { params: p }),
  getInternalReq: id => api.get('/store/internal-requests/' + id),
  createInternalReq: d => api.post('/store/internal-requests', d),
  updateInternalReq: (id,d) => api.put('/store/internal-requests/' + id, d),
  orderTracking: () => api.get('/store/order-tracking'),
  editPO: (id,d) => api.put('/store/edit-po/' + id, d),
};

export const kitchenAPI = {
  requests: p => api.get('/kitchen/requests', { params: p }),
  createRequest: d => api.post('/kitchen/requests', d),
  utilization: p => api.get('/kitchen/utilization', { params: p }),
  returns: d => api.post('/kitchen/returns', d),
};

export const banquetAPI = {
  list: p => api.get('/banquet', { params: p }),
  get: id => api.get('/banquet/' + id),
  create: d => api.post('/banquet', d),
  update: (id,d) => api.put('/banquet/' + id, d),
  cancel: id => api.put('/banquet/' + id, { action: 'cancel' }),
  checkAvailability: d => api.post('/banquet/check-availability', d),
  calendar: (y,m) => api.get('/banquet/calendar/' + y + '/' + m),
  stats: () => api.get('/banquet/stats'),
  monthlyStats: () => api.get('/banquet/stats'),
  runAlerts:    () => api.post('/banquet/run-alerts'),
  runReminders: () => api.post('/banquet/run-reminders'),
};

export const roomsAPI = {
  rooms: p => api.get('/rooms/rooms', { params: p }),
  createRoom: d => api.post('/rooms/rooms', d),
  updateRoom: (id,d) => api.put('/rooms/rooms/' + id, d),
  deleteRoom: id => api.delete('/rooms/rooms/' + id),
  checkAvailability: d => api.post('/rooms/rooms/availability', d),
  bookings: p => api.get('/rooms/bookings', { params: p }),
  getBooking: id => api.get('/rooms/bookings/' + id),
  createBooking: d => api.post('/rooms/bookings', d),
  updateBooking: (id,d) => api.put('/rooms/bookings/' + id, d),
  cancelBooking: id => api.put('/rooms/bookings/' + id, { action: 'cancel' }),
  stats: () => api.get('/rooms/stats'),
};

export const finAPI = {
  sales: p => api.get('/finance/sales', { params: p }),
  createSale: d => api.post('/finance/sales', d),
  expenses: p => api.get('/finance/expenses', { params: p }),
  createExp: d => api.post('/finance/expenses', d),
  pnl: p => api.get('/finance/pnl', { params: p }),
  monthly: () => api.get('/finance/monthly'),
  updatePOPay: (id,d) => api.put('/finance/po-payment/' + id, d),
};

export const hrAPI = {
  staff: p => api.get('/hr/staff', { params: p }),
  update: (id,d) => api.put('/hr/staff/' + id, d),
  toggle: id => api.put('/hr/staff/' + id + '/toggle'),
};

export const notifAPI = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  read: id => api.put('/notifications/' + id + '/read'),
  readAll: () => api.put('/notifications/read-all'),
};

export const dashAPI = {
  chairman:   () => api.get('/dashboard/chairman'),
  gm:         () => api.get('/dashboard/gm'),
  procurement:() => api.get('/dashboard/procurement'),
  store:      () => api.get('/dashboard/store'),
  kitchen:    () => api.get('/dashboard/kitchen'),
  banquet:    () => api.get('/dashboard/banquet'),
  rooms:      () => api.get('/dashboard/rooms'),
  accounts:   () => api.get('/dashboard/accounts'),
  hr:         () => api.get('/dashboard/hr'),
  department: d => api.get('/dashboard/department/' + d),
};
