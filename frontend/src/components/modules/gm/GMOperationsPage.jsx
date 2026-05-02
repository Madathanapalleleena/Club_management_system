import React, { useState, useEffect, useCallback } from 'react';
import { procAPI } from '../../../api';
import { useAuth } from '../../../contexts/AuthContext';
import { fmt, reqBadge, orderBadge, payBadge } from '../../../utils/helpers';
import { Modal, FG, PageHdr, Empty, Tabs } from '../../ui';
import {
  ClipboardList, Package, Users, CheckCircle, XCircle, Eye,
  AlertTriangle, TrendingUp, BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Stat strip ───────────────────────────────────────────────────
const Strip = ({ label, value, color }) => (
  <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderLeft: `4px solid ${color}`, borderRadius: 'var(--radius)', padding: '11px 16px' }}>
    <div style={{ fontSize: '.67rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
  </div>
);

// ─── Procurement Requests ─────────────────────────────────────────
function RequestsTab({ user }) {
  const [reqs, setReqs]         = useState([]);
  const [loading, setLoad]      = useState(true);
  const [filter, setFilter]     = useState('pending');
  const [viewModal, setView]    = useState(null);
  const [rejectModal, setRej]   = useState(null);
  const [note, setNote]         = useState('');

  const load = useCallback(() => {
    setLoad(true);
    procAPI.requests(filter ? { status: filter } : {})
      .then(r => setReqs(r.data)).finally(() => setLoad(false));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const counts = {
    pending:  reqs.filter(r => r.status === 'pending').length,
    approved: reqs.filter(r => r.status === 'approved').length,
    rejected: reqs.filter(r => r.status === 'rejected').length,
    po_raised:reqs.filter(r => r.status === 'po_raised').length,
  };

  const approve = async id => {
    try { await procAPI.updateRequest(id, { action: 'approve' }); toast.success('Request approved'); load(); setView(null); }
    catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const reject = async () => {
    try { await procAPI.updateRequest(rejectModal._id, { action: 'reject', note }); toast.success('Request rejected'); setRej(null); setNote(''); load(); }
    catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const FTABS = [
    { v:'pending',   label:'Pending Approval' },
    { v:'approved',  label:'Approved' },
    { v:'rejected',  label:'Rejected' },
    { v:'po_raised', label:'PO Raised' },
    { v:'',          label:'All' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Summary strips */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        <Strip label="Pending Approval" value={counts.pending}   color="#e11d48"/>
        <Strip label="Approved"         value={counts.approved}  color="#16a34a"/>
        <Strip label="Rejected"         value={counts.rejected}  color="#dc2626"/>
        <Strip label="PO Raised"        value={counts.po_raised} color="#6366f1"/>
      </div>

      {/* Filter buttons */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {FTABS.map(t => (
          <button key={t.v} className="btn btn-sm" onClick={() => setFilter(t.v)}
            style={{ background: filter===t.v ? 'var(--indigo)' : 'var(--bg-subtle)', color: filter===t.v ? '#fff' : 'var(--text-2)', border:'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding:32, textAlign:'center', color:'var(--text-4)' }}>Loading…</div>
        : reqs.length === 0 ? <Empty icon={ClipboardList} title="No requests found" sub="Change filter or check back later"/>
        : (
          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Req #</th><th>Department</th><th>Items</th><th>Budget Est.</th><th>Priority</th><th>Status</th><th>Raised By</th><th>Date</th><th></th></tr>
                </thead>
                <tbody>
                  {reqs.map(r => {
                    const s = reqBadge(r.status);
                    const canAct = r.status === 'pending';
                    return (
                      <tr key={r._id}>
                        <td className="font-mono" style={{ color:'var(--indigo)', fontWeight:700, fontSize:'.8rem' }}>{r.requestNumber}</td>
                        <td style={{ textTransform:'capitalize', fontWeight:500, fontSize:'.8rem' }}>{r.department}</td>
                        <td className="text-sm text-3">{r.items?.length} item(s) — {r.items?.slice(0,2).map(i=>i.itemName).join(', ')}{r.items?.length>2?'…':''}</td>
                        <td style={{ fontWeight:600 }}>{r.budgetEstimate > 0 ? fmt.inr(r.budgetEstimate) : '—'}</td>
                        <td><span className={`badge badge-${r.priority==='urgent'?'red':r.priority==='high'?'amber':r.priority==='medium'?'indigo':'muted'}`}>{r.priority}</span></td>
                        <td><span className={'badge '+s.cls}>{s.label}</span></td>
                        <td className="text-sm">{r.requestedBy?.name || '—'}</td>
                        <td className="text-sm text-3">{fmt.date(r.createdAt)}</td>
                        <td>
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-ghost btn-xs" onClick={() => setView(r)}><Eye size={11}/> View</button>
                            {canAct && <>
                              <button className="btn btn-xs" style={{ background:'var(--emerald)', color:'#fff', border:'none' }} onClick={() => approve(r._id)}><CheckCircle size={11}/> Approve</button>
                              <button className="btn btn-xs" style={{ background:'var(--red)', color:'#fff', border:'none' }} onClick={() => { setRej(r); setNote(''); }}><XCircle size={11}/> Reject</button>
                            </>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* View detail modal */}
      {viewModal && (
        <Modal open size="modal-lg" onClose={() => setView(null)} title={`Request: ${viewModal.requestNumber}`}
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={() => setView(null)}>Close</button>
            {viewModal.status === 'pending' && <>
              <button className="btn btn-danger btn-sm" onClick={() => { setRej(viewModal); setView(null); setNote(''); }}><XCircle size={13}/> Reject</button>
              <button className="btn btn-success btn-sm" onClick={() => approve(viewModal._id)}><CheckCircle size={13}/> Approve</button>
            </>}
          </>}
        >
          <div className="form-row cols-3">
            <div><div style={{ fontSize:'.72rem', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Department</div><div style={{ fontWeight:600, textTransform:'capitalize' }}>{viewModal.department}</div></div>
            <div><div style={{ fontSize:'.72rem', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Priority</div><span className={`badge badge-${viewModal.priority==='urgent'?'red':'amber'}`}>{viewModal.priority}</span></div>
            <div><div style={{ fontSize:'.72rem', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Status</div><span className={'badge '+reqBadge(viewModal.status).cls}>{reqBadge(viewModal.status).label}</span></div>
          </div>
          {viewModal.budgetEstimate > 0 && (
            <div style={{ padding:'10px 14px', background:'var(--indigo-lt)', borderRadius:8, display:'flex', alignItems:'center', gap:10 }}>
              <TrendingUp size={15} style={{ color:'var(--indigo)' }}/>
              <span style={{ fontSize:'.875rem', fontWeight:700, color:'var(--indigo)' }}>Budget Estimate: {fmt.inr(viewModal.budgetEstimate)}</span>
            </div>
          )}
          <div className="card" style={{ padding:0 }}>
            <table>
              <thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Unit</th><th>Est. Price</th><th>Notes</th></tr></thead>
              <tbody>
                {viewModal.items?.map((it, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:600 }}>{it.itemName}</td>
                    <td className="text-sm">{it.category || '—'}</td>
                    <td style={{ fontWeight:700 }}>{it.quantity}</td>
                    <td className="text-sm">{it.unit}</td>
                    <td>{it.estimatedPrice > 0 ? fmt.inr(it.estimatedPrice) : '—'}</td>
                    <td className="text-sm text-3">{it.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {viewModal.notes && (
            <div style={{ padding:'8px 12px', background:'var(--bg-subtle)', borderRadius:8, fontSize:'.8rem' }}>
              <strong>Notes:</strong> {viewModal.notes}
            </div>
          )}
          {viewModal.approvedBy && (
            <div style={{ padding:'8px 12px', background:'var(--emerald-lt)', borderRadius:8, fontSize:'.8rem', color:'var(--emerald)', fontWeight:600 }}>
              ✓ Approved by {viewModal.approvedBy?.name} on {fmt.date(viewModal.approvedAt)}
            </div>
          )}
        </Modal>
      )}

      {/* Reject confirmation */}
      {rejectModal && (
        <Modal open onClose={() => setRej(null)} title={`Reject — ${rejectModal.requestNumber}`}
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={() => setRej(null)}>Cancel</button>
            <button className="btn btn-danger btn-sm" onClick={reject}><XCircle size={13}/> Confirm Reject</button>
          </>}
        >
          <div style={{ padding:'10px 12px', background:'var(--red-lt)', borderRadius:8, fontSize:'.8125rem', color:'var(--red)', fontWeight:600 }}>
            This will notify {rejectModal.requestedBy?.name}. Please provide a clear reason.
          </div>
          <FG label="Reason for Rejection" required>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Explain why this request is being rejected…" style={{ minHeight:80 }}/>
          </FG>
        </Modal>
      )}
    </div>
  );
}

// ─── Purchase Orders ──────────────────────────────────────────────
function PurchaseOrdersTab({ user }) {
  const [pos, setPOs]        = useState([]);
  const [loading, setLoad]   = useState(true);
  const [filter, setFilter]  = useState('draft');
  const [viewModal, setView] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [note, setNote]      = useState('');

  const isGM = ['gm','chairman','secretary'].includes(user?.role);

  const load = useCallback(() => {
    setLoad(true);
    procAPI.pos(filter ? { orderStatus: filter } : {})
      .then(r => setPOs(r.data)).finally(() => setLoad(false));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const myHvDone = po => {
    const h = po.hvApprovals || {};
    return isGM ? !!h.gm?.approved : !!h.agm?.approved;
  };

  const approveStandard = async (po) => {
    try { await procAPI.updatePO(po._id, { action:'approve' }); toast.success('PO approved'); load(); setView(null); }
    catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const approveHV = async (po) => {
    try { await procAPI.updatePO(po._id, { action:'hv_approve' }); toast.success('High-value approval recorded'); load(); setView(null); }
    catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const cancelPO = async () => {
    try { await procAPI.updatePO(cancelModal._id, { action:'cancel', note }); toast.success('PO cancelled'); setCancelModal(null); setNote(''); load(); }
    catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const FTABS = [
    { v:'draft',      label:'Awaiting Approval' },
    { v:'approved',   label:'Approved' },
    { v:'dispatched', label:'Dispatched' },
    { v:'delivered',  label:'Delivered' },
    { v:'cancelled',  label:'Cancelled' },
    { v:'',           label:'All' },
  ];

  const HVChip = ({ label, done }) => (
    <span style={{ fontSize:'.68rem', padding:'2px 7px', borderRadius:12, background: done ? 'var(--emerald-lt)' : 'var(--bg-subtle)', color: done ? 'var(--emerald)' : 'var(--text-4)', fontWeight:700, whiteSpace:'nowrap' }}>
      {label}{done ? ' ✓' : ' …'}
    </span>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {FTABS.map(t => (
          <button key={t.v} className="btn btn-sm" onClick={() => setFilter(t.v)}
            style={{ background: filter===t.v ? 'var(--indigo)' : 'var(--bg-subtle)', color: filter===t.v ? '#fff' : 'var(--text-2)', border:'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding:32, textAlign:'center', color:'var(--text-4)' }}>Loading…</div>
        : pos.length === 0 ? <Empty icon={Package} title="No purchase orders" sub="Change filter or check back later"/>
        : (
          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>PO #</th><th>Department</th><th>Vendor</th><th>Amount</th><th>Approval Chain</th><th>Payment</th><th>Status</th><th>Date</th><th></th></tr>
                </thead>
                <tbody>
                  {pos.map(po => {
                    const ob = orderBadge(po.orderStatus), pb = payBadge(po.paymentStatus);
                    const h = po.hvApprovals || {};
                    const isHV = po.requiresHighValueApproval;
                    const isDraft = po.orderStatus === 'draft';
                    const canStd  = isDraft && !isHV;
                    const canHV   = isDraft && isHV && !myHvDone(po);
                    return (
                      <tr key={po._id}>
                        <td className="font-mono" style={{ color:'var(--indigo)', fontWeight:700, fontSize:'.8rem' }}>{po.poNumber}</td>
                        <td style={{ textTransform:'capitalize', fontSize:'.8rem' }}>{po.department}</td>
                        <td style={{ fontSize:'.8rem', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{po.vendor?.shopName || '—'}</td>
                        <td style={{ fontWeight:700, color: po.totalAmount > 50000 ? 'var(--rose)' : 'var(--text-1)' }}>
                          {fmt.inr(po.totalAmount)}
                          {isHV && <div style={{ fontSize:'.65rem', color:'var(--amber)', fontWeight:700, marginTop:1 }}>High-Value</div>}
                        </td>
                        <td>
                          {isHV ? (
                            <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                              <HVChip label="Dir" done={!!h.director?.approved}/>
                              <HVChip label="AGM" done={!!h.agm?.approved}/>
                              <HVChip label="GM"  done={!!h.gm?.approved}/>
                            </div>
                          ) : <span className="text-xs text-3">Standard</span>}
                        </td>
                        <td><span className={'badge '+pb.cls}>{pb.label}</span></td>
                        <td><span className={'badge '+ob.cls}>{ob.label}</span></td>
                        <td className="text-sm text-3">{fmt.date(po.createdAt)}</td>
                        <td>
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-ghost btn-xs" onClick={() => setView(po)}><Eye size={11}/> View</button>
                            {canStd && <button className="btn btn-xs" style={{ background:'var(--emerald)', color:'#fff', border:'none' }} onClick={() => approveStandard(po)}><CheckCircle size={11}/> Approve</button>}
                            {canHV  && <button className="btn btn-xs" style={{ background:'#6366f1', color:'#fff', border:'none' }} onClick={() => approveHV(po)}><CheckCircle size={11}/> HV Approve</button>}
                            {isDraft && <button className="btn btn-xs" style={{ background:'var(--red)', color:'#fff', border:'none' }} onClick={() => { setCancelModal(po); setNote(''); }}><XCircle size={11}/> Cancel</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* PO Detail Modal */}
      {viewModal && (() => {
        const h = viewModal.hvApprovals || {};
        const isHV = viewModal.requiresHighValueApproval;
        const isDraft = viewModal.orderStatus === 'draft';
        const ob = orderBadge(viewModal.orderStatus), pb = payBadge(viewModal.paymentStatus);
        return (
          <Modal open size="modal-lg" onClose={() => setView(null)} title={`Purchase Order — ${viewModal.poNumber}`}
            footer={<>
              <button className="btn btn-ghost btn-sm" onClick={() => setView(null)}>Close</button>
              {isDraft && !isHV && <button className="btn btn-success btn-sm" onClick={() => approveStandard(viewModal)}><CheckCircle size={13}/> Approve PO</button>}
              {isDraft && isHV && !myHvDone(viewModal) && <button className="btn btn-sm" style={{ background:'#6366f1', color:'#fff', border:'none' }} onClick={() => approveHV(viewModal)}><CheckCircle size={13}/> Record HV Approval</button>}
              {isDraft && <button className="btn btn-danger btn-sm" onClick={() => { setCancelModal(viewModal); setView(null); setNote(''); }}><XCircle size={13}/> Cancel PO</button>}
            </>}
          >
            {/* Header info */}
            <div className="form-row cols-3">
              <div>
                <div style={{ fontSize:'.72rem', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Department</div>
                <div style={{ fontWeight:600, textTransform:'capitalize' }}>{viewModal.department}</div>
              </div>
              <div>
                <div style={{ fontSize:'.72rem', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Vendor</div>
                <div style={{ fontWeight:600 }}>{viewModal.vendor?.shopName || '—'}</div>
                {viewModal.vendor?.mobile && <div className="text-xs text-3">{viewModal.vendor.mobile}</div>}
              </div>
              <div>
                <div style={{ fontSize:'.72rem', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Total Amount</div>
                <div style={{ fontSize:'1.3rem', fontWeight:900, color: viewModal.totalAmount>50000?'var(--rose)':'var(--indigo)', lineHeight:1 }}>{fmt.inr(viewModal.totalAmount)}</div>
                {isHV && <div style={{ fontSize:'.68rem', color:'var(--amber)', fontWeight:700, marginTop:2 }}>⚠ High-Value PO</div>}
              </div>
            </div>
            <div className="form-row cols-3">
              <div>
                <div style={{ fontSize:'.72rem', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Order Status</div>
                <span className={'badge '+ob.cls}>{ob.label}</span>
              </div>
              <div>
                <div style={{ fontSize:'.72rem', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Payment Status</div>
                <span className={'badge '+pb.cls}>{pb.label}</span>
              </div>
              <div>
                <div style={{ fontSize:'.72rem', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>Expected Delivery</div>
                <div style={{ fontWeight:500 }}>{viewModal.expectedDelivery ? fmt.date(viewModal.expectedDelivery) : '—'}</div>
              </div>
            </div>

            {/* High-value approval chain */}
            {isHV && (
              <div style={{ padding:'12px 16px', background:'var(--amber-lt)', borderRadius:8, border:'1px solid #fde68a' }}>
                <div style={{ fontSize:'.78rem', fontWeight:700, color:'var(--amber)', marginBottom:10 }}>⚠ High-Value Approval Chain (PO &gt; ₹50,000)</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {[['Director', h.director], ['AGM', h.agm], ['General Manager', h.gm]].map(([lbl, approval]) => (
                    <div key={lbl} style={{ padding:'10px 12px', background: approval?.approved ? 'var(--emerald-lt)' : 'var(--white)', borderRadius:7, border:'1px solid '+(approval?.approved?'var(--emerald)':'var(--border)') }}>
                      <div style={{ fontSize:'.72rem', fontWeight:700, color: approval?.approved ? 'var(--emerald)' : 'var(--text-4)', marginBottom:3 }}>{lbl}</div>
                      <div style={{ fontSize:'.78rem', fontWeight:600, color: approval?.approved ? 'var(--emerald)' : 'var(--text-3)' }}>
                        {approval?.approved ? `✓ ${approval.approvedBy?.name || 'Approved'}` : 'Pending approval'}
                      </div>
                      {approval?.approvedAt && <div style={{ fontSize:'.68rem', color:'var(--text-4)', marginTop:2 }}>{fmt.date(approval.approvedAt)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items table */}
            <div>
              <div style={{ fontSize:'.78rem', fontWeight:700, color:'var(--text-2)', marginBottom:6 }}>Items ({viewModal.items?.length})</div>
              <div className="card" style={{ padding:0 }}>
                <table>
                  <thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th></tr></thead>
                  <tbody>
                    {viewModal.items?.map((it, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight:600 }}>{it.itemName}</td>
                        <td className="text-sm">{it.category || '—'}</td>
                        <td style={{ fontWeight:700 }}>{it.quantity}</td>
                        <td className="text-sm">{it.unit}</td>
                        <td className="text-sm">{fmt.inr(it.unitPrice)}</td>
                        <td style={{ fontWeight:700, color:'var(--indigo)' }}>{fmt.inr(it.totalPrice)}</td>
                      </tr>
                    ))}
                    <tr style={{ background:'var(--indigo-lt)' }}>
                      <td colSpan={5} style={{ fontWeight:700, textAlign:'right', fontSize:'.875rem' }}>Total</td>
                      <td style={{ fontWeight:900, color:'var(--indigo)', fontSize:'.95rem' }}>{fmt.inr(viewModal.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {viewModal.notes && (
              <div style={{ padding:'8px 12px', background:'var(--bg-subtle)', borderRadius:8, fontSize:'.8rem' }}>
                <strong>Notes:</strong> {viewModal.notes}
              </div>
            )}
            {viewModal.approvedBy && (
              <div style={{ padding:'8px 12px', background:'var(--emerald-lt)', borderRadius:8, fontSize:'.8rem', color:'var(--emerald)', fontWeight:600 }}>
                ✓ Approved by {viewModal.approvedBy?.name} on {fmt.date(viewModal.approvedAt)}
              </div>
            )}
          </Modal>
        );
      })()}

      {/* Cancel PO */}
      {cancelModal && (
        <Modal open onClose={() => setCancelModal(null)} title={`Cancel PO — ${cancelModal.poNumber}`}
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={() => setCancelModal(null)}>Back</button>
            <button className="btn btn-danger btn-sm" onClick={cancelPO}><XCircle size={13}/> Confirm Cancel</button>
          </>}
        >
          <div style={{ padding:'10px 12px', background:'var(--red-lt)', borderRadius:8, fontSize:'.8125rem', color:'var(--red)', fontWeight:600 }}>
            Cancelling this PO will notify the procurement team. This cannot be undone.
          </div>
          <FG label="Reason for Cancellation">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Why is this PO being cancelled?" style={{ minHeight:70 }}/>
          </FG>
        </Modal>
      )}
    </div>
  );
}

// ─── Vendors ─────────────────────────────────────────────────────
function VendorsTab() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoad]    = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    setLoad(true);
    procAPI.vendors({}).then(r => setVendors(r.data)).finally(() => setLoad(false));
  }, []);

  const filtered = vendors.filter(v =>
    !search || (v.shopName || v.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'space-between' }}>
        <input placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:260 }}/>
        <span className="text-sm text-3">{filtered.length} vendor(s)</span>
      </div>
      {loading ? <div style={{ padding:32, textAlign:'center', color:'var(--text-4)' }}>Loading…</div>
        : filtered.length === 0 ? <Empty icon={Users} title="No vendors found"/>
        : (
          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Shop / Vendor Name</th><th>Contact</th><th>Email</th><th>Category</th><th>GST No.</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v._id}>
                      <td>
                        <div style={{ fontWeight:600 }}>{v.shopName || v.name}</div>
                        {v.shopName && v.name !== v.shopName && <div className="text-xs text-3">{v.name}</div>}
                      </td>
                      <td className="text-sm">{v.mobile || '—'}</td>
                      <td className="text-sm text-3">{v.email || '—'}</td>
                      <td style={{ textTransform:'capitalize', fontSize:'.8rem' }}>{v.category || '—'}</td>
                      <td className="font-mono text-xs">{v.gstNumber || '—'}</td>
                      <td><span className={`badge ${v.isActive!==false?'badge-green':'badge-red'}`}>{v.isActive!==false?'Active':'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function GMOperationsPage({ defaultTab = 'requests' }) {
  const { user } = useAuth();
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  const tabs = [
    { id:'requests', label:'Procurement Requests' },
    { id:'orders',   label:'Purchase Orders' },
    { id:'vendors',  label:'Vendors' },
  ];

  const isGM = user?.role === 'gm';
  const roleLabel = isGM ? 'GM Operations' : 'AGM Operations';

  return (
    <div className="page">
      <PageHdr icon={BadgeCheck} title={roleLabel} color="var(--indigo)"/>
      <div style={{ padding:'0 24px', background:'var(--white)', borderBottom:'1.5px solid var(--border)' }}>
        <Tabs tabs={tabs} active={tab} onChange={setTab}/>
      </div>
      <div className="page-body">
        {tab === 'requests' && <RequestsTab user={user}/>}
        {tab === 'orders'   && <PurchaseOrdersTab user={user}/>}
        {tab === 'vendors'  && <VendorsTab/>}
      </div>
    </div>
  );
}
