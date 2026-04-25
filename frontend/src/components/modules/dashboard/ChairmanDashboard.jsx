import React, { useState, useEffect } from 'react';
import { dashAPI } from '../../../api';
import { fmt, deptLabel } from "../../../utils/helpers";
import { Stat, LoadingPage, ChartTip, SectionCard } from '../../ui';
import { Shield, TrendingUp, TrendingDown, ShoppingCart, Package, AlertTriangle, Star } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ChairmanDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoad] = useState(true);
  useEffect(() => { dashAPI.chairman().then(r=>setData(r.data)).finally(()=>setLoad(false)); }, []);
  if (loading) return <LoadingPage text="Loading supervision dashboard..."/>;
  const { directors=[], monthly=[], pnl=[], deptBreakdown=[], storeSummary={}, pendingReqs=0, pendingPOs=0 } = data;
  const rev  = monthly.reduce((s,m)=>s+m.sales,0);
  const exp  = monthly.reduce((s,m)=>s+m.expenses,0);
  const deptC = d => ({ food_committee:'#d97706', sports:'#15803d', rooms_banquets:'#1d4ed8', general:'#6b7280' }[d]||'#6b7280');
  return (
    <div className="page-body">
      <div className="flex items-center justify-between">
        <div><h1 style={{fontSize:'1.4rem',marginBottom:3}}>Supervision Dashboard</h1><p style={{color:'var(--text-3)',fontSize:'.875rem'}}>{fmt.date(new Date())} — Full organisational overview</p></div>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--amber-lt)',padding:'6px 14px',borderRadius:20,border:'1.5px solid #fde68a'}}><Star size={14} style={{color:'var(--amber)'}} fill="var(--amber)"/><span style={{fontSize:'.8125rem',fontWeight:700,color:'var(--amber)'}}>Supervision Access</span></div>
      </div>
      <div className="stats-grid">
        <Stat label="30-Day Revenue"  value={fmt.inr(rev)}  color="var(--sky)"    icon={TrendingUp}   sub="All departments"/>
        <Stat label="30-Day Expenses" value={fmt.inr(exp)}  color="var(--amber)"  icon={TrendingDown} sub="All departments"/>
        <Stat label="Net Profit"       value={fmt.inr(rev-exp)} color={(rev-exp)>=0?'var(--emerald)':'var(--red)'} icon={TrendingUp}/>
        <Stat label="Active Directors" value={directors.filter(d=>d.isActive).length} color="var(--amber)" icon={Shield} sub={directors.length+' total'}/>
        <Stat label="Pending Requests" value={pendingReqs}   color="var(--rose)"   icon={ShoppingCart} sub="Procurement"/>
        <Stat label="Pending POs"      value={pendingPOs}    color="var(--indigo)" icon={Package}      sub="Awaiting approval"/>
        <Stat label="Low Stock Items"  value={(storeSummary.low||0)+(storeSummary.critical||0)} color="var(--red)" icon={AlertTriangle}/>
        <Stat label="Inventory Value"  value={fmt.inr(storeSummary.totalValue)} color="var(--text-1)" icon={Package}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:14}}>
        <SectionCard title="Revenue vs Expenses (30 Days)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+(v/1e5).toFixed(0)+'L'}/>
              <Tooltip content={<ChartTip/>}/><Legend wrapperStyle={{fontSize:'.8125rem'}}/>
              <Bar dataKey="sales" name="Revenue" fill="#1d4ed8" radius={[4,4,0,0]}/>
              <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Profit Trend">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+(v/1e5).toFixed(0)+'L'}/>
              <Tooltip content={<ChartTip/>}/>
              <Line dataKey="profit" name="Profit" stroke="#16a34a" strokeWidth={2.5} dot={{r:3}} activeDot={{r:5}}/>
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
      {deptBreakdown.length > 0 && (
        <SectionCard title="Department-wise Category Analytics (30 Days)" noPad>
          <table>
            <thead><tr><th>Department</th><th>Category</th><th>Revenue</th><th>Expenses</th><th>Profit / Loss</th></tr></thead>
            <tbody>
              {deptBreakdown.map((r,i) => (
                <tr key={i}>
                  <td style={{fontWeight:600,textTransform:'capitalize'}}>{deptLabel(r.department)}</td>
                  <td style={{textTransform:'capitalize',color:'var(--text-3)'}}>{r.category}</td>
                  <td style={{color:'#1d4ed8',fontWeight:600}}>{fmt.inr(r.sales)}</td>
                  <td style={{color:'#dc2626',fontWeight:600}}>{fmt.inr(r.expenses)}</td>
                  <td style={{fontWeight:800,color:r.profit>=0?'#16a34a':'#dc2626'}}>{r.profit>=0?'+':''}{fmt.inr(r.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <SectionCard title="Department P&L" noPad>
          <table>
            <thead><tr><th>Department</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr></thead>
            <tbody>{pnl.sort((a,b)=>b.profit-a.profit).map(d=>(
              <tr key={d.department}>
                <td style={{fontWeight:600,textTransform:'capitalize'}}>{d.department}</td>
                <td style={{color:'var(--sky)',fontWeight:600}}>{fmt.inr(d.sales)}</td>
                <td style={{color:'var(--amber)',fontWeight:600}}>{fmt.inr(d.expenses)}</td>
                <td style={{fontWeight:800,color:d.profit>=0?'var(--emerald)':'var(--red)'}}>{d.profit>=0?'+':''}{fmt.inr(d.profit)}</td>
              </tr>
            ))}</tbody>
          </table>
        </SectionCard>
        <SectionCard title="Directors" noPad>
          <table>
            <thead><tr><th>Name</th><th>Department</th><th>Status</th></tr></thead>
            <tbody>{directors.map(d=>(
              <tr key={d._id}>
                <td><div style={{fontWeight:600,fontSize:'.8125rem'}}>{d.name}</div><div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{d.committeeName}</div></td>
                <td><span style={{background:deptC(d.department)+'18',color:deptC(d.department),borderRadius:20,padding:'2px 9px',fontSize:'.75rem',fontWeight:700}}>{deptLabel(d.department)}</span></td>
                <td><div style={{display:'flex',alignItems:'center',gap:5}}><div className={'dot '+(d.isActive?'dot-green':'dot-red')}/><span style={{fontSize:'.8125rem',color:d.isActive?'var(--emerald)':'var(--text-4)'}}>{d.isActive?'Active':'Inactive'}</span></div></td>
              </tr>
            ))}</tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  );
}
