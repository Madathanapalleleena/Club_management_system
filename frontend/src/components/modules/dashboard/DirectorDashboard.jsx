import React, { useState, useEffect, useCallback } from 'react';
import { dashAPI } from '../../../api';
import { fmt, reqBadge } from '../../../utils/helpers';
import { LoadingPage, ChartTip, SectionCard } from '../../ui';
import { Shield, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COMMITTEE_LABELS = { food_committee: 'Food & Beverage Committee', sports: 'Sports Committee', rooms_banquets: 'Rooms & Banquets Committee', general: 'General Committee' };
const COMMITTEE_COLOR  = { food_committee: '#d97706', sports: '#15803d', rooms_banquets: '#1d4ed8', general: '#6b7280' };

const Kpi = ({ label, value, color, icon: Icon, alert }) => (
  <div style={{ background: alert ? color + '0d' : 'var(--white)', border: '1px solid ' + (alert ? color + '40' : 'var(--border)'), borderLeft: `4px solid ${color}`, borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, boxShadow: alert ? `0 2px 10px ${color}20` : '0 1px 4px rgba(0,0,0,.05)' }}>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: '.67rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.55rem', fontWeight: 900, color, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
    {Icon && <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} style={{ color }}/></div>}
  </div>
);

export default function DirectorDashboard() {
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);
  const today       = new Date().toISOString().split('T')[0];
  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(today);

  const load = useCallback(() => {
    setLoad(true);
    dashAPI.director({ from, to }).then(r => setData(r.data)).finally(() => setLoad(false));
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <LoadingPage text="Loading director dashboard…"/>;

  const { totalSales = 0, totalExpenses = 0, totalProfit = 0, monthly = [], recentRequests = [], deptBreakdown = [], committee = '' } = data || {};
  const color = COMMITTEE_COLOR[committee] || 'var(--indigo)';
  const committeeLabel = COMMITTEE_LABELS[committee] || committee;

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 2 }}>{committeeLabel || 'Director'} Dashboard</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>Committee performance overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: color + '15', padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${color}44` }}>
          <Shield size={13} style={{ color }}/><span style={{ fontSize: '.78rem', fontWeight: 700, color }}>Director Access</span>
        </div>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--white)', border: `1.5px solid ${color}`, borderRadius: 'var(--radius)', padding: '10px 18px', boxShadow: `0 2px 8px ${color}20` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: color + '18', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CalendarDays size={15} style={{ color }}/></div>
          <div>
            <div style={{ fontSize: '.67rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.06em' }}>Analysis Period</div>
            <div style={{ fontSize: '.73rem', color: 'var(--text-3)' }}>Filter data by date range</div>
          </div>
        </div>
        <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', flexShrink: 0 }}>From</span>
          <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} style={{ border: '1.5px solid var(--border)', padding: '6px 12px', borderRadius: 7, fontSize: '.875rem', fontWeight: 600, color: 'var(--text-1)', background: 'var(--bg-2)', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 130 }}/>
          <span style={{ color, fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>→</span>
          <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', flexShrink: 0 }}>To</span>
          <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} style={{ border: '1.5px solid var(--border)', padding: '6px 12px', borderRadius: 7, fontSize: '.875rem', fontWeight: 600, color: 'var(--text-1)', background: 'var(--bg-2)', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 130 }}/>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <Kpi label="Total Revenue"     value={fmt.inr(totalSales)}    color="#16a34a"                              icon={TrendingUp}/>
        <Kpi label="Total Expenses"    value={fmt.inr(totalExpenses)} color="#dc2626"                              icon={TrendingDown}/>
        <Kpi label="Net Profit / Loss" value={fmt.inr(totalProfit)}   color={totalProfit >= 0 ? '#16a34a' : '#dc2626'} icon={TrendingUp} alert={totalProfit < 0}/>
      </div>

      {/* Chart + dept breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: deptBreakdown.length > 0 ? '3fr 2fr' : '1fr', gap: 12 }}>
        <SectionCard title="Revenue vs Expenses">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthly} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v / 1e5).toFixed(0) + 'L'}/>
              <Tooltip content={<ChartTip/>}/><Legend wrapperStyle={{ fontSize: '.75rem' }}/>
              <Bar dataKey="sales"    name="Revenue"  fill="#16a34a" radius={[3,3,0,0]}/>
              <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {deptBreakdown.length > 0 && (
          <SectionCard title="Dept Profit / Loss" noPad>
            <table>
              <thead><tr><th>Department</th><th>Revenue</th><th>Expenses</th><th>P/L</th></tr></thead>
              <tbody>
                {deptBreakdown.sort((a, b) => b.sales - a.sales).slice(0, 6).map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '.8rem' }}>{d.department}</td>
                    <td style={{ color: '#16a34a', fontWeight: 600, fontSize: '.8rem' }}>{fmt.inr(d.sales)}</td>
                    <td style={{ color: '#dc2626', fontWeight: 600, fontSize: '.8rem' }}>{fmt.inr(d.expenses)}</td>
                    <td style={{ fontWeight: 800, color: d.profit >= 0 ? '#16a34a' : '#dc2626', fontSize: '.8rem' }}>{d.profit >= 0 ? '+' : ''}{fmt.inr(d.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
      </div>

      {/* Recent requests */}
      <SectionCard title="Recent Procurement Requests" noPad>
        {recentRequests.length === 0
          ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-4)' }}>No requests for your departments</div>
          : <table>
            <thead><tr><th>Req #</th><th>Department</th><th>Items</th><th>Priority</th><th>Status</th><th>Raised By</th><th>Date</th></tr></thead>
            <tbody>
              {recentRequests.slice(0, 5).map(r => {
                const s = reqBadge(r.status);
                return (
                  <tr key={r._id}>
                    <td className="font-mono" style={{ color: 'var(--indigo)', fontWeight: 700, fontSize: '.8rem' }}>{r.requestNumber}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: '.8rem' }}>{r.department}</td>
                    <td className="text-sm text-3">{r.items?.length} item(s)</td>
                    <td><span className={'badge badge-' + (r.priority === 'urgent' ? 'red' : r.priority === 'high' ? 'amber' : 'indigo')}>{r.priority}</span></td>
                    <td><span className={'badge ' + s.cls}>{s.label}</span></td>
                    <td className="text-sm">{r.requestedBy?.name || '—'}</td>
                    <td className="text-sm text-3">{fmt.date(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
      </SectionCard>
    </div>
  );
}
