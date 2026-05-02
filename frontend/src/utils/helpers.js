import { format, formatDistanceToNow } from 'date-fns';

export const fmt = {
  date:    d => d ? format(new Date(d), 'dd MMM yyyy') : '—',
  datetime:d => d ? format(new Date(d), 'dd MMM yyyy, HH:mm') : '—',
  ago:     d => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '—',
  inr:     n => n != null ? '₹' + Number(n).toLocaleString('en-IN', {minimumFractionDigits:0,maximumFractionDigits:2}) : '—',
  inrCompact: n => {
    if (n == null) return '—';
    const num = Number(n);
    if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + 'Cr';
    if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + 'L';
    if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'k';
    return '₹' + num.toLocaleString('en-IN', {maximumFractionDigits:0});
  },
  num:     n => n != null ? Number(n).toLocaleString('en-IN') : '—',
  pct:     n => n != null ? Number(n).toFixed(1) + '%' : '—',
};

export const ROLES = {
  chairman:            { label:'Chairman',           color:'#b45309', bg:'#fef3c7', dash:'chairman' },
  secretary:           { label:'Secretary',          color:'#7c3aed', bg:'#f5f3ff', dash:'chairman' },
  gm:                  { label:'General Manager',    color:'#0369a1', bg:'#e0f2fe', dash:'gm' },
  agm:                 { label:'AGM',                color:'#0369a1', bg:'#e0f2fe', dash:'gm' },
  director:            { label:'Director',           color:'#4f46e5', bg:'#e0e7ff', dash:'director' },
  procurement_manager: { label:'Procurement Manager',color:'#065f46', bg:'#ecfdf5', dash:'procurement' },
  procurement_assistant:{ label:'Procurement Asst.',  color:'#065f46', bg:'#ecfdf5', dash:'procurement' },
  store_manager:       { label:'Store Manager',      color:'#92400e', bg:'#fef3c7', dash:'store' },
  store_assistant:     { label:'Store Assistant',    color:'#92400e', bg:'#fef3c7', dash:'store' },
  kitchen_manager:     { label:'Kitchen Manager',    color:'#dc2626', bg:'#fef2f2', dash:'kitchen' },
  food_control:        { label:'Food Control Mgr',   color:'#dc2626', bg:'#fef2f2', dash:'kitchen' },
  accounts_manager:    { label:'Accounts Manager',   color:'#1e40af', bg:'#eff6ff', dash:'accounts' },
  hr_manager:          { label:'HR Manager',         color:'#6d28d9', bg:'#f5f3ff', dash:'hr' },
  bar_manager:         { label:'Bar Manager',        color:'#b45309', bg:'#fef3c7', dash:'bar' },
  banquet_manager:     { label:'Banquet Manager',    color:'#0f766e', bg:'#f0fdfa', dash:'banquet' },
  rooms_manager:       { label:'Rooms Manager',      color:'#1d4ed8', bg:'#eff6ff', dash:'rooms' },
  sports_manager:      { label:'Sports Manager',     color:'#15803d', bg:'#f0fdf4', dash:'sports' },
  maintenance_manager: { label:'Maintenance Manager',color:'#374151', bg:'#f9fafb', dash:'maintenance' },
  staff:               { label:'Staff',              color:'#6b7280', bg:'#f3f4f6', dash:'gm' },
};

export const roleInfo  = r => ROLES[r] || { label:r, color:'#6b7280', bg:'#f3f4f6', dash:'gm' };
export const roleLabel = r => roleInfo(r).label;
export const roleDash  = r => roleInfo(r).dash;
export const roleColor = r => roleInfo(r).color;
export const roleBg    = r => roleInfo(r).bg;
export const initials  = n => n?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || '?';

export const stockBadge = s => ({ adequate:{cls:'badge-green',label:'Adequate'}, low:{cls:'badge-amber',label:'Low'}, critical:{cls:'badge-red',label:'Critical'}, out_of_stock:{cls:'badge-red',label:'Out of Stock'} }[s] || {cls:'badge-muted',label:s});
export const orderBadge = s => ({ draft:{cls:'badge-muted',label:'Draft'}, approved:{cls:'badge-indigo',label:'Order Placed'}, dispatched:{cls:'badge-amber',label:'In Transit'}, delivered:{cls:'badge-green',label:'Delivered'}, cancelled:{cls:'badge-red',label:'Cancelled'} }[s] || {cls:'badge-muted',label:s});
export const payBadge   = s => ({ paid:{cls:'badge-green',label:'Paid'}, pending:{cls:'badge-amber',label:'Pending'}, advance:{cls:'badge-indigo',label:'Advance'}, stopped:{cls:'badge-red',label:'Stopped'} }[s] || {cls:'badge-muted',label:s});
export const reqBadge   = s => ({ pending:{cls:'badge-amber',label:'Pending'}, approved:{cls:'badge-green',label:'Approved'}, rejected:{cls:'badge-red',label:'Rejected'}, po_raised:{cls:'badge-indigo',label:'PO Raised'}, completed:{cls:'badge-green',label:'Completed'} }[s] || {cls:'badge-muted',label:s});
export const priBadge   = p => ({ low:{cls:'badge-muted',label:'Low'}, medium:{cls:'badge-indigo',label:'Medium'}, high:{cls:'badge-amber',label:'High'}, urgent:{cls:'badge-red',label:'Urgent'} }[p] || {cls:'badge-muted',label:p});
export const deptLabel  = d => ({ food_committee:'Food Committee', sports:'Sports', rooms_banquets:'Rooms & Banquets', general:'General', kitchen:'Kitchen', store:'Store', procurement:'Procurement', accounts:'Accounts', hr:'HR', bar:'Bar', banquet:'Banquet', rooms:'Rooms', restaurant:'Restaurant', maintenance:'Maintenance', management:'Management' }[d] || d);
export const paymentStatusColor = s => ({ paid:'var(--emerald)', partial:'var(--amber)', due:'var(--red)' }[s] || 'var(--text-3)');
export const paymentStatusBg    = s => ({ paid:'var(--emerald-lt)', partial:'var(--amber-lt)', due:'var(--red-lt)' }[s] || 'var(--bg-subtle)');
