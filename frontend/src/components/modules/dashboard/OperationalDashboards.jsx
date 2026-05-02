import React, { useState, useEffect } from 'react';
import { dashAPI, procAPI } from '../../../api';
import { fmt, orderBadge, reqBadge, stockBadge } from '../../../utils/helpers';
import { LoadingPage, SectionCard, Modal, FG } from '../../ui';
import { ShoppingCart, Package, Clock, CheckCircle, AlertTriangle, AlertCircle, Users, TrendingUp, TrendingDown, Calculator, CreditCard, CalendarDays } from 'lucide-react';
import { ChartTip } from '../../ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const AccountsFilterBar = ({ from, setFrom, to, setTo, today }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--white)', border: '1.5px solid var(--indigo)', borderRadius: 'var(--radius)', padding: '10px 18px', boxShadow: '0 2px 8px rgba(99,102,241,.10)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <div style={{ width: 32, height: 32, background: 'var(--indigo-lt)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CalendarDays size={15} style={{ color: 'var(--indigo)' }}/></div>
      <div>
        <div style={{ fontSize: '.67rem', fontWeight: 800, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Analysis Period</div>
        <div style={{ fontSize: '.73rem', color: 'var(--text-3)' }}>Filter data by date range</div>
      </div>
    </div>
    <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }}/>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', flexShrink: 0 }}>From</span>
      <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} style={{ border: '1.5px solid var(--border)', padding: '6px 12px', borderRadius: 7, fontSize: '.875rem', fontWeight: 600, color: 'var(--text-1)', background: 'var(--bg-2)', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 140 }}/>
      <span style={{ color: 'var(--indigo)', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>→</span>
      <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', flexShrink: 0 }}>To</span>
      <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} style={{ border: '1.5px solid var(--border)', padding: '6px 12px', borderRadius: 7, fontSize: '.875rem', fontWeight: 600, color: 'var(--text-1)', background: 'var(--bg-2)', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 140 }}/>
    </div>
  </div>
);

const Kpi = ({ label, value, color, icon: Icon, sub }) => (
  <div style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
    {Icon && <div style={{ width:30, height:30, borderRadius:7, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon size={14} style={{ color }}/></div>}
    <div style={{ minWidth:0 }}>
      <div style={{ fontSize:'.67rem', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</div>
      <div style={{ fontSize:'1rem', fontWeight:800, color, lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize:'.67rem', color:'var(--text-4)' }}>{sub}</div>}
    </div>
  </div>
);

// ─── Procurement ──────────────────────────────────────────────────────────────
export function ProcurementDashboard() {
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { setLoad(true); dashAPI.procurement({}).then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading && !data) return <LoadingPage/>;
  const { stats={}, recentPOs=[] } = data || {};
  return (
    <div className="page-body">
      <div>
        <h1 style={{ fontSize:'1.2rem', marginBottom:2 }}>Procurement Dashboard</h1>
        <p style={{ color:'var(--text-3)', fontSize:'.8rem' }}>Live procurement metrics</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
        <Kpi label="Pending Req."   value={stats.pReqPending||0}  color="var(--amber)"   icon={Clock}         sub="Awaiting approval"/>
        <Kpi label="Approved Req."  value={stats.pReqApproved||0} color="var(--emerald)" icon={CheckCircle}   sub="Ready for PO"/>
        <Kpi label="Active POs"     value={stats.poPending||0}    color="var(--indigo)"  icon={Package}       sub="In progress"/>
        <Kpi label="Delivered"      value={stats.poDelivered||0}  color="var(--sky)"     icon={CheckCircle}/>
        <Kpi label="Pay Pending"    value={stats.poPayPending||0} color="var(--rose)"    icon={AlertCircle}   sub="Awaiting payment"/>
        <Kpi label="Vendors"        value={stats.vendorCount||0}  color="var(--violet)"  icon={Users}/>
        <Kpi label="GRC Pending"    value={stats.grcPending||0}   color="var(--amber)"   icon={AlertTriangle} sub="Verification"/>
      </div>
      <SectionCard title="Recent Purchase Orders" noPad>
        <table>
          <thead><tr><th>PO #</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Created By</th><th>Payment By</th></tr></thead>
          <tbody>
            {recentPOs.slice(0,6).map(po => {
              const ob=orderBadge(po.orderStatus);
              return (
                <tr key={po._id}>
                  <td className="font-mono" style={{ color:'var(--indigo)', fontWeight:700, fontSize:'.78rem' }}>{po.poNumber}</td>
                  <td className="text-sm">{po.vendor?.shopName||'—'}</td>
                  <td style={{ fontWeight:700, fontSize:'.8rem' }}>{fmt.inr(po.totalAmount)}</td>
                  <td><span className={'badge '+ob.cls}>{ob.label}</span></td>
                  <td className="text-sm">{po.createdBy?.name||'—'}</td>
                  <td className="text-sm">{po.paymentUpdatedBy?.name||'—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── Store ────────────────────────────────────────────────────────────────────
export function StoreDashboard() {
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { setLoad(true); dashAPI.store({}).then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading && !data) return <LoadingPage/>;
  const { summary={}, lowItems=[], expiringItems=[], recentRequests=[] } = data || {};
  return (
    <div className="page-body">
      <div>
        <h1 style={{ fontSize:'1.2rem', marginBottom:2 }}>Store Dashboard</h1>
        <p style={{ color:'var(--text-3)', fontSize:'.8rem' }}>Live inventory overview</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
        <Kpi label="Total Items"   value={summary.total||0}        color="var(--text-1)"  icon={Package}/>
        <Kpi label="Adequate"      value={summary.adequate||0}     color="var(--emerald)" icon={CheckCircle}/>
        <Kpi label="Low Stock"     value={summary.low||0}          color="var(--amber)"   icon={AlertCircle}/>
        <Kpi label="Critical"      value={summary.critical||0}     color="var(--red)"     icon={AlertTriangle}/>
        <Kpi label="Out of Stock"  value={summary.outOfStock||0}   color="var(--red)"     icon={Package}/>
        <Kpi label="Expiring (50d)"value={summary.expiringSoon||0} color="var(--violet)"  icon={Clock}/>
        <Kpi label="Stock Value"   value={fmt.inrCompact(summary.totalValue)} color="var(--indigo)" icon={Package}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
        <SectionCard title="Low / Critical Items" noPad>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Status</th></tr></thead>
            <tbody>
              {lowItems.length===0
                ? <tr><td colSpan={3} style={{ textAlign:'center', padding:14, color:'var(--text-4)' }}>All well stocked</td></tr>
                : lowItems.slice(0,6).map(i => {
                  const b=stockBadge(i.stockStatus);
                  return (
                    <tr key={i._id}>
                      <td style={{ fontWeight:600, fontSize:'.8rem' }}>{i.name}</td>
                      <td style={{ fontWeight:700, color:i.stockStatus==='critical'?'var(--red)':'var(--amber)', fontSize:'.8rem' }}>{i.quantity} {i.unit}</td>
                      <td><span className={'badge '+b.cls}>{b.label}</span></td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </SectionCard>
        <SectionCard title="Expiring Items" noPad>
          <table>
            <thead><tr><th>Item</th><th>Expiry</th><th>Days Left</th></tr></thead>
            <tbody>
              {expiringItems.length===0
                ? <tr><td colSpan={3} style={{ textAlign:'center', padding:14, color:'var(--text-4)' }}>None expiring soon</td></tr>
                : expiringItems.slice(0,6).map(i => {
                  const d=Math.floor((new Date(i.expiryDate)-Date.now())/86400000);
                  return (
                    <tr key={i._id}>
                      <td style={{ fontWeight:600, fontSize:'.8rem' }}>{i.name}</td>
                      <td className="text-sm">{fmt.date(i.expiryDate)}</td>
                      <td style={{ fontWeight:700, color:d<=7?'var(--red)':d<=30?'var(--amber)':'var(--text-2)', fontSize:'.8rem' }}>{d}d</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </SectionCard>
        <SectionCard title="Internal Requests" noPad>
          <table>
            <thead><tr><th>Req #</th><th>Dept</th><th>Status</th></tr></thead>
            <tbody>
              {recentRequests.length===0
                ? <tr><td colSpan={3} style={{ textAlign:'center', padding:14, color:'var(--text-4)' }}>No recent requests</td></tr>
                : recentRequests.slice(0,6).map(r => {
                  const s=reqBadge(r.status)||{cls:'badge-muted',label:r.status};
                  return (
                    <tr key={r._id}>
                      <td className="font-mono" style={{ color:'var(--indigo)', fontWeight:700, fontSize:'.78rem' }}>{r.requestNumber}</td>
                      <td style={{ textTransform:'capitalize', fontSize:'.8rem' }}>{r.department}</td>
                      <td><span className={'badge '+s.cls}>{s.label}</span></td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Kitchen ──────────────────────────────────────────────────────────────────
export function KitchenDashboard() {
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { setLoad(true); dashAPI.kitchen({}).then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading && !data) return <LoadingPage/>;
  const { stats={}, recentReqs=[], utilization=[] } = data || {};
  return (
    <div className="page-body">
      <div>
        <h1 style={{ fontSize:'1.2rem', marginBottom:2 }}>Kitchen Dashboard</h1>
        <p style={{ color:'var(--text-3)', fontSize:'.8rem' }}>Material requests & utilization</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        <Kpi label="Total Requests"   value={stats.total||0}    color="var(--text-1)"/>
        <Kpi label="Pending Approval" value={stats.pending||0}  color="var(--amber)"   icon={Clock}        sub="Awaiting store"/>
        <Kpi label="Approved"         value={stats.approved||0} color="var(--emerald)" icon={CheckCircle}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:12 }}>
        <SectionCard title="Recent Requests" noPad>
          <table>
            <thead><tr><th>Req #</th><th>Items</th><th>Priority</th><th>Status</th><th>Approved By</th></tr></thead>
            <tbody>
              {recentReqs.slice(0,6).map(r => {
                const s=reqBadge(r.status);
                return (
                  <tr key={r._id}>
                    <td className="font-mono" style={{ color:'var(--indigo)', fontWeight:700, fontSize:'.78rem' }}>{r.requestNumber}</td>
                    <td className="text-sm">{r.items?.slice(0,2).map(i=>i.itemName).join(', ')}{r.items?.length>2?'…':''}</td>
                    <td><span className={'badge badge-'+(r.priority==='urgent'?'red':r.priority==='high'?'amber':'indigo')}>{r.priority}</span></td>
                    <td><span className={'badge '+s.cls}>{s.label}</span></td>
                    <td className="text-sm">{r.approvedBy?.name||'—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionCard>
        <SectionCard title="Utilization by Category">
          {utilization.length===0
            ? <p style={{ color:'var(--text-4)', fontSize:'.875rem', textAlign:'center', padding:20 }}>No data yet</p>
            : utilization.map((u,i) => {
              const max=utilization[0]?.value||1, pct=(u.value/max)*100;
              const colors=['var(--indigo)','var(--sky)','var(--emerald)','var(--amber)','var(--rose)','var(--violet)'];
              return (
                <div key={u.category} style={{ marginBottom:9 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom:3 }}>
                    <span style={{ fontSize:'.8rem', fontWeight:500 }}>{u.category}</span>
                    <span style={{ fontSize:'.8rem', fontWeight:700, color:colors[i%colors.length] }}>{fmt.inr(u.value)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width:pct+'%', background:colors[i%colors.length] }}/></div>
                </div>
              );
            })
          }
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
const PAY_STATUSES = ['pending','advance','paid','stopped'];

export function AccountsDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoad]    = useState(true);
  const today       = new Date().toISOString().split('T')[0];
  const defaultFrom = new Date(Date.now() - 29*86400000).toISOString().split('T')[0];
  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(today);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm]   = useState({ paymentStatus:'pending', advanceAmount:'', paymentMode:'cash' });

  const load = () => { setLoad(true); dashAPI.accounts({ from, to }).then(r=>setData(r.data)).finally(()=>setLoad(false)); };
  useEffect(() => { load(); }, [from, to]);

  const openPay = po => { setPayModal(po); setPayForm({ paymentStatus:po.paymentStatus, advanceAmount:po.advanceAmount||'', paymentMode:po.paymentMode||'cash' }); };
  const updatePayment = async () => {
    try {
      await procAPI.updatePO(payModal._id, { action:'update_payment', paymentStatus:payForm.paymentStatus, advanceAmount:parseFloat(payForm.advanceAmount)||0, paymentMode:payForm.paymentMode });
      toast.success('Payment updated'); load(); setPayModal(null);
    } catch { toast.error('Failed to update payment'); }
  };

  if (loading && !data) return <LoadingPage/>;
  const { monthly=[], pnl=[], pendingPaymentsPO=[] } = data || {};
  const rev=monthly.reduce((s,m)=>s+m.sales,0), exp=monthly.reduce((s,m)=>s+m.expenses,0);

  return (
    <div className="page-body">
      <div>
        <h1 style={{ fontSize:'1.2rem', marginBottom:2 }}>Accounts Dashboard</h1>
        <p style={{ color:'var(--text-3)', fontSize:'.8rem' }}>Financial overview &amp; payments</p>
      </div>

      <AccountsFilterBar from={from} setFrom={setFrom} to={to} setTo={setTo} today={today}/>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        <Kpi label="Revenue"         value={fmt.inrCompact(rev)}              color="var(--sky)"     icon={TrendingUp}/>
        <Kpi label="Expenses"        value={fmt.inrCompact(exp)}              color="var(--amber)"   icon={TrendingDown}/>
        <Kpi label="Net Profit"      value={fmt.inrCompact(rev-exp)}          color={(rev-exp)>=0?'var(--emerald)':'var(--red)'} icon={Calculator}/>
        <Kpi label="Pending Payment" value={pendingPaymentsPO.length}  color="var(--rose)"    sub="POs need payment"/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:12 }}>
        <SectionCard title="Financial Trend">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={monthly} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill:'var(--text-3)', fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'var(--text-3)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+(v/1e5).toFixed(0)+'L'}/>
              <Tooltip content={<ChartTip/>}/>
              <Legend wrapperStyle={{ fontSize:'.73rem' }}/>
              <Bar dataKey="sales"    name="Revenue"  fill="#0284c7" radius={[3,3,0,0]}/>
              <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Dept P&L">
          <div style={{ maxHeight:190, overflowY:'auto' }}>
            {pnl.sort((a,b)=>b.profit-a.profit).map(d => {
              const pct = d.sales>0 ? Math.min(Math.abs(d.profit/d.sales*100),100) : 0;
              return (
                <div key={d.department} style={{ marginBottom:7 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom:2 }}>
                    <span style={{ fontSize:'.73rem', fontWeight:600, textTransform:'capitalize' }}>{d.department}</span>
                    <span style={{ fontSize:'.73rem', fontWeight:700, color:d.profit>=0?'var(--emerald)':'var(--red)' }}>{d.profit>=0?'+':''}{fmt.inr(d.profit)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width:pct+'%', background:d.profit>=0?'var(--emerald)':'var(--red)' }}/></div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="POs Pending Payment" noPad>
        <table>
          <thead><tr><th>PO #</th><th>Vendor</th><th>Total</th><th>Advance</th><th>Balance</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {pendingPaymentsPO.length===0
              ? <tr><td colSpan={7} style={{ textAlign:'center', padding:14, color:'var(--text-4)' }}>No pending payments</td></tr>
              : pendingPaymentsPO.slice(0,6).map(po => (
                <tr key={po._id}>
                  <td className="font-mono" style={{ color:'var(--indigo)', fontWeight:700, fontSize:'.78rem' }}>{po.poNumber}</td>
                  <td className="text-sm">{po.vendor?.shopName||po.vendor?.name||'—'}</td>
                  <td style={{ fontWeight:700, fontSize:'.8rem' }}>{fmt.inr(po.totalAmount)}</td>
                  <td className="text-sm">{fmt.inr(po.advanceAmount||0)}</td>
                  <td style={{ fontWeight:700, color:'var(--red)', fontSize:'.8rem' }}>{fmt.inr(po.balanceAmount||0)}</td>
                  <td><span className="badge badge-amber">{po.paymentStatus}</span></td>
                  <td><button className="btn btn-primary btn-xs" onClick={()=>openPay(po)}><CreditCard size={11}/> Pay</button></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </SectionCard>

      {payModal && (
        <Modal open onClose={()=>setPayModal(null)} title={`Update Payment — ${payModal.poNumber}`}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setPayModal(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={updatePayment}>Save</button></>}
        >
          <div style={{ marginBottom:12, padding:'10px 14px', background:'var(--bg-2)', borderRadius:'var(--radius)', fontSize:'.875rem' }}>
            <div>Vendor: <strong>{payModal.vendor?.shopName||payModal.vendor?.name}</strong></div>
            <div>Total: <strong style={{ color:'var(--sky)' }}>{fmt.inr(payModal.totalAmount)}</strong> &nbsp; Balance: <strong style={{ color:'var(--red)' }}>{fmt.inr(payModal.balanceAmount||0)}</strong></div>
          </div>
          <FG label="Payment Status">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {PAY_STATUSES.map(s => (
                <button key={s} onClick={()=>setPayForm(f=>({...f,paymentStatus:s}))} className="btn btn-sm"
                  style={{ flex:1, justifyContent:'center', background:payForm.paymentStatus===s?'var(--indigo)':'transparent', color:payForm.paymentStatus===s?'#fff':'var(--indigo)', border:'1.5px solid var(--indigo)' }}>
                  {s==='pending'?'Pending':s==='advance'?'Advance':s==='paid'?'Paid':'Stopped'}
                </button>
              ))}
            </div>
          </FG>
          {payForm.paymentStatus==='advance' && (
            <FG label="Advance Amount (₹)">
              <input type="number" value={payForm.advanceAmount} onChange={e=>setPayForm(f=>({...f,advanceAmount:e.target.value}))} placeholder="Enter amount paid"/>
            </FG>
          )}
          <FG label="Payment Mode">
            <select value={payForm.paymentMode} onChange={e=>setPayForm(f=>({...f,paymentMode:e.target.value}))}>
              {['cash','upi','card','cheque','online'].map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </FG>
        </Modal>
      )}
    </div>
  );
}

// ─── HR ───────────────────────────────────────────────────────────────────────
export function HRDashboard() {
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { setLoad(true); dashAPI.hr({}).then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading && !data) return <LoadingPage/>;
  const { stats={}, byDept=[], recentStaff=[] } = data || {};
  return (
    <div className="page-body">
      <div>
        <h1 style={{ fontSize:'1.2rem', marginBottom:2 }}>HR Dashboard</h1>
        <p style={{ color:'var(--text-3)', fontSize:'.8rem' }}>Staff overview</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        <Kpi label="Total Staff" value={stats.total||0}    color="var(--text-1)" icon={Users}/>
        <Kpi label="Active"      value={stats.active||0}   color="var(--emerald)" icon={CheckCircle}/>
        <Kpi label="Inactive"    value={stats.inactive||0} color="var(--red)"    icon={AlertTriangle}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12 }}>
        <SectionCard title="Staff by Department">
          <div style={{ maxHeight:230, overflowY:'auto' }}>
            {byDept.sort((a,b)=>b.count-a.count).map(r => (
              <div key={r._id||'unassigned'} className="flex items-center justify-between" style={{ padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:'.8rem', fontWeight:500, textTransform:'capitalize' }}>{r._id||'Unassigned'}</span>
                <span style={{ background:'var(--indigo-lt)', color:'var(--indigo)', borderRadius:20, padding:'2px 9px', fontSize:'.73rem', fontWeight:700 }}>{r.count}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Recently Added Staff" noPad>
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Added</th></tr></thead>
            <tbody>
              {recentStaff.slice(0,6).map(s => (
                <tr key={s._id}>
                  <td style={{ fontWeight:600, fontSize:'.8rem' }}>{s.name}</td>
                  <td className="text-sm">{s.role?.replace(/_/g,' ')}</td>
                  <td style={{ textTransform:'capitalize', fontSize:'.8rem' }}>{s.department||'—'}</td>
                  <td className="text-sm text-3">{fmt.ago(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  );
}
