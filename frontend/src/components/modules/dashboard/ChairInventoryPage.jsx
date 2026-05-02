import React, { useState, useEffect } from 'react';
import { dashAPI } from '../../../api';
import { fmt, stockBadge } from '../../../utils/helpers';
import { LoadingPage, SectionCard } from '../../ui';

export default function ChairInventoryPage() {
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    dashAPI.chairman({}).then(r => setData(r.data)).finally(() => setLoad(false));
  }, []);

  if (loading && !data) return <LoadingPage text="Loading inventory…"/>;

  const { storeSummary = {}, lowStockItems = [] } = data || {};

  return (
    <div className="page-body">
      <div>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 3 }}>Inventory & Available Material</h1>
        <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>Current stock levels across all departments</p>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          ['Total Items',       storeSummary.total        || 0,              'var(--text-1)',    '#f8fafc'],
          ['Adequate Stock',    storeSummary.adequate     || 0,              'var(--emerald)',   '#d1fae5'],
          ['Low Stock',         storeSummary.low          || 0,              'var(--amber)',     '#fef3c7'],
          ['Critical / Out',    (storeSummary.critical || 0) + (storeSummary.outOfStock || 0), 'var(--red)', '#fee2e2'],
          ['Expiring Soon',     storeSummary.expiringSoon || 0,              'var(--violet)',    '#ede9fe'],
          ['Total Stock Value', fmt.inr(storeSummary.totalValue || 0),       'var(--indigo)',    '#e0e7ff'],
        ].map(([label, value, color, bg]) => (
          <div key={label} style={{ padding: '16px', background: bg, border: `1.5px solid ${color}44`, borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: '.72rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontWeight: 800, color, fontSize: '1.35rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Low / critical items table */}
      <SectionCard title={`Low / Critical Stock Items (${lowStockItems.length})`} noPad>
        {lowStockItems.length === 0
          ? <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-4)', fontSize: '.875rem' }}>All items well stocked ✓</div>
          : <table>
            <thead>
              <tr>
                <th>Item</th><th>Category</th><th>Department</th>
                <th>Quantity</th><th>Threshold</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map(i => {
                const b = stockBadge(i.stockStatus);
                return (
                  <tr key={i._id}>
                    <td style={{ fontWeight: 600, fontSize: '.8125rem' }}>{i.name}</td>
                    <td className="text-sm text-3">{i.category || '—'}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: '.8125rem' }}>{i.department}</td>
                    <td style={{ fontWeight: 700, color: i.stockStatus === 'critical' ? 'var(--red)' : 'var(--amber)' }}>
                      {i.quantity} {i.unit}
                    </td>
                    <td className="text-sm text-3">{i.thresholdValue} {i.unit}</td>
                    <td><span className={'badge ' + b.cls}>{b.label}</span></td>
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
