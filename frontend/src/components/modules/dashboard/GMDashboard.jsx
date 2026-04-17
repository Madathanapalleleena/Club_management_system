import React, { useState, useEffect } from 'react';
import { dashAPI } from '../../../api';
import { fmt, orderBadge, payBadge } from '../../../utils/helpers';
import { Stat, LoadingPage, ChartTip, SectionCard } from '../../ui';
import { TrendingUp, TrendingDown, ShoppingCart, Package, AlertTriangle, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function GMDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { dashAPI.gm().then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading) return <LoadingPage/>;
  const { monthly=[], pnl=[], storeSummary={}, pendingReqs=0, pendingPOs=0, recentPOs=[] } = data;
  const rev=monthly.reduce((s,m)=>s+m.sales,0), exp=monthly.reduce((s,m)=>s+m.expenses,0);
  return (
    <div className="page-body">
      <div className="flex items-center justify-between">
        <div><h1 style={{fontSize:'1.4rem',marginBottom:3}}>Operations Dashboard</h1><p style={{color:'var(--text-3)',fontSize:'.875rem'}}>Full operational overview · {fmt.date(new Date())}</p></div>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--sky-lt)',padding:'6px 14px',borderRadius:20,border:'1.5px solid #bae6fd'}}><Activity size={14} style={{color:'var(--sky)'}}/><span style={{fontSize:'.8125rem',fontWeight:700,color:'var(--sky)'}}>Management Access</span></div>
      </div>
      <div className="stats-grid">
        <Stat label="30-Day Revenue"  value={fmt.inr(rev)} color="var(--sky)"    icon={TrendingUp}/>
        <Stat label="30-Day Expenses" value={fmt.inr(exp)} color="var(--amber)"  icon={TrendingDown}/>
        <Stat label="Net Profit"       value={fmt.inr(rev-exp)} color={(rev-exp)>=0?'var(--emerald)':'var(--red)'} icon={TrendingUp}/>
        <Stat label="Pending Requests" value={pendingReqs}  color="var(--rose)"   icon={ShoppingCart} sub="Awaiting approval"/>
        <Stat label="Active POs"       value={pendingPOs}   color="var(--indigo)" icon={Package}/>
        <Stat label="Low Stock"        value={(storeSummary.low||0)+(storeSummary.critical||0)} color="var(--red)" icon={AlertTriangle}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        <SectionCard title="30-Day Financial Overview">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+(v/1e5).toFixed(0)+'L'}/>
              <Tooltip content={<ChartTip/>}/><Legend wrapperStyle={{fontSize:'.8125rem'}}/>
              <Bar dataKey="sales" name="Revenue" fill="#0284c7" radius={[4,4,0,0]}/>
              <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4,4,0,0]}/>
              <Bar dataKey="profit" name="Profit" fill="#059669" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Department P&L">
          {pnl.sort((a,b)=>b.profit-a.profit).map(d=>{
            const pct = d.sales>0?Math.abs(d.profit/d.sales*100):0;
            return (
              <div key={d.department} style={{marginBottom:8}}>
                <div className="flex items-center justify-between" style={{marginBottom:3}}>
                  <span style={{fontSize:'.8125rem',fontWeight:500,textTransform:'capitalize'}}>{d.department}</span>
                  <span style={{fontSize:'.8125rem',fontWeight:700,color:d.profit>=0?'var(--emerald)':'var(--red)'}}>{d.profit>=0?'+':''}{fmt.inr(d.profit)}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{width:Math.min(pct,100)+'%',background:d.profit>=0?'var(--emerald)':'var(--red)'}}/></div>
              </div>
            );
          })}
        </SectionCard>
      </div>
      <SectionCard title="Recent Purchase Orders" noPad>
        <table>
          <thead><tr><th>PO Number</th><th>Vendor</th><th>Department</th><th>Amount</th><th>Payment</th><th>Status</th><th>Created By</th><th>Approved By</th></tr></thead>
          <tbody>
            {recentPOs.map(po=>{
              const ob=orderBadge(po.orderStatus),pb=payBadge(po.paymentStatus);
              return (
                <tr key={po._id}>
                  <td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{po.poNumber}</td>
                  <td className="text-sm">{po.vendor?.shopName||'—'}</td>
                  <td style={{textTransform:'capitalize',fontSize:'.8125rem'}}>{po.department}</td>
                  <td style={{fontWeight:700}}>{fmt.inr(po.totalAmount)}</td>
                  <td><span className={'badge '+pb.cls}>{pb.label}</span>{po.paymentUpdatedBy&&<div style={{fontSize:'.7rem',color:'var(--text-4)'}}>by {po.paymentUpdatedBy?.name}</div>}</td>
                  <td><span className={'badge '+ob.cls}>{ob.label}</span></td>
                  <td className="text-sm">{po.createdBy?.name||'—'}</td>
                  <td className="text-sm">{po.approvedBy?.name||'—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
