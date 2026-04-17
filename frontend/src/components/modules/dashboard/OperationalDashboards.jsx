import React, { useState, useEffect } from 'react';
import { dashAPI } from '../../../api';
import { fmt, orderBadge, reqBadge, stockBadge } from '../../../utils/helpers';
import { Stat, LoadingPage, SectionCard } from '../../ui';
import { ShoppingCart, Package, Clock, CheckCircle, AlertTriangle, AlertCircle, Users, TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartTip } from '../../ui';

export function ProcurementDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { dashAPI.procurement().then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading) return <LoadingPage/>;
  const { stats={}, recentReqs=[], recentPOs=[] } = data;
  return (
    <div className="page-body">
      <div><h1 style={{fontSize:'1.4rem',marginBottom:3}}>Procurement Dashboard</h1><p style={{color:'var(--text-3)',fontSize:'.875rem'}}>{fmt.date(new Date())}</p></div>
      <div className="stats-grid">
        <Stat label="Pending Requests"  value={stats.pReqPending||0}   color="var(--amber)"   icon={Clock}         sub="Awaiting approval"/>
        <Stat label="Approved Requests" value={stats.pReqApproved||0}  color="var(--emerald)" icon={CheckCircle}   sub="Ready for PO"/>
        <Stat label="Active POs"        value={stats.poPending||0}     color="var(--indigo)"  icon={Package}       sub="In progress"/>
        <Stat label="Delivered POs"     value={stats.poDelivered||0}   color="var(--sky)"     icon={CheckCircle}/>
        <Stat label="Payment Pending"   value={stats.poPayPending||0}  color="var(--rose)"    icon={AlertCircle}   sub="POs awaiting payment"/>
        <Stat label="Active Vendors"    value={stats.vendorCount||0}   color="var(--violet)"  icon={Users}/>
        <Stat label="GRC Pending"       value={stats.grcPending||0}    color="var(--amber)"   icon={AlertTriangle} sub="Verification needed"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <SectionCard title="Recent Requests" noPad>
          <table>
            <thead><tr><th>Req #</th><th>Dept</th><th>Priority</th><th>Status</th><th>Raised By</th><th>Approved By</th></tr></thead>
            <tbody>{recentReqs.map(r=>{const s=reqBadge(r.status);return(<tr key={r._id}><td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{r.requestNumber}</td><td style={{textTransform:'capitalize',fontSize:'.8125rem'}}>{r.department}</td><td><span className={'badge badge-'+(r.priority==='urgent'?'red':r.priority==='high'?'amber':'indigo')}>{r.priority}</span></td><td><span className={'badge '+s.cls}>{s.label}</span></td><td><div style={{fontSize:'.8125rem'}}>{r.requestedBy?.name||'—'}</div><div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{r.requestedBy?.role}</div></td><td>{r.approvedBy?<span style={{fontWeight:600,color:'var(--emerald)',fontSize:'.8125rem'}}>{r.approvedBy?.name}</span>:r.rejectedBy?<span style={{fontWeight:600,color:'var(--red)',fontSize:'.8125rem'}}>{r.rejectedBy?.name}</span>:'—'}</td></tr>);})}</tbody>
          </table>
        </SectionCard>
        <SectionCard title="Recent Purchase Orders" noPad>
          <table>
            <thead><tr><th>PO #</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Created By</th><th>Payment By</th></tr></thead>
            <tbody>{recentPOs.map(po=>{const ob=orderBadge(po.orderStatus);return(<tr key={po._id}><td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{po.poNumber}</td><td className="text-sm">{po.vendor?.shopName||'—'}</td><td style={{fontWeight:700}}>{fmt.inr(po.totalAmount)}</td><td><span className={'badge '+ob.cls}>{ob.label}</span></td><td className="text-sm">{po.createdBy?.name||'—'}</td><td className="text-sm">{po.paymentUpdatedBy?.name||'—'}</td></tr>);})}</tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  );
}

export function StoreDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { dashAPI.store().then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading) return <LoadingPage/>;
  const { summary={}, lowItems=[], expiringItems=[], recentRequests=[] } = data;
  return (
    <div className="page-body">
      <div><h1 style={{fontSize:'1.4rem',marginBottom:3}}>Store Dashboard</h1><p style={{color:'var(--text-3)',fontSize:'.875rem'}}>Inventory overview · {fmt.date(new Date())}</p></div>
      <div className="stats-grid">
        <Stat label="Total Items"    value={summary.total||0}        color="var(--text-1)"/>
        <Stat label="Adequate"       value={summary.adequate||0}     color="var(--emerald)" icon={CheckCircle}/>
        <Stat label="Low Stock"      value={summary.low||0}          color="var(--amber)"   icon={AlertCircle}/>
        <Stat label="Critical"       value={summary.critical||0}     color="var(--red)"     icon={AlertTriangle}/>
        <Stat label="Out of Stock"   value={summary.outOfStock||0}   color="var(--red)"     icon={Package}/>
        <Stat label="Expiring (50d)" value={summary.expiringSoon||0} color="var(--violet)"  icon={Clock}/>
        <Stat label="Stock Value"    value={fmt.inr(summary.totalValue)} color="var(--indigo)" icon={Package}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <SectionCard title="⚠️ Low / Critical Items" noPad>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Threshold</th><th>Status</th></tr></thead>
            <tbody>{lowItems.length===0?<tr><td colSpan={4} style={{textAlign:'center',padding:20,color:'var(--text-4)'}}>All items well stocked</td></tr>:lowItems.map(i=>{const b=stockBadge(i.stockStatus);return(<tr key={i._id}><td style={{fontWeight:600,fontSize:'.8125rem'}}>{i.name}</td><td style={{fontWeight:700,color:i.stockStatus==='critical'?'var(--red)':'var(--amber)'}}>{i.quantity} {i.unit}</td><td className="text-3 text-sm">{i.thresholdValue} {i.unit}</td><td><span className={'badge '+b.cls}>{b.label}</span></td></tr>);})}</tbody>
          </table>
        </SectionCard>
        <SectionCard title="⏰ Expiring Items (50 days)" noPad>
          <table>
            <thead><tr><th>Item</th><th>Expiry Date</th><th>Days Left</th></tr></thead>
            <tbody>{expiringItems.length===0?<tr><td colSpan={3} style={{textAlign:'center',padding:20,color:'var(--text-4)'}}>No items expiring soon</td></tr>:expiringItems.map(i=>{const d=Math.floor((new Date(i.expiryDate)-Date.now())/86400000);return(<tr key={i._id}><td style={{fontWeight:600,fontSize:'.8125rem'}}>{i.name}</td><td className="text-sm">{fmt.date(i.expiryDate)}</td><td style={{fontWeight:700,color:d<=7?'var(--red)':d<=30?'var(--amber)':'var(--text-2)'}}>{d}d</td></tr>);})}</tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  );
}

export function KitchenDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { dashAPI.kitchen().then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading) return <LoadingPage/>;
  const { stats={}, recentReqs=[], utilization=[] } = data;
  return (
    <div className="page-body">
      <div><h1 style={{fontSize:'1.4rem',marginBottom:3}}>Kitchen Dashboard</h1><p style={{color:'var(--text-3)',fontSize:'.875rem'}}>{fmt.date(new Date())}</p></div>
      <div className="stats-grid">
        <Stat label="Total Requests"   value={stats.total||0}   color="var(--text-1)"/>
        <Stat label="Pending Approval" value={stats.pending||0} color="var(--amber)" icon={Clock} sub="Awaiting store"/>
        <Stat label="Approved"         value={stats.approved||0} color="var(--emerald)" icon={CheckCircle}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <SectionCard title="Recent Requests" noPad>
          <table>
            <thead><tr><th>Req #</th><th>Items</th><th>Priority</th><th>Status</th><th>Approved By</th></tr></thead>
            <tbody>{recentReqs.map(r=>{const s=reqBadge(r.status);return(<tr key={r._id}><td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{r.requestNumber}</td><td className="text-sm">{r.items?.slice(0,2).map(i=>i.itemName).join(', ')}{r.items?.length>2?'...':''}</td><td><span className={'badge badge-'+(r.priority==='urgent'?'red':r.priority==='high'?'amber':'indigo')}>{r.priority}</span></td><td><span className={'badge '+s.cls}>{s.label}</span></td><td className="text-sm">{r.approvedBy?.name||'—'}</td></tr>);})}</tbody>
          </table>
        </SectionCard>
        <SectionCard title="Utilization by Category (30 days)">
          {utilization.length===0?<p style={{color:'var(--text-4)',fontSize:'.875rem',textAlign:'center',padding:20}}>No data yet</p>:utilization.map((u,i)=>{const max=utilization[0]?.value||1;const pct=(u.value/max)*100;const colors=['var(--indigo)','var(--sky)','var(--emerald)','var(--amber)','var(--rose)','var(--violet)'];return(<div key={u.category} style={{marginBottom:10}}><div className="flex items-center justify-between" style={{marginBottom:4}}><span style={{fontSize:'.8125rem',fontWeight:500}}>{u.category}</span><span style={{fontSize:'.8125rem',fontWeight:700,color:colors[i%colors.length]}}>{fmt.inr(u.value)}</span></div><div className="progress-bar"><div className="progress-fill" style={{width:pct+'%',background:colors[i%colors.length]}}/></div></div>);})}
        </SectionCard>
      </div>
    </div>
  );
}

export function AccountsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { dashAPI.accounts().then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading) return <LoadingPage/>;
  const { monthly=[], pnl=[], pendingPaymentsPO=[] } = data;
  const rev=monthly.reduce((s,m)=>s+m.sales,0), exp=monthly.reduce((s,m)=>s+m.expenses,0);
  return (
    <div className="page-body">
      <div><h1 style={{fontSize:'1.4rem',marginBottom:3}}>Accounts Dashboard</h1><p style={{color:'var(--text-3)',fontSize:'.875rem'}}>{fmt.date(new Date())}</p></div>
      <div className="stats-grid">
        <Stat label="30-Day Revenue"  value={fmt.inr(rev)} color="var(--sky)"  icon={TrendingUp}/>
        <Stat label="30-Day Expenses" value={fmt.inr(exp)} color="var(--amber)" icon={TrendingDown}/>
        <Stat label="Net Profit"       value={fmt.inr(rev-exp)} color={(rev-exp)>=0?'var(--emerald)':'var(--red)'} icon={Calculator}/>
        <Stat label="POs Pending Payment" value={pendingPaymentsPO.length} color="var(--rose)" sub="Require payment update"/>
      </div>
      <SectionCard title="POs Pending Payment" noPad>
        <table>
          <thead><tr><th>PO Number</th><th>Vendor</th><th>Total</th><th>Advance</th><th>Balance</th><th>Payment Status</th><th>Created By</th></tr></thead>
          <tbody>{pendingPaymentsPO.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:20,color:'var(--text-4)'}}>No pending payments</td></tr>:pendingPaymentsPO.map(po=>{const pb=orderBadge(po.paymentStatus);return(<tr key={po._id}><td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{po.poNumber}</td><td className="text-sm">{po.vendor?.name||'—'}</td><td style={{fontWeight:700}}>{fmt.inr(po.totalAmount)}</td><td>{fmt.inr(po.advanceAmount)}</td><td style={{fontWeight:700,color:'var(--red)'}}>{fmt.inr(po.balanceAmount)}</td><td><span className={'badge badge-amber'}>{po.paymentStatus}</span></td><td className="text-sm">{po.createdBy?.name||'—'}</td></tr>);})}</tbody>
        </table>
      </SectionCard>
    </div>
  );
}

export function HRDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { dashAPI.hr().then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading) return <LoadingPage/>;
  const { stats={}, byDept=[], recentStaff=[] } = data;
  return (
    <div className="page-body">
      <div><h1 style={{fontSize:'1.4rem',marginBottom:3}}>HR Dashboard</h1><p style={{color:'var(--text-3)',fontSize:'.875rem'}}>{fmt.date(new Date())}</p></div>
      <div className="stats-grid">
        <Stat label="Total Staff" value={stats.total||0} color="var(--text-1)" icon={Users}/>
        <Stat label="Active"      value={stats.active||0} color="var(--emerald)"/>
        <Stat label="Inactive"    value={stats.inactive||0} color="var(--red)"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <SectionCard title="Staff by Department">
          {byDept.sort((a,b)=>b.count-a.count).map(r=>(
            <div key={r._id||'unassigned'} className="flex items-center justify-between" style={{padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:'.875rem',fontWeight:500,textTransform:'capitalize'}}>{r._id||'Unassigned'}</span>
              <span style={{background:'var(--indigo-lt)',color:'var(--indigo)',borderRadius:20,padding:'2px 10px',fontSize:'.75rem',fontWeight:700}}>{r.count}</span>
            </div>
          ))}
        </SectionCard>
        <SectionCard title="Recently Added Staff" noPad>
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Added</th></tr></thead>
            <tbody>{recentStaff.map(s=>(<tr key={s._id}><td style={{fontWeight:600,fontSize:'.8125rem'}}>{s.name}</td><td className="text-sm">{s.role?.replace(/_/g,' ')}</td><td style={{textTransform:'capitalize',fontSize:'.8125rem'}}>{s.department||'—'}</td><td className="text-sm text-3">{fmt.ago(s.createdAt)}</td></tr>))}</tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  );
}
