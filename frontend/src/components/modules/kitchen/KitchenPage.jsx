// Kitchen.jsx
import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Plus, Trash2 } from 'lucide-react';
import { kitchenAPI } from '../../../api';
import { fmt, reqBadge, priBadge } from '../../../utils/helpers';
import { Modal, FG, PageHdr, Empty, Tabs } from '../../ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTip } from '../../ui';
import toast from 'react-hot-toast';

const UNITS = ['kg','g','litre','ml','pcs','box','can','bottle','packet'];

function KitchenRequestsTab() {
  const [reqs, setReqs]    = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal]  = useState(false);
  const [form, setForm]    = useState({ priority:'medium', notes:'', items:[{itemName:'',quantity:'',unit:'kg',category:'',estimatedPrice:''}] });

  const load = () => { setLoad(true); kitchenAPI.requests().then(r=>setReqs(r.data)).finally(()=>setLoad(false)); };
  useEffect(()=>{load();},[]);

  const addRow    = () => setForm(f=>({...f,items:[...f.items,{itemName:'',quantity:'',unit:'kg',category:'',estimatedPrice:''}]}));
  const removeRow = i  => setForm(f=>({...f,items:f.items.filter((_,x)=>x!==i)}));
  const setItem   = (i,k,v) => setForm(f=>({...f,items:f.items.map((it,x)=>x===i?{...it,[k]:v}:it)}));

  const save = async () => {
    if(!form.items[0].itemName) return toast.error('Add at least one item');
    try { await kitchenAPI.createRequest(form); toast.success('Request raised'); load(); setModal(false); setForm({priority:'medium',notes:'',items:[{itemName:'',quantity:'',unit:'kg',category:'',estimatedPrice:''}]}); }
    catch(e) { toast.error(e.response?.data?.message||'Failed'); }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div className="flex items-center justify-between">
        <span className="text-3 text-sm">{reqs.length} request(s)</span>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={13}/>Raise Request</button>
      </div>
      {loading ? <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading…</div> :
        reqs.length===0 ? <Empty icon={UtensilsCrossed} title="No requests yet" sub="Raise your first material request" /> :
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Req #</th><th>Items</th><th>Priority</th><th>Status</th><th>Raised By</th><th>Date</th></tr></thead>
              <tbody>
                {reqs.map(r=>{
                  const s=reqBadge(r.status),p=priBadge(r.priority);
                  return (
                    <tr key={r._id}>
                      <td className="font-mono" style={{fontSize:'.8rem',color:'var(--indigo)',fontWeight:700}}>{r.requestNumber}</td>
                      <td className="text-sm">{r.items?.length} items — {r.items?.slice(0,3).map(i=>i.itemName).join(', ')}{r.items?.length>3?'…':''}</td>
                      <td><span className={`badge ${p.cls}`}>{p.label}</span></td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td className="text-sm">{r.requestedBy?.name||'—'}</td>
                      <td className="text-sm text-3">{fmt.date(r.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="Raise Kitchen Request" size="modal-lg"
        footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Submit</button></>}
      >
        <FG label="Priority">
          <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
            {['low','medium','high','urgent'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
        </FG>
        <div>
          <div className="flex items-center justify-between" style={{marginBottom:8}}>
            <label style={{fontSize:'.8125rem',fontWeight:600,color:'var(--text-2)'}}>Items <span style={{color:'var(--red)'}}>*</span></label>
            <button className="btn btn-subtle btn-sm" onClick={addRow}><Plus size={12}/>Add</button>
          </div>
          {form.items.map((it,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 0.7fr 0.7fr 1fr 28px',gap:6,marginBottom:6}}>
              <input placeholder="Item name *" value={it.itemName} onChange={e=>setItem(i,'itemName',e.target.value)} />
              <input placeholder="Category" value={it.category} onChange={e=>setItem(i,'category',e.target.value)} />
              <input placeholder="Qty" type="number" value={it.quantity} onChange={e=>setItem(i,'quantity',e.target.value)} />
              <select value={it.unit} onChange={e=>setItem(i,'unit',e.target.value)}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select>
              <input placeholder="Est. ₹" type="number" value={it.estimatedPrice} onChange={e=>setItem(i,'estimatedPrice',e.target.value)} />
              <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>removeRow(i)} disabled={form.items.length===1}><Trash2 size={12} style={{color:'var(--red)'}}/></button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function UtilizationTab() {
  const [data, setData]    = useState(null);
  const [period, setPeriod] = useState('30');
  useEffect(()=>{ kitchenAPI.utilization({period}).then(r=>setData(r.data)).catch(()=>{}); },[period]);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div className="flex items-center justify-between">
        <h3>Goods Utilization</h3>
        <select value={period} onChange={e=>setPeriod(e.target.value)} style={{width:130}}>
          <option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 6 months</option>
        </select>
      </div>
      {data && (
        <>
          <div className="card">
            <h3 style={{marginBottom:12}}>Usage by Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="category" tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Value (₹)" fill="var(--indigo)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1.5px solid var(--border)'}}><h3>Top Items by Usage</h3></div>
            <table>
              <thead><tr><th>#</th><th>Item</th><th>Qty Used</th><th>Value</th></tr></thead>
              <tbody>
                {data.topItems.map((it,i)=>(
                  <tr key={i}>
                    <td className="text-3 text-sm">{i+1}</td>
                    <td style={{fontWeight:600}}>{it.name}</td>
                    <td>{it.quantity}</td>
                    <td style={{fontWeight:700,color:'var(--indigo)'}}>{fmt.inr(it.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function KitchenPage({ defaultTab }) {
  const [tab, setTab] = useState(defaultTab || 'requests');
  useEffect(() => { if (defaultTab) setTab(defaultTab); }, [defaultTab]);
  return (
    <div className="page">
      <PageHdr icon={UtensilsCrossed} title="Kitchen" color="var(--red)" />
      <div style={{padding:'0 24px',background:'var(--white)',borderBottom:'1.5px solid var(--border)'}}>
        <Tabs tabs={[{id:'requests',label:'Material Requests'},{id:'utilization',label:'Utilization'}]} active={tab} onChange={setTab} />
      </div>
      <div className="page-body">
        {tab==='requests'    && <KitchenRequestsTab />}
        {tab==='utilization' && <UtilizationTab />}
      </div>
    </div>
  );
}
