import React, { useState, useEffect, useCallback } from 'react';
import { dashAPI } from '../../../api';
import { fmt, orderBadge, payBadge } from '../../../utils/helpers';
import { LoadingPage, ChartTip, SectionCard } from '../../ui';
import { TrendingUp, TrendingDown, ShoppingCart, Package, AlertTriangle, Activity, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const FinKpi = ({ label, value, color, icon: Icon, sub }) => (
  <div style={{ background: color + '08', border: `1.5px solid ${color}28`, borderTop: `4px solid ${color}`, borderRadius: 'var(--radius)', padding: '18px 20px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: '.68rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      {Icon && <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={15} style={{ color }}/></div>}
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    {sub && <div style={{ fontSize: '.72rem', color: 'var(--text-3)', fontWeight: 500, marginTop: 2 }}>{sub}</div>}
  </div>
);

const OpKpi = ({ label, value, color, icon: Icon, sub, alert }) => (
  <div style={{ background: alert ? color + '0a' : 'var(--white)', border: '1px solid ' + (alert ? color + '35' : 'var(--border)'), borderLeft: `4px solid ${color}`, borderRadius: 'var(--radius)', padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 13, boxShadow: alert ? `0 2px 10px ${color}18` : 'none' }}>
    {Icon && <div style={{ width: 38, height: 38, borderRadius: 9, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={17} style={{ color }}/></div>}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '.67rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: '1.7rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: 3, fontWeight: 500 }}>{sub}</div>}
    </div>
  </div>
);

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

export default function AGMDashboard() {
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);
  const today       = new Date().toISOString().split('T')[0];
  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(today);

  const load = useCallback(() => {
    setLoad(true);
    dashAPI.gm({ from, to }).then(r => setData(r.data)).finally(() => setLoad(false));
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <LoadingPage/>;
  const { monthly = [], pnl = [], storeSummary = {}, pendingReqs = 0, pendingPOs = 0, recentPOs = [] } = data || {};
  const rev = monthly.reduce((s, m) => s + m.sales, 0);
  const exp = monthly.reduce((s, m) => s + m.expenses, 0);
  const net = rev - exp;
  const lowStock = (storeSummary.low || 0) + (storeSummary.critical || 0);

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 2 }}>AGM Dashboard</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>Assistant General Manager — operational overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--sky-lt)', padding: '5px 14px', borderRadius: 20, border: '1.5px solid #bae6fd' }}>
          <Activity size={13} style={{ color: 'var(--sky)' }}/>
          <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--sky)' }}>AGM Access</span>
        </div>
      </div>

      <FilterBar from={from} setFrom={setFrom} to={to} setTo={setTo} today={today}/>

      {/* Financial KPIs — large, top-bordered */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <FinKpi label="Total Revenue" value={fmt.inr(rev)} color="#16a34a" icon={TrendingUp} sub="All departments combined"/>
        <FinKpi label="Total Expenses" value={fmt.inr(exp)} color="#d97706" icon={TrendingDown} sub="Cost of operations"/>
        <FinKpi
          label="Net Profit / Loss"
          value={fmt.inr(net)}
          color={net >= 0 ? '#16a34a' : '#dc2626'}
          icon={TrendingUp}
          sub={net >= 0 ? 'Profitable period' : 'Loss — review expenses'}
        />
      </div>

      {/* Operational KPIs — compact, left-bordered */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <OpKpi label="Pending Requests" value={pendingReqs} color="#e11d48" icon={ShoppingCart} sub="awaiting approval" alert={pendingReqs > 0}/>
        <OpKpi label="Active POs" value={pendingPOs} color="#6366f1" icon={Package} sub="purchase orders in progress"/>
        <OpKpi label="Low Stock Items" value={lowStock} color="#dc2626" icon={AlertTriangle} sub="items below threshold" alert={lowStock > 0}/>
      </div>

      {/* Chart + Dept P&L */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12 }}>
        <SectionCard title="Financial Trend — Revenue vs Expenses">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v / 1e5).toFixed(0) + 'L'}/>
              <Tooltip content={<ChartTip/>}/>
              <Legend wrapperStyle={{ fontSize: '.75rem' }}/>
              <Bar dataKey="sales"    name="Revenue"  fill="#16a34a" radius={[3,3,0,0]}/>
              <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[3,3,0,0]}/>
              <Bar dataKey="profit"   name="Profit"   fill="#6366f1" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Department P&L Breakdown">
          <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pnl.length === 0
              ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: '.8rem' }}>No data for selected period</div>
              : pnl.sort((a, b) => b.profit - a.profit).map(d => {
                const pct = d.sales > 0 ? Math.min(Math.abs(d.profit / d.sales * 100), 100) : 0;
                const c = d.profit >= 0 ? '#16a34a' : '#dc2626';
                return (
                  <div key={d.department}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: '.8rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-2)' }}>{d.department}</span>
                      <span style={{ fontSize: '.8rem', fontWeight: 800, color: c }}>{d.profit >= 0 ? '+' : ''}{fmt.inr(d.profit)}</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: pct + '%', background: c }}/></div>
                  </div>
                );
              })
            }
          </div>
        </SectionCard>
      </div>

      {/* Recent Purchase Orders */}
      <SectionCard title="Recent Purchase Orders" noPad>
        <table>
          <thead>
            <tr><th>PO #</th><th>Vendor</th><th>Department</th><th>Amount</th><th>Payment</th><th>Status</th><th>Created By</th></tr>
          </thead>
          <tbody>
            {recentPOs.length === 0
              ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--text-4)' }}>No recent purchase orders</td></tr>
              : recentPOs.slice(0, 6).map(po => {
                const ob = orderBadge(po.orderStatus), pb = payBadge(po.paymentStatus);
                return (
                  <tr key={po._id}>
                    <td className="font-mono" style={{ color: 'var(--indigo)', fontWeight: 700, fontSize: '.8rem' }}>{po.poNumber}</td>
                    <td style={{ fontWeight: 500, fontSize: '.8rem', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{po.vendor?.shopName || '—'}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: '.8rem' }}>{po.department}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-1)' }}>{fmt.inr(po.totalAmount)}</td>
                    <td><span className={'badge ' + pb.cls}>{pb.label}</span></td>
                    <td><span className={'badge ' + ob.cls}>{ob.label}</span></td>
                    <td className="text-sm text-3">{po.createdBy?.name || '—'}</td>
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
