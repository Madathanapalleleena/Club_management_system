import React, { useState, useEffect } from 'react';
import { dashAPI } from '../../../api';
import { fmt, reqBadge } from "../../../utils/helpers";
import { Stat, LoadingPage, ChartTip, SectionCard } from '../../ui';
import { TrendingUp, TrendingDown, Wine, Building2, Trophy, Wrench, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { useAuth } from '../../../contexts/AuthContext';

const META = {
  bar:            { label:'Bar & Liquor',    icon:Wine,      color:'#b45309' },
  banquet:        { label:'Banquet',         icon:Building2, color:'#0f766e' },
  rooms:          { label:'Rooms & Hotel',   icon:Building2, color:'#1d4ed8' },
  sports:         { label:'Sports',          icon:Trophy,    color:'#15803d' },
  maintenance:    { label:'Maintenance',     icon:Wrench,    color:'#374151' },
  food_committee: { label:'Food Committee',  icon:Package,   color:'#059669' },
  general:        { label:'General',         icon:Building2, color:'#4f46e5' },
};

export default function DirectorDashboard() {
  const { user } = useAuth();
  const dept = user?.department || 'general';
  
  const [data, setData] = useState(null);
  const [loading, setLoad] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const meta = META[dept] || { label:dept.replace(/_/g, ' '), icon:Package, color:'var(--indigo)' };
  const Icon = meta.icon;

  useEffect(() => { 
    setLoad(true);
    dashAPI.department(dept, selectedDate).then(r=>setData(r.data)).finally(()=>setLoad(false)); 
  }, [dept, selectedDate]);
  
  if (loading && !data) return <LoadingPage/>;
  const { monthlySales=0, monthlyExpenses=0, monthlyProfit=0, recentRequests=[], monthly=[], items=[] } = data || {};

  return (
    <div className="page-body">
      <div className="flex items-center justify-between" style={{marginBottom:4}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:42,height:42,borderRadius:12,background:meta.color+'18',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={20} style={{color:meta.color}}/></div>
          <div>
            <h1 style={{fontSize:'1.4rem',marginBottom:2}}>{meta.label} Director Dashboard</h1>
            <p style={{color:'var(--text-3)',fontSize:'.875rem'}}>Metrics up to · {fmt.date(new Date(selectedDate))}</p>
          </div>
        </div>
        <div>
          <input type="date" className="input-sm" style={{borderRadius:8, border:'1px solid var(--border)', padding:'4px 8px'}} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
      </div>
      <div className="stats-grid">
        <Stat label="Monthly Revenue"  value={fmt.inr(monthlySales)}    color={meta.color}        icon={TrendingUp}/>
        <Stat label="Monthly Expenses" value={fmt.inr(monthlyExpenses)} color="var(--amber)"      icon={TrendingDown}/>
        <Stat label="Monthly Profit"   value={fmt.inr(monthlyProfit)}   color={monthlyProfit>=0?'var(--emerald)':'var(--red)'} icon={TrendingUp}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        <SectionCard title="30-Day Revenue Trend">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+(v/1e5).toFixed(0)+'L'}/>
              <Tooltip content={<ChartTip/>}/><Legend wrapperStyle={{fontSize:'.8125rem'}}/>
              <Bar dataKey="sales" name="Revenue" fill={meta.color} radius={[4,4,0,0]}/>
              <Bar dataKey="expenses" name="Expenses" fill="var(--amber)" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Department Items" noPad>
          {items.length===0?<div style={{padding:20,textAlign:'center',color:'var(--text-4)',fontSize:'.875rem'}}>No items assigned</div>:
            items.slice(0,8).map(i=>{
              const pct=i.thresholdValue>0?Math.min((i.quantity/i.thresholdValue)*100,100):100;
              const c=pct<=50?'var(--red)':pct<=100?'var(--amber)':'var(--emerald)';
              return (
                <div key={i._id} style={{padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>
                  <div className="flex items-center justify-between" style={{marginBottom:3}}>
                    <span style={{fontSize:'.8125rem',fontWeight:500}}>{i.name}</span>
                    <span style={{fontSize:'.8125rem',fontWeight:700,color:c}}>{i.quantity} {i.unit}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:pct+'%',background:c}}/></div>
                </div>
              );
            })
          }
        </SectionCard>
      </div>
      <SectionCard title="Recent Material Requests" noPad>
        <table>
          <thead><tr><th>Req #</th><th>Items</th><th>Priority</th><th>Status</th><th>Raised By</th><th>Approved By</th><th>Date</th></tr></thead>
          <tbody>
            {recentRequests.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:20,color:'var(--text-4)'}}>No requests yet</td></tr>:
              recentRequests.map(r=>{
                const s=reqBadge(r.status);
                return (
                  <tr key={r._id}>
                    <td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{r.requestNumber}</td>
                    <td className="text-sm text-3">{r.items?.length} item(s)</td>
                    <td><span className={'badge badge-'+(r.priority==='urgent'?'red':r.priority==='high'?'amber':'indigo')}>{r.priority}</span></td>
                    <td><span className={'badge '+s.cls}>{s.label}</span></td>
                    <td className="text-sm">{r.requestedBy?.name||'—'}</td>
                    <td className="text-sm">{r.approvedBy?<span style={{fontWeight:600,color:'var(--emerald)'}}>{r.approvedBy?.name}</span>:'—'}</td>
                    <td className="text-sm text-3">{fmt.date(r.createdAt)}</td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
