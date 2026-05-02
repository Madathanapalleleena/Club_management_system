import React, { useState, useEffect, useCallback } from 'react';
import { dashAPI } from '../../../api';
import { fmt, reqBadge } from "../../../utils/helpers";
import { LoadingPage, ChartTip, SectionCard } from '../../ui';
import { TrendingUp, TrendingDown, Wine, Building2, Trophy, Wrench, Package, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const META = {
  bar:         { label: 'Bar & Liquor',  icon: Wine,      color: '#b45309' },
  banquet:     { label: 'Banquet',       icon: Building2, color: '#0f766e' },
  rooms:       { label: 'Rooms & Hotel', icon: Building2, color: '#1d4ed8' },
  sports:      { label: 'Sports',        icon: Trophy,    color: '#15803d' },
  maintenance: { label: 'Maintenance',   icon: Wrench,    color: '#374151' },
};

const Kpi = ({ label, value, color, icon: Icon, alert }) => (
  <div style={{ background: alert ? color + '0d' : 'var(--white)', border: '1px solid ' + (alert ? color + '40' : 'var(--border)'), borderLeft: `4px solid ${color}`, borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, boxShadow: alert ? `0 2px 10px ${color}20` : '0 1px 4px rgba(0,0,0,.05)' }}>
  <div style={{ minWidth: 0, flex: 1 }}>
    <div style={{ fontSize: '.67rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: '1.55rem', fontWeight: 900, color, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
  </div>
  {Icon && <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} style={{ color }}/></div>}
  </div>
);

export function DepartmentDashboard({ dept }) {
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);
  const meta = META[dept] || { label: dept, icon: Package, color: 'var(--indigo)' };
  const Icon = meta.icon;
  const today       = new Date().toISOString().split('T')[0];
  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(today);

  const load = useCallback(() => {
    setLoad(true);
    dashAPI.department(dept, { from, to }).then(r => setData(r.data)).finally(() => setLoad(false));
  }, [dept, from, to]);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <LoadingPage/>;
  const { monthlySales = 0, monthlyExpenses = 0, monthlyProfit = 0, recentRequests = [], monthly = [], items = [] } = data || {};

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} style={{ color: meta.color }}/>
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 2 }}>{meta.label} Dashboard</h1>
            <p style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>Selected period analysis</p>
          </div>
        </div>
      </div>

      {/* Date filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--white)', border: '1.5px solid ' + meta.color, borderRadius: 'var(--radius)', padding: '10px 18px', boxShadow: `0 2px 8px ${meta.color}18` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: meta.color + '18', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CalendarDays size={15} style={{ color: meta.color }}/></div>
          <div>
            <div style={{ fontSize: '.67rem', fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '.06em' }}>Analysis Period</div>
            <div style={{ fontSize: '.73rem', color: 'var(--text-3)' }}>Filter data by date range</div>
          </div>
        </div>
        <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', flexShrink: 0 }}>From</span>
          <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} style={{ border: '1.5px solid var(--border)', padding: '6px 12px', borderRadius: 7, fontSize: '.875rem', fontWeight: 600, color: 'var(--text-1)', background: 'var(--bg-2)', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 130 }}/>
          <span style={{ color: meta.color, fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>→</span>
          <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', flexShrink: 0 }}>To</span>
          <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} style={{ border: '1.5px solid var(--border)', padding: '6px 12px', borderRadius: 7, fontSize: '.875rem', fontWeight: 600, color: 'var(--text-1)', background: 'var(--bg-2)', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 130 }}/>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <Kpi label="Period Revenue"  value={fmt.inr(monthlySales)}    color={meta.color}                             icon={TrendingUp}/>
        <Kpi label="Period Expenses" value={fmt.inr(monthlyExpenses)} color="#d97706"                                icon={TrendingDown}/>
        <Kpi label="Profit / Loss"   value={fmt.inr(monthlyProfit)}   color={monthlyProfit >= 0 ? '#16a34a' : '#dc2626'} icon={TrendingUp} alert={monthlyProfit < 0}/>
      </div>

      {/* Chart + items + requests */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
        <SectionCard title="Revenue vs Expenses Trend">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthly} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v / 1e5).toFixed(0) + 'L'}/>
              <Tooltip content={<ChartTip/>}/><Legend wrapperStyle={{ fontSize: '.75rem' }}/>
              <Bar dataKey="sales"    name="Revenue"  fill={meta.color}   radius={[3,3,0,0]}/>
              <Bar dataKey="expenses" name="Expenses" fill="#f59e0b"      radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Stock Levels" noPad>
          {items.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-4)', fontSize: '.8rem' }}>No items assigned</div>
            : items.slice(0, 7).map(i => {
              const pct = i.thresholdValue > 0 ? Math.min((i.quantity / i.thresholdValue) * 100, 100) : 100;
              const c = pct <= 50 ? '#dc2626' : pct <= 100 ? '#d97706' : '#16a34a';
              return (
                <div key={i._id} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
                    <span style={{ fontSize: '.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{i.name}</span>
                    <span style={{ fontSize: '.78rem', fontWeight: 800, color: c, flexShrink: 0 }}>{i.quantity} {i.unit}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: pct + '%', background: c }}/></div>
                </div>
              );
            })
          }
        </SectionCard>

        <SectionCard title="Recent Requests" noPad>
          {recentRequests.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-4)', fontSize: '.8rem' }}>No requests yet</div>
            : recentRequests.slice(0, 7).map(r => {
              const s = reqBadge(r.status);
              return (
                <div key={r._id} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
                    <span className="font-mono" style={{ color: 'var(--indigo)', fontWeight: 700, fontSize: '.75rem' }}>{r.requestNumber}</span>
                    <span className={'badge ' + s.cls} style={{ fontSize: '.66rem' }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: '.73rem', color: 'var(--text-3)' }}>{r.items?.length} item(s) · {fmt.date(r.createdAt)}</div>
                </div>
              );
            })
          }
        </SectionCard>
      </div>
    </div>
  );
}
