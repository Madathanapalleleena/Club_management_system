import React, { useState, useEffect, useCallback } from 'react';
import { dashAPI, procAPI } from '../../../api';
import { fmt, priBadge, reqBadge } from '../../../utils/helpers';
import { LoadingPage, SectionCard } from '../../ui';
import { Check, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChairProcurementPage() {
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);
  const [tab, setTab]      = useState('pending');

  const load = useCallback(() => {
    setLoad(true);
    dashAPI.chairman({}).then(r => setData(r.data)).finally(() => setLoad(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    try {
      await procAPI.updateRequest(id, { action });
      toast.success(action === 'approve' ? 'Request approved' : 'Request rejected');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Action failed'); }
  };

  if (loading && !data) return <LoadingPage text="Loading procurement requests…"/>;

  const { pendingRequests = [], approvedRequests = [], rejectedRequests = [] } = data || {};

  const TABS = [
    { id:'pending',  label:'Pending Approval', count:pendingRequests.length,  color:'var(--amber)' },
    { id:'approved', label:'Approved',          count:approvedRequests.length, color:'var(--emerald)' },
    { id:'rejected', label:'Rejected',          count:rejectedRequests.length, color:'var(--red)' },
  ];

  const rows = tab === 'pending' ? pendingRequests : tab === 'approved' ? approvedRequests : rejectedRequests;

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex items-center justify-between" style={{ flexWrap:'wrap', gap:8 }}>
        <div>
          <h1 style={{ fontSize:'1.2rem', marginBottom:2 }}>Procurement Requests</h1>
          <p style={{ color:'var(--text-3)', fontSize:'.8rem' }}>Review and approve material procurement requests</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading} style={{ display:'flex', alignItems:'center', gap:5 }}>
          <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }}/> Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:6, borderBottom:'2px solid var(--border)', paddingBottom:0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding:'8px 16px', border:'none', background:'transparent', cursor:'pointer',
              fontSize:'.8125rem', fontWeight:600,
              color: tab === t.id ? t.color : 'var(--text-3)',
              borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
              marginBottom: -2, display:'flex', alignItems:'center', gap:7, transition:'all var(--t)',
            }}
          >
            {t.label}
            <span style={{
              background: tab === t.id ? t.color : 'var(--bg-hover)',
              color: tab === t.id ? '#fff' : 'var(--text-3)',
              borderRadius:20, padding:'1px 7px', fontSize:'.7rem', fontWeight:700, lineHeight:1.6,
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      <SectionCard noPad>
        {rows.length === 0
          ? <div style={{ padding:32, textAlign:'center', color:'var(--text-4)', fontSize:'.875rem' }}>
              {tab === 'pending' ? 'No pending requests — all clear ✓' : tab === 'approved' ? 'No approved requests' : 'No rejected requests'}
            </div>
          : <table>
            <thead>
              <tr>
                <th>Req #</th>
                <th>Department</th>
                <th>Items</th>
                <th>Priority</th>
                <th>Raised By</th>
                <th>Date</th>
                {tab !== 'pending' && <th>{tab === 'approved' ? 'Approved By' : 'Processed By'}</th>}
                {tab === 'pending' && <th style={{ textAlign:'center' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const p = priBadge(r.priority);
                const s = reqBadge(r.status);
                return (
                  <tr key={r._id}>
                    <td className="font-mono" style={{ color:'var(--indigo)', fontWeight:700, fontSize:'.78rem' }}>{r.requestNumber}</td>
                    <td style={{ textTransform:'capitalize', fontWeight:500, fontSize:'.8rem' }}>{r.department}</td>
                    <td className="text-sm text-3">
                      {r.items?.length} item(s)
                      {r.items?.length > 0 && ` — ${r.items.slice(0,2).map(i=>i.itemName).join(', ')}${r.items.length>2?'…':''}`}
                    </td>
                    <td><span className={'badge '+p.cls}>{p.label}</span></td>
                    <td className="text-sm">{r.requestedBy?.name||'—'}</td>
                    <td className="text-sm text-3">{fmt.date(r.createdAt)}</td>
                    {tab !== 'pending' && (
                      <td className="text-sm" style={{ fontWeight:600, color:tab==='approved'?'var(--emerald)':'var(--red)' }}>
                        {r.approvedBy?.name||'—'}
                      </td>
                    )}
                    {tab === 'pending' && (
                      <td>
                        <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                          <button className="btn btn-ghost btn-xs" style={{ color:'var(--emerald)', border:'1px solid var(--emerald)' }} onClick={() => act(r._id, 'approve')}>
                            <Check size={11}/> Approve
                          </button>
                          <button className="btn btn-ghost btn-xs" style={{ color:'var(--red)', border:'1px solid var(--red)' }} onClick={() => act(r._id, 'reject')}>
                            <X size={11}/> Reject
                          </button>
                        </div>
                      </td>
                    )}
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
