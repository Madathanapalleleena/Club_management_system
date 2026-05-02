import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashAPI } from '../../../api';
import { fmt } from '../../../utils/helpers';
import { LoadingPage, ChartTip, SectionCard } from '../../ui';
import { Shield, TrendingUp, TrendingDown, ClipboardList, BarChart2, Archive, AlertTriangle, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COMMITTEE_COLORS = {
  food_committee: '#d97706', sports: '#15803d', rooms_banquets: '#1d4ed8', general: '#6b7280',
};
const COMMITTEE_LABELS = {
  food_committee: 'Food & Beverage', sports: 'Sports', rooms_banquets: 'Rooms & Banquets', general: 'General / Admin',
};
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—';

const Kpi = ({ label, value, color, icon: Icon }) => (
  <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderLeft: `4px solid ${color}`, borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: '.67rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.55rem', fontWeight: 900, color, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
    {Icon && <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} style={{ color }}/></div>}
  </div>
);

const FilterBar = ({ from, setFrom, to, setTo, today }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--white)', border: '1.5px solid var(--amber)', borderRadius: 'var(--radius)', padding: '10px 18px', boxShadow: '0 2px 8px rgba(217,119,6,.10)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <div style={{ width: 32, height: 32, background: 'var(--amber-lt)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CalendarDays size={15} style={{ color: 'var(--amber)' }}/></div>
      <div>
        <div style={{ fontSize: '.67rem', fontWeight: 800, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Analysis Period</div>
        <div style={{ fontSize: '.73rem', color: 'var(--text-3)' }}>Filter data by date range</div>
      </div>
    </div>
    <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }}/>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', flexShrink: 0 }}>From</span>
      <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} style={{ border: '1.5px solid var(--border)', padding: '6px 12px', borderRadius: 7, fontSize: '.875rem', fontWeight: 600, color: 'var(--text-1)', background: 'var(--bg-2)', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 130 }}/>
      <span style={{ color: 'var(--amber)', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>→</span>
      <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', flexShrink: 0 }}>To</span>
      <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} style={{ border: '1.5px solid var(--border)', padding: '6px 12px', borderRadius: 7, fontSize: '.875rem', fontWeight: 600, color: 'var(--text-1)', background: 'var(--bg-2)', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 130 }}/>
    </div>
  </div>
);

export default function ChairmanDashboard() {
  const navigate = useNavigate();
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);
  const today       = new Date().toISOString().split('T')[0];
  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(today);

  const load = useCallback(() => {
    setLoad(true);
    dashAPI.chairman({ from, to }).then(r => setData(r.data)).finally(() => setLoad(false));
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <LoadingPage text="Loading dashboard…"/>;

  const { directors = [], monthly = [], procStats = {}, storeSummary = {}, lowStockItems = [] } = data || {};
  const rev = monthly.reduce((s, m) => s + m.sales, 0);
  const exp = monthly.reduce((s, m) => s + m.expenses, 0);
  const activeDirectors   = directors.filter(d => d.isActive).length;
  const inactiveDirectors = directors.filter(d => !d.isActive).length;

  const QuickCard = ({ icon: Icon, label, value, sub, color, onClick }) => (
    <div
      onClick={onClick}
      style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', cursor: 'pointer', transition: 'box-shadow var(--t)', display: 'flex', alignItems: 'center', gap: 14 }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ width: 42, height: 42, borderRadius: 12, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} style={{ color }}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '.72rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: '.75rem', color: 'var(--text-4)', flexShrink: 0 }}>→</div>
    </div>
  );

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '1.4rem', marginBottom: 3 }}>Supervision Overview</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>Chairman &amp; Secretary — overall summary</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--amber-lt)', padding: '5px 12px', borderRadius: 20, border: '1.5px solid #fde68a' }}>
          <Shield size={13} style={{ color: 'var(--amber)' }} fill="var(--amber)"/>
          <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--amber)' }}>Supervision Access</span>
        </div>
      </div>

      <FilterBar from={from} setFrom={setFrom} to={to} setTo={setTo} today={today}/>

      {/* Top KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <Kpi label="Total Revenue"  value={fmt.inr(rev)}      color="#16a34a" icon={TrendingUp}/>
        <Kpi label="Total Expenses" value={fmt.inr(exp)}       color="#dc2626" icon={TrendingDown}/>
        <Kpi label="Net Profit"     value={fmt.inr(rev - exp)} color={(rev - exp) >= 0 ? '#16a34a' : '#dc2626'} icon={TrendingUp}/>
      </div>

      {/* Monthly chart */}
      <SectionCard title="Revenue vs Expenses Trend (Selected Period)">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={monthly} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
            <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v / 1e5).toFixed(0) + 'L'}/>
            <Tooltip content={<ChartTip/>}/>
            <Legend wrapperStyle={{ fontSize: '.8125rem' }}/>
            <Bar dataKey="sales"    name="Revenue"  fill="#16a34a" radius={[4, 4, 0, 0]}/>
            <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[4, 4, 0, 0]}/>
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Quick navigation cards */}
      <div>
        <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Quick Access</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <QuickCard
            icon={Shield} label="Directors" color="var(--indigo)"
            value={`${activeDirectors} active`}
            sub={inactiveDirectors > 0 ? `${inactiveDirectors} inactive` : 'All active'}
            onClick={() => navigate('/directors')}
          />
          <QuickCard
            icon={ClipboardList} label="Procurement Requests" color="var(--amber)"
            value={procStats.pending || 0}
            sub={`${procStats.pending || 0} pending approval`}
            onClick={() => navigate('/chair/requests')}
          />
          <QuickCard
            icon={BarChart2} label="Dept Analytics" color="#1d4ed8"
            value={`${monthly.length} months`}
            sub="Revenue · Expenses · P&L"
            onClick={() => navigate('/chair/analytics')}
          />
          <QuickCard
            icon={Archive} label="Inventory & Stock" color="var(--emerald)"
            value={storeSummary.total || 0}
            sub={lowStockItems.length > 0 ? <span style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11}/>{lowStockItems.length} items low/critical</span> : 'All items stocked'}
            onClick={() => navigate('/chair/inventory')}
          />
        </div>
      </div>

      {/* Directors mini-table */}
      <SectionCard title={`Directors — ${activeDirectors} active / ${inactiveDirectors} inactive`} noPad>
        <table>
          <thead><tr><th>Name</th><th>Committee</th><th>Status</th></tr></thead>
          <tbody>
            {directors.length === 0
              ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--text-4)' }}>No directors found</td></tr>
              : directors.map(d => (
                <tr key={d._id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '.8125rem' }}>{d.name}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text-4)' }}>{d.committeeName}</div>
                  </td>
                  <td>
                    <span style={{ background: (COMMITTEE_COLORS[d.department] || '#6b7280') + '18', color: COMMITTEE_COLORS[d.department] || '#6b7280', borderRadius: 20, padding: '2px 9px', fontSize: '.75rem', fontWeight: 700 }}>
                      {COMMITTEE_LABELS[d.department] || cap(d.department)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div className={'dot ' + (d.isActive ? 'dot-green' : 'dot-red')}/>
                      <span style={{ fontSize: '.8125rem', color: d.isActive ? 'var(--emerald)' : 'var(--text-4)' }}>{d.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
