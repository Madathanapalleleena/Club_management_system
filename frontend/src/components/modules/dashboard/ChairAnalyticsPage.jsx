import React, { useState, useEffect, useCallback } from 'react';
import { dashAPI } from '../../../api';
import { fmt } from '../../../utils/helpers';
import { LoadingPage, ChartTip, SectionCard } from '../../ui';
import { CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const FilterBar = ({ from, setFrom, to, setTo, today }) => (
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

const COMMITTEE_MAP = {
  food_committee: ['kitchen', 'bar', 'banquet', 'restaurant'],
  sports:         ['sports'],
  rooms_banquets: ['rooms', 'banquet'],
  general:        ['management', 'hr', 'accounts', 'maintenance', 'procurement', 'store'],
};
const COMMITTEE_LABELS = {
  food_committee: 'Food & Beverage',
  sports:         'Sports',
  rooms_banquets: 'Rooms & Banquets',
  general:        'General / Admin',
  other:          'Other',
};
const COMMITTEE_COLORS = {
  food_committee: '#d97706',
  sports:         '#15803d',
  rooms_banquets: '#1d4ed8',
  general:        '#6b7280',
  other:          '#7c3aed',
};

function groupByCommittee(deptBreakdown) {
  const result = {};
  Object.entries(COMMITTEE_MAP).forEach(([committee, depts]) => {
    const rows = deptBreakdown.filter(d => depts.includes(d.department));
    if (rows.length) result[committee] = rows;
  });
  const mapped = Object.values(COMMITTEE_MAP).flat();
  const others = deptBreakdown.filter(d => !mapped.includes(d.department));
  if (others.length) result['other'] = others;
  return result;
}

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—';

export default function ChairAnalyticsPage() {
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

  if (loading && !data) return <LoadingPage text="Loading analytics…"/>;

  const { monthly = [], pnl = [], deptBreakdown = [] } = data || {};
  const grouped = groupByCommittee(deptBreakdown);

  return (
    <div className="page-body">
      <div>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 3 }}>Department Analytics</h1>
        <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>Committee-wise revenue, expense &amp; profit analysis</p>
      </div>

      <FilterBar from={from} setFrom={setFrom} to={to} setTo={setTo} today={today}/>

      {/* Monthly overview chart */}
      <SectionCard title="Overall Revenue vs Expenses (Selected Period)">
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

      {/* P&L per department */}
      <SectionCard title="Sales − Expenses = Profit / Loss (per Department)" noPad>
        <table>
          <thead>
            <tr><th>Department</th><th>Revenue</th><th>Expenses</th><th>Profit / Loss</th></tr>
          </thead>
          <tbody>
            {pnl.length === 0
              ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-4)' }}>No data for selected period</td></tr>
              : pnl.sort((a, b) => b.profit - a.profit).slice(0, 8).map(d => (
                <tr key={d.department}>
                  <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{d.department}</td>
                  <td style={{ color: '#16a34a', fontWeight: 600 }}>{fmt.inr(d.sales)}</td>
                  <td style={{ color: '#dc2626', fontWeight: 600 }}>{fmt.inr(d.expenses)}</td>
                  <td style={{ fontWeight: 800, color: d.profit >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                    {d.profit >= 0 ? '+' : ''}{fmt.inr(d.profit)}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </SectionCard>

      {/* Committee-wise breakdown */}
      <SectionCard title="Department-wise Analytics (by Committee)" noPad>
        {Object.keys(grouped).length === 0
          ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-4)' }}>No data for selected period</div>
          : Object.entries(grouped).map(([committee, rows]) => {
            const color = COMMITTEE_COLORS[committee] || '#6b7280';
            return (
              <div key={committee}>
                <div style={{ padding: '8px 18px', background: color + '12', borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: '.875rem', color }}>
                    {COMMITTEE_LABELS[committee] || cap(committee)} Committee
                  </span>
                  <span style={{ fontSize: '.75rem', color: 'var(--text-4)' }}>
                    {fmt.inr(rows.reduce((s, r) => s + r.sales, 0))} rev · {fmt.inr(rows.reduce((s, r) => s + r.expenses, 0))} exp
                  </span>
                </div>
                <table>
                  <thead><tr><th>Department</th><th>Revenue</th><th>Expenses</th><th>Profit / Loss</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{r.department}</td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>{fmt.inr(r.sales)}</td>
                        <td style={{ color: '#dc2626', fontWeight: 600 }}>{fmt.inr(r.expenses)}</td>
                        <td style={{ fontWeight: 800, color: r.profit >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                          {r.profit >= 0 ? '+' : ''}{fmt.inr(r.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        }
      </SectionCard>
    </div>
  );
}
