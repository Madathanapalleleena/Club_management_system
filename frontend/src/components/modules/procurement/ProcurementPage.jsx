import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart, Plus, Eye, Check, X, Trash2, Search,
  FileText, Upload, Edit2, TrendingUp, Package, Users,
  MessageSquare, AlertTriangle, Clock, CheckCircle, RefreshCw
} from 'lucide-react';
import { procAPI, authAPI, storeAPI } from '../../../api';
import { fmt, reqBadge, priBadge, orderBadge, payBadge } from '../../../utils/helpers';
import { Modal, FG, PageHdr, Empty, Tabs, ChangeLog } from '../../ui';
import toast from 'react-hot-toast';

const DEPTS = ['kitchen','bar','restaurant','rooms','banquet','sports','store','maintenance','hr','accounts','management'];
const DEPTS_NO_STORE = DEPTS.filter(d => d !== 'store' && d !== 'restaurant');
const UNITS = ['kg','g','litre','ml','pcs','box','can','bottle','packet','roll','cylinder','bag','dozen','set','pair'];
const VENDOR_TYPES = ['wholesale','retailer','distributor'];
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
      {Icon && (
        <div style={{ width:40, height:40, borderRadius:10, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={18} style={{ color }} />
        </div>
      )}
      <div>
        <div style={{ fontSize:'1.5rem', fontWeight:800, color, lineHeight:1.1 }}>{value}</div>
        <div style={{ fontSize:'.75rem', color:'var(--text-3)', fontWeight:600 }}>{label}</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// SECTION 1 – REQUIREMENTS
// ────────────────────────────────────────────────────────────────────
function RequirementsTab({ user }) {
  const [reqs,     setReqs]   = useState([]);
  const [loading,  setLoad]   = useState(true);
  const [statusF,  setStatusF]= useState('');
  const [deptF,    setDeptF]  = useState('');
  const [search,   setSearch] = useState('');
  const [modal,    setModal]  = useState(false);
  const [detail,   setDetail] = useState(null);
  const [noteModal,setNM]     = useState(null);
  const [noteText, setNT]     = useState('');
  const [form, setForm] = useState({
    department:'kitchen', priority:'medium', notes:'',
    items:[{ itemName:'', quantity:'', unit:'kg', category:'', estimatedPrice:'', notes:'' }]
  });

  const isProc = ['procurement_manager','procurement_assistant','gm','agm','chairman','secretary'].includes(user?.role);

  const load = useCallback(() => {
    setLoad(true);
    procAPI.requests({ status:statusF||undefined, department:deptF||undefined })
      .then(r => setReqs(r.data)).finally(() => setLoad(false));
  }, [statusF, deptF]);
  useEffect(() => { load(); }, [load]);

  const addRow    = () => setForm(f => ({...f, items:[...f.items,{itemName:'',quantity:'',unit:'kg',category:'',estimatedPrice:'',notes:''}]}));
  const removeRow = i  => setForm(f => ({...f, items:f.items.filter((_,x)=>x!==i)}));
  const setItem   = (i,k,v) => setForm(f => ({...f, items:f.items.map((it,x)=>x===i?{...it,[k]:v}:it)}));
  const budget    = form.items.reduce((s,it)=>s+(parseFloat(it.quantity||0)*parseFloat(it.estimatedPrice||0)),0);

  const save = async () => {
    if (!form.items[0].itemName||!form.items[0].quantity) return toast.error('Add at least one item with quantity');
    try {
      await procAPI.createRequest({...form, budgetEstimate:budget});
      toast.success('Request raised');
      load(); setModal(false);
      setForm({department:'kitchen',priority:'medium',notes:'',items:[{itemName:'',quantity:'',unit:'kg',category:'',estimatedPrice:'',notes:''}]});
    } catch(e) { toast.error(e.response?.data?.message||'Failed'); }
  };

  const act = async (id,action,note='') => {
    try { await procAPI.updateRequest(id,{action,note}); toast.success('Done'); load(); if(detail?._id===id) setDetail(null); }
    catch(e) { toast.error(e.response?.data?.message||'Failed'); }
  };

  const addNote = async () => {
    if (!noteText.trim()) return toast.error('Enter a note');
    try { await procAPI.updateRequest(noteModal._id,{note:noteText}); toast.success('Note added'); load(); setNM(null); setNT(''); }
    catch(e) { toast.error('Failed'); }
  };

  const openDetail = async id => { const r = await procAPI.getRequest(id); setDetail(r.data); };

  const filtered = reqs.filter(r => !search ||
    r.requestNumber?.toLowerCase().includes(search.toLowerCase()) ||
    r.requestedBy?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.department?.toLowerCase().includes(search.toLowerCase()) ||
    r.items?.some(i=>i.itemName?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
        {[['Pending',reqs.filter(r=>r.status==='pending').length,'var(--amber)',Clock],
          ['Approved',reqs.filter(r=>r.status==='approved').length,'var(--emerald)',CheckCircle],
          ['PO Raised',reqs.filter(r=>r.status==='po_raised').length,'var(--indigo)',Package],
          ['Rejected',reqs.filter(r=>r.status==='rejected').length,'var(--red)',X],
        ].map(([l,v,c,I])=><StatCard key={l} label={l} value={v} color={c} icon={I}/>)}
      </div>

      <div className="flex items-center justify-between" style={{gap:8,flexWrap:'wrap'}}>
        <div className="filter-bar">
          <div className="search-wrap">
            <span className="search-icon"><Search size={13}/></span>
            <input style={{width:200}} placeholder="Search requests..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={{width:140}}>
            <option value="">All Status</option>
            {['pending','approved','rejected','po_raised','completed'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
          <select value={deptF} onChange={e=>setDeptF(e.target.value)} style={{width:130}}>
            <option value="">All Depts</option>
            {DEPTS_NO_STORE.map(d=><option key={d} value={d}>{cap(d)}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading…</div> :
        filtered.length===0 ? <Empty icon={ShoppingCart} title="No requests" sub="Raise a procurement request to get started"/> :
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Req #</th><th>Department</th><th>Budget Estimate</th><th>Items</th>
                <th>Priority</th><th>Status</th><th>Raised By</th><th>Approved By</th><th>Date</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(r=>{
                  const s=reqBadge(r.status),p=priBadge(r.priority);
                  return (
                    <tr key={r._id}>
                      <td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{r.requestNumber}</td>
                      <td style={{textTransform:'capitalize',fontWeight:500}}>{r.department}</td>
                      <td style={{fontWeight:700,color:'var(--indigo)'}}>{r.budgetEstimate>0?fmt.inr(r.budgetEstimate):'—'}</td>
                      <td>
                        <div className="text-sm text-3">{r.items.length} item(s)</div>
                        <div style={{fontSize:'.72rem',color:'var(--text-4)'}}>
                          {r.items.slice(0,2).map(i=>`${i.quantity}${i.unit} ${i.itemName}`).join(', ')}{r.items.length>2?'…':''}
                        </div>
                      </td>
                      <td><span className={'badge '+p.cls}>{p.label}</span></td>
                      <td><span className={'badge '+s.cls}>{s.label}</span></td>
                      <td>
                        <div style={{fontSize:'.8125rem',fontWeight:500}}>{r.requestedBy?.name||'—'}</div>
                        <div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{cap((r.requestedBy?.role||'').replace(/_/g,' '))}</div>
                      </td>
                      <td>
                        {r.approvedBy
                          ? <div><div style={{fontSize:'.8125rem',fontWeight:600,color:'var(--emerald)'}}>{r.approvedBy.name}</div><div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{fmt.date(r.approvedAt)}</div></div>
                          : r.rejectedBy
                          ? <div><div style={{fontSize:'.8125rem',fontWeight:600,color:'var(--red)'}}>{r.rejectedBy.name}</div><div style={{fontSize:'.72rem',color:'var(--text-4)'}}>Rejected</div></div>
                          : '—'}
                      </td>
                      <td className="text-sm text-3">{fmt.date(r.createdAt)}</td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>openDetail(r._id)} title="View"><Eye size={13}/></button>
                          <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>{setNM(r);setNT('');}} title="Add Note"><MessageSquare size={13}/></button>
                          {r.status==='pending'&&isProc&&<>
                            <button className="btn btn-icon btn-ghost btn-sm" style={{color:'var(--emerald)'}} onClick={()=>act(r._id,'approve')} title="Approve"><Check size={13}/></button>
                            <button className="btn btn-icon btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={()=>act(r._id,'reject')} title="Reject"><X size={13}/></button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      }

      {/* Add Note Modal */}
      {noteModal&&(
        <Modal open onClose={()=>setNM(null)} title={`Add Note — ${noteModal.requestNumber}`}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setNM(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={addNote}>Add Note</button></>}>
          <div style={{fontSize:'.8125rem',color:'var(--text-3)',marginBottom:8}}>Logged in change history with your name and timestamp.</div>
          <FG label="Note / Change Reason" required>
            <textarea value={noteText} onChange={e=>setNT(e.target.value)} style={{minHeight:80}} placeholder="e.g. Qty revised from 50kg to 100kg due to increased demand…"/>
          </FG>
        </Modal>
      )}

      {/* Detail Modal */}
      {detail&&(
        <Modal open size="modal-xl" onClose={()=>setDetail(null)} title={'Request: '+detail.requestNumber}
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={()=>setDetail(null)}>Close</button>
            {detail.status==='pending'&&isProc&&<>
              <button className="btn btn-success btn-sm" onClick={()=>{act(detail._id,'approve');setDetail(null);}}>Approve</button>
              <button className="btn btn-danger btn-sm" onClick={()=>{act(detail._id,'reject');setDetail(null);}}>Reject</button>
            </>}
          </>}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
            {[['Department',cap(detail.department),'var(--indigo)'],['Priority',priBadge(detail.priority)?.label,'var(--amber)'],
              ['Status',reqBadge(detail.status)?.label,'var(--sky)'],['Budget Estimate',detail.budgetEstimate>0?fmt.inr(detail.budgetEstimate):'—','var(--emerald)']
            ].map(([k,v,c])=>(
              <div key={k} style={{padding:'10px 12px',background:'var(--bg-subtle)',borderRadius:'var(--radius)'}}>
                <div style={{fontSize:'.72rem',color:'var(--text-4)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>{k}</div>
                <div style={{fontWeight:700,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{padding:'10px 14px',background:'var(--bg-subtle)',borderRadius:'var(--radius)',fontSize:'.8125rem',marginBottom:10}}>
            <strong>Raised by:</strong> {detail.requestedBy?.name} ({cap((detail.requestedBy?.role||'').replace(/_/g,' '))})
            {detail.approvedBy&&<> | <strong style={{color:'var(--emerald)'}}>Approved by:</strong> {detail.approvedBy?.name} on {fmt.date(detail.approvedAt)}</>}
            {detail.rejectedBy&&<> | <strong style={{color:'var(--red)'}}>Rejected by:</strong> {detail.rejectedBy?.name}</>}
          </div>
          {detail.notes&&<div style={{padding:'8px 12px',background:'var(--amber-lt)',borderRadius:'var(--radius)',fontSize:'.8125rem',marginBottom:10,borderLeft:'3px solid var(--amber)'}}><strong>Notes:</strong> {detail.notes}</div>}
          <div className="card" style={{padding:0,overflow:'hidden',marginBottom:12}}>
            <div style={{padding:'10px 14px',borderBottom:'1.5px solid var(--border)',fontWeight:600,fontSize:'.875rem'}}>Items Requested</div>
            <table>
              <thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Unit</th><th>Est. Price</th><th>Total</th><th>Item Notes</th></tr></thead>
              <tbody>
                {detail.items?.map((it,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:600}}>{it.itemName}</td>
                    <td className="text-3 text-sm">{it.category||'—'}</td>
                    <td><strong>{it.quantity}</strong></td>
                    <td>{it.unit}</td>
                    <td>{it.estimatedPrice?fmt.inr(it.estimatedPrice):'—'}</td>
                    <td style={{fontWeight:700,color:'var(--indigo)'}}>{it.estimatedPrice&&it.quantity?fmt.inr(parseFloat(it.quantity)*parseFloat(it.estimatedPrice)):'—'}</td>
                    <td className="text-3 text-sm">{it.notes||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ChangeLog log={detail.changeLog||[]}/>
        </Modal>
      )}

      {/* Create Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="New Procurement Request" size="modal-xl"
        footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Submit Request</button></>}>
        <div className="form-row cols-2">
          <FG label="Department" required>
            <select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>
              {DEPTS_NO_STORE.map(d=><option key={d} value={d}>{cap(d)}</option>)}
            </select>
          </FG>
          <FG label="Priority">
            <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
              {['low','medium','high','urgent'].map(p=><option key={p} value={p}>{cap(p)}</option>)}
            </select>
          </FG>
        </div>
        <div>
          <div className="flex items-center justify-between" style={{marginBottom:8}}>
            <label style={{fontSize:'.8125rem',fontWeight:700,color:'var(--text-2)'}}>Items <span style={{color:'var(--red)'}}>*</span></label>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:'.8125rem',fontWeight:700,color:'var(--indigo)'}}>Est. Budget: {fmt.inr(budget)}</span>
              <button className="btn btn-subtle btn-sm" onClick={addRow}><Plus size={12}/>Add Row</button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 0.7fr 0.8fr 1fr 2fr 28px',gap:6,marginBottom:4}}>
            {['Item Name *','Category','Qty *','Unit','Est. Price/unit','Notes on Item',''].map(h=>(
              <div key={h} style={{fontSize:'.72rem',fontWeight:700,color:'var(--text-4)',textTransform:'uppercase',letterSpacing:'.04em'}}>{h}</div>
            ))}
          </div>
          {form.items.map((it,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 0.7fr 0.8fr 1fr 2fr 28px',gap:6,marginBottom:6,alignItems:'center'}}>
              <input placeholder="e.g. Maida (Wheat Flour)" value={it.itemName} onChange={e=>setItem(i,'itemName',e.target.value)}/>
              <input placeholder="Category" value={it.category} onChange={e=>setItem(i,'category',e.target.value)}/>
              <input placeholder="Qty" type="number" value={it.quantity} onChange={e=>setItem(i,'quantity',e.target.value)}/>
              <select value={it.unit} onChange={e=>setItem(i,'unit',e.target.value)}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select>
              <input placeholder="₹ per unit" type="number" value={it.estimatedPrice} onChange={e=>setItem(i,'estimatedPrice',e.target.value)}/>
              <input placeholder="Notes…" value={it.notes} onChange={e=>setItem(i,'notes',e.target.value)}/>
              <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>removeRow(i)} disabled={form.items.length===1}><Trash2 size={12} style={{color:'var(--red)'}}/></button>
            </div>
          ))}
        </div>
        <FG label="Overall Notes / Justification">
          <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{minHeight:55}} placeholder="e.g. Required urgently for upcoming event…"/>
        </FG>
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// SECTION 2 – VENDORS  (sub-tabs: Add Vendor | List of Vendors | Vendor Relations)
// ────────────────────────────────────────────────────────────────────
function VendorsTab() {
  const [subTab,    setSubTab]   = useState('list'); // 'add' | 'list' | 'relations'
  const [vendors,   setVendors]  = useState([]);
  const [templates, setTemplates]= useState([]);
  const [loading,   setLoad]     = useState(true);
  const [search,    setSearch]   = useState('');
  const [typeF,     setTypeF]    = useState('');

  // Add / Edit form
  const [editing,     setEditing]   = useState(null);
  const [form,        setForm]      = useState({ name:'', shopName:'', address:'', mobile:'', email:'', gstNumber:'', vendorType:'wholesale', category:'' });
  const [productRows, setPRows]     = useState([{ name:'', unit:'kg', category:'' }]);
  const [agrInline,   setAgrInline] = useState({ templateId:'', content:'', notes:'', include:false });
  const [saving,      setSaving]    = useState(false);

  // Agreement (for existing vendors from list)
  const [agrModal,      setAgrModal]  = useState(null);
  const [agrForm,       setAgrForm]   = useState({ templateId:'', content:'', notes:'' });
  const [filledContent, setFilled]    = useState('');

  // Relations
  const [selVendorId, setSelVId]  = useState('');
  const [period,      setPeriod]  = useState('30');
  const [analytics,   setAnalData]= useState(null);
  const [loadingAnal, setLoadAnal]= useState(false);

  const load = useCallback(() => {
    setLoad(true);
    Promise.all([procAPI.vendors(), procAPI.templates()])
      .then(([v,t])=>{ setVendors(v.data); setTemplates(t.data); })
      .finally(()=>setLoad(false));
  }, []);
  useEffect(()=>{ load(); },[load]);

  // ── Add / Edit vendor ────────────────────────────────────────────
  const startAdd = () => {
    setEditing(null);
    setForm({name:'',shopName:'',address:'',mobile:'',email:'',gstNumber:'',vendorType:'wholesale',category:''});
    setPRows([{ name:'', unit:'kg', category:'' }]);
    setAgrInline({ templateId:'', content:'', notes:'', include:false });
    setSubTab('add');
  };
  const startEdit = v => {
    setEditing(v);
    setForm({name:v.name||'',shopName:v.shopName||'',address:v.address||'',mobile:v.mobile||'',email:v.email||'',gstNumber:v.gstNumber||'',vendorType:v.vendorType||'wholesale',category:v.category||''});
    setPRows((v.products||[]).length>0 ? v.products.map(p=>({name:p,unit:'kg',category:''})) : [{name:'',unit:'kg',category:''}]);
    setAgrInline({ templateId:'', content:'', notes:'', include:false });
    setSubTab('add');
  };

  const addPRow    = () => setPRows(r=>[...r,{name:'',unit:'kg',category:''}]);
  const removePRow = i  => setPRows(r=>r.filter((_,x)=>x!==i));
  const setPRow    = (i,k,v) => setPRows(r=>r.map((p,x)=>x===i?{...p,[k]:v}:p));

  const loadAgrTemplate = async tplId => {
    setAgrInline(f=>({...f,templateId:tplId}));
    if (!tplId) return;
    try {
      // fill placeholders with current form values
      const r = await procAPI.fillTemplate({ templateId:tplId, vendor:{
        name:form.name, shopName:form.shopName, vendorType:form.vendorType,
        address:form.address, gstNumber:form.gstNumber,
        products:productRows.map(p=>p.name).filter(Boolean)
      }});
      setAgrInline(f=>({...f,content:r.data.filled}));
    } catch { setAgrInline(f=>({...f,content:''})); }
  };

  const save = async () => {
    if (!form.name||!form.shopName||!form.address||!form.vendorType||!form.category) return toast.error('Fill all required fields');
    setSaving(true);
    try {
      const products = productRows.map(p=>p.name).filter(Boolean);
      const data = {...form, products};
      let vendor;
      if (editing) { await procAPI.updateVendor(editing._id, data); vendor = editing; }
      else { const r = await procAPI.createVendor(data); vendor = r.data; }
      // Save inline agreement if opted in
      if (agrInline.include && agrInline.content.trim()) {
        const fd = new FormData();
        fd.append('content', agrInline.content);
        fd.append('notes', agrInline.notes || 'Initial agreement');
        if (agrInline.templateId) fd.append('templateId', agrInline.templateId);
        await procAPI.addAgreement(vendor._id || editing._id, fd);
      }
      toast.success(editing?'Vendor updated':'Vendor added');
      load(); setSubTab('list'); setEditing(null);
    } catch(e) { toast.error(e.response?.data?.message||'Failed'); }
    finally { setSaving(false); }
  };

  // ── Agreement ────────────────────────────────────────────────────
  const openAgreement = v => { setAgrModal(v); setAgrForm({templateId:'',content:'',notes:''}); setFilled(''); };
  const loadTemplate  = async tplId => {
    if (!tplId) return;
    setAgrForm(f=>({...f,templateId:tplId}));
    if (agrModal) {
      try {
        const r = await procAPI.fillTemplate({templateId:tplId, vendorId:agrModal._id});
        setFilled(r.data.filled);
        setAgrForm(f=>({...f,content:r.data.filled}));
      } catch(e) { toast.error('Failed to fill template'); }
    }
  };
  const saveAgreement = async () => {
    if (!agrModal) return;
    const fd = new FormData();
    fd.append('content', agrForm.content||filledContent);
    fd.append('notes', agrForm.notes);
    if (agrForm.templateId) fd.append('templateId', agrForm.templateId);
    try {
      await procAPI.addAgreement(agrModal._id, fd);
      toast.success('Agreement saved (v'+(agrModal.currentAgreementVersion+1)+')');
      load(); setAgrModal(null);
    } catch(e) { toast.error(e.response?.data?.message||'Failed'); }
  };

  // ── Vendor Relations ─────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (vid, per) => {
    if (!vid) return;
    setLoadAnal(true); setAnalData(null);
    try {
      const r = await procAPI.vendorAnalytics(vid, {period:per});
      setAnalData(r.data);
    } catch(e) { toast.error('Failed to load analytics'); }
    finally { setLoadAnal(false); }
  }, []);

  const handleVendorSelect = vid => { setSelVId(vid); setAnalData(null); if (vid) fetchAnalytics(vid, period); };
  const handlePeriodChange = per => { setPeriod(per); if (selVendorId) fetchAnalytics(selVendorId, per); };

  const vtColor = { wholesale:'var(--sky)', retailer:'var(--emerald)', distributor:'var(--violet)' };

  const filtered = vendors.filter(v=>{
    const mt = !typeF || v.vendorType===typeF;
    const ms = !search || v.shopName?.toLowerCase().includes(search.toLowerCase()) || v.name?.toLowerCase().includes(search.toLowerCase()) || v.category?.toLowerCase().includes(search.toLowerCase());
    return mt && ms;
  });

  const selVendor = vendors.find(v=>v._id===selVendorId);

  const subTabs = [
    {id:'add',      label: editing ? 'Edit Vendor' : 'Add Vendor'},
    {id:'list',     label: `List of Vendors (${vendors.length})`},
    {id:'relations',label: 'Vendor Relations'},
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* Sub-tab bar */}
      <div style={{display:'flex',gap:4,borderBottom:'1.5px solid var(--border)',paddingBottom:0}}>
        {subTabs.map(t=>(
          <button key={t.id} onClick={()=>{ if(t.id!=='add'||!editing) startAdd(); setSubTab(t.id); }}
            style={{padding:'8px 18px',fontSize:'.875rem',fontWeight:subTab===t.id?700:500,
              color:subTab===t.id?'var(--indigo)':'var(--text-3)',background:'transparent',border:'none',
              borderBottom:subTab===t.id?'2.5px solid var(--indigo)':'2.5px solid transparent',
              cursor:'pointer',marginBottom:-1.5,transition:'all .15s'}}>
            {t.label}
          </button>
        ))}
        <div style={{flex:1}}/>
        {subTab==='list'&&<button className="btn btn-primary btn-sm" style={{marginBottom:4}} onClick={startAdd}><Plus size={13}/>Add Vendor</button>}
      </div>

      {/* ─ SUB-TAB: ADD / EDIT VENDOR ─────────────────────────────── */}
      {subTab==='add'&&(
        <div style={{display:'flex',flexDirection:'column',gap:14,maxWidth:760}}>

          {/* Basic Details */}
          <div className="card">
            <div style={{fontWeight:700,fontSize:'.875rem',marginBottom:12,color:'var(--text-2)',paddingBottom:8,borderBottom:'1.5px solid var(--border)'}}>{editing?'Edit Vendor':'Add New Vendor'}</div>
            <div className="form-row cols-2">
              <FG label="Vendor Name (Owner / Proprietor)" required>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Krishnamurthy Raj"/>
              </FG>
              <FG label="Shop / Firm Name" required>
                <input value={form.shopName} onChange={e=>setForm({...form,shopName:e.target.value})} placeholder="e.g. Sri Balaji Vegetables"/>
              </FG>
            </div>
            <FG label="Vendor Address" required>
              <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Full shop / business address"/>
            </FG>
            <div className="form-row cols-2">
              <FG label="Mobile"><input type="tel" maxLength={10} pattern="\d{10}" onKeyPress={e=>!/[0-9]/.test(e.key)&&e.preventDefault()} value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} placeholder="10-digit mobile"/></FG>
              <FG label="Email"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email"/></FG>
            </div>
            <div className="form-row cols-3">
              <FG label="Vendor Type" required>
                <select value={form.vendorType} onChange={e=>setForm({...form,vendorType:e.target.value})}>
                  <option value="wholesale">Wholesale</option>
                  <option value="retailer">Retailer</option>
                  <option value="distributor">Distributor</option>
                </select>
              </FG>
              <FG label="Category" required hint="Type freely e.g. Vegetables, Dairy">
                <input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="e.g. Vegetables & Fruits"/>
              </FG>
              <FG label="GST Number" hint="Not mandatory">
                <input value={form.gstNumber} onChange={e=>setForm({...form,gstNumber:e.target.value})} placeholder="e.g. 36ABCDE1234F1Z5"/>
              </FG>
            </div>
          </div>

          {/* Products / Items this vendor supplies */}
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div>
                <div style={{fontWeight:700,fontSize:'.875rem',color:'var(--text-2)'}}>Products / Items Supplied</div>
                <div style={{fontSize:'.75rem',color:'var(--text-4)'}}>List all products/items this vendor provides. Used in requests & agreement templates.</div>
              </div>
              <button className="btn btn-subtle btn-sm" onClick={addPRow}><Plus size={12}/>Add Item</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 0.7fr 1fr 28px',gap:6,marginBottom:4}}>
              {['Item / Product Name','Unit','Category',''].map(h=><div key={h} style={{fontSize:'.72rem',fontWeight:700,color:'var(--text-4)',textTransform:'uppercase',letterSpacing:'.04em'}}>{h}</div>)}
            </div>
            {productRows.map((p,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 0.7fr 1fr 28px',gap:6,marginBottom:6,alignItems:'center'}}>
                <input placeholder="e.g. Tomatoes, Maida, Chicken…" value={p.name} onChange={e=>setPRow(i,'name',e.target.value)}/>
                <select value={p.unit} onChange={e=>setPRow(i,'unit',e.target.value)}>
                  {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
                <input placeholder="Category" value={p.category} onChange={e=>setPRow(i,'category',e.target.value)}/>
                <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>removePRow(i)} disabled={productRows.length===1}><Trash2 size={12} style={{color:'var(--red)'}}/></button>
              </div>
            ))}
          </div>

          {/* Vendor Agreement / Terms & Conditions */}
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div>
                <div style={{fontWeight:700,fontSize:'.875rem',color:'var(--text-2)'}}>Vendor Agreement (Terms & Conditions)</div>
                <div style={{fontSize:'.75rem',color:'var(--text-4)'}}>Optionally add T&C agreement when creating vendor — or add later from the List.</div>
              </div>
              <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'.8125rem',fontWeight:600}}>
                <input type="checkbox" checked={agrInline.include} onChange={e=>setAgrInline(f=>({...f,include:e.target.checked}))}/>
                Include Agreement
              </label>
            </div>
            {agrInline.include&&(
              <>
                <FG label="Select Template (auto-fills T&C content)">
                  <select value={agrInline.templateId} onChange={e=>loadAgrTemplate(e.target.value)}>
                    <option value="">Select a template…</option>
                    {templates.map(t=><option key={t._id} value={t._id}>{t.name} ({t.vendorType})</option>)}
                  </select>
                </FG>
                {agrInline.templateId&&<div style={{padding:'7px 12px',background:'var(--emerald-lt)',borderRadius:'var(--radius)',fontSize:'.8125rem',color:'var(--emerald)',marginBottom:8}}>✓ Template auto-filled with vendor details. Edit below as needed.</div>}
                <FG label="Agreement / T&C Content" required>
                  <textarea value={agrInline.content} onChange={e=>setAgrInline(f=>({...f,content:e.target.value}))}
                    style={{minHeight:220,fontFamily:'var(--mono)',fontSize:'.8125rem',lineHeight:1.6}}
                    placeholder="Enter or paste agreement / terms and conditions here…

Available placeholders:
{{VENDOR_NAME}}, {{SHOP_NAME}}, {{VENDOR_TYPE}}, {{PRODUCTS}}, {{DATE}}, {{VENDOR_ADDRESS}}, {{VENDOR_GST}}"/>
                </FG>
                <FG label="Agreement Notes">
                  <input value={agrInline.notes} onChange={e=>setAgrInline(f=>({...f,notes:e.target.value}))} placeholder="e.g. Initial agreement on onboarding"/>
                </FG>
              </>
            )}
          </div>

          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setSubTab('list');setEditing(null);}}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving?'Saving…':(editing?'Update Vendor':'Add Vendor')}</button>
          </div>
        </div>
      )}

      {/* ─ SUB-TAB: LIST OF VENDORS ───────────────────────────────── */}
      {subTab==='list'&&(
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:10}}>
            {[['Total',vendors.length,'var(--text-1)',Users],
              ['Wholesale',vendors.filter(v=>v.vendorType==='wholesale').length,'var(--sky)',Package],
              ['Retailers',vendors.filter(v=>v.vendorType==='retailer').length,'var(--emerald)',Package],
              ['Distributors',vendors.filter(v=>v.vendorType==='distributor').length,'var(--violet)',Package],
              ['With Agreements',vendors.filter(v=>v.currentAgreementVersion>0).length,'var(--amber)',FileText],
            ].map(([l,v,c,I])=><StatCard key={l} label={l} value={v} color={c} icon={I}/>)}
          </div>

          <div className="filter-bar">
            <div className="search-wrap">
              <span className="search-icon"><Search size={13}/></span>
              <input style={{width:200}} placeholder="Search vendors…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{width:140}}>
              <option value="">All Types</option>
              {VENDOR_TYPES.map(t=><option key={t} value={t}>{cap(t)}</option>)}
            </select>
          </div>

          {loading ? <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading…</div> :
            filtered.length===0 ? <Empty icon={Users} title="No vendors found" sub="Add your first vendor"/> :
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Shop Name</th><th>Owner</th><th>Type</th><th>Category</th>
                    <th>Products</th><th>GST</th><th>Mobile</th><th>Agreement</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(v=>(
                      <tr key={v._id}>
                        <td>
                          <div style={{fontWeight:700}}>{v.shopName}</div>
                          <div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{v.address?.slice(0,35)}{v.address?.length>35?'…':''}</div>
                        </td>
                        <td className="text-sm">{v.name}</td>
                        <td>
                          <span style={{background:vtColor[v.vendorType]+'18',color:vtColor[v.vendorType],borderRadius:20,padding:'2px 9px',fontSize:'.75rem',fontWeight:700}}>
                            {cap(v.vendorType)}
                          </span>
                        </td>
                        <td className="text-sm text-3">{v.category}</td>
                        <td style={{maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'.8rem',color:'var(--text-3)'}}>{(v.products||[]).join(', ')||'—'}</td>
                        <td className="font-mono text-3" style={{fontSize:'.75rem'}}>{v.gstNumber||'—'}</td>
                        <td className="text-sm">{v.mobile||'—'}</td>
                        <td>{v.currentAgreementVersion>0?<span className="badge badge-green">v{v.currentAgreementVersion} Active</span>:<span className="badge badge-muted">None</span>}</td>
                        <td>
                          <div style={{display:'flex',gap:4}}>
                            <button className="btn btn-ghost btn-xs" onClick={()=>{setSelVId(v._id);setSubTab('relations');fetchAnalytics(v._id,period);}}>Relations</button>
                            <button className="btn btn-ghost btn-xs" onClick={()=>openAgreement(v)}>Agreement</button>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>startEdit(v)} title="Edit"><Edit2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          }
        </>
      )}

      {/* ─ SUB-TAB: VENDOR RELATIONS ──────────────────────────────── */}
      {subTab==='relations'&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Vendor Selector */}
          <div className="card" style={{padding:'16px 20px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'flex-end'}}>
              <FG label="Select Vendor">
                <select value={selVendorId} onChange={e=>handleVendorSelect(e.target.value)} style={{fontSize:'1rem',fontWeight:600}}>
                  <option value="">— Select a vendor to view relations —</option>
                  {vendors.map(v=><option key={v._id} value={v._id}>{v.shopName} ({cap(v.vendorType)}) — {v.category}</option>)}
                </select>
              </FG>
              <div style={{display:'flex',gap:6,paddingBottom:2}}>
                {[['30','30 Days'],['90','90 Days'],['365','1 Year']].map(([v,l])=>(
                  <button key={v} className="btn btn-sm" onClick={()=>handlePeriodChange(v)}
                    style={{background:period===v?'var(--indigo)':'transparent',color:period===v?'#fff':'var(--indigo)',border:'1.5px solid var(--indigo)',minWidth:70}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {selVendor&&(
              <div style={{marginTop:10,padding:'8px 12px',background:'var(--bg-subtle)',borderRadius:'var(--radius)',fontSize:'.8125rem',display:'flex',gap:16,flexWrap:'wrap'}}>
                <span><strong>Shop:</strong> {selVendor.shopName}</span>
                <span><strong>Owner:</strong> {selVendor.name}</span>
                <span><strong>Type:</strong> {cap(selVendor.vendorType)}</span>
                <span><strong>Category:</strong> {selVendor.category}</span>
                {selVendor.mobile&&<span><strong>Mobile:</strong> {selVendor.mobile}</span>}
                {selVendor.gstNumber&&<span><strong>GST:</strong> {selVendor.gstNumber}</span>}
              </div>
            )}
          </div>

          {!selVendorId&&<Empty icon={TrendingUp} title="Select a vendor" sub="Choose a vendor above to view their order relations and payment history"/>}

          {selVendorId&&loadingAnal&&<div style={{padding:40,textAlign:'center',color:'var(--text-4)'}}>Loading analytics…</div>}

          {selVendorId&&!loadingAnal&&analytics&&(
            <>
              {/* Summary cards */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:10}}>
                {[
                  ['Orders / POs',   analytics.totalOrders,          'var(--indigo)',   Package],
                  ['Total Value',    fmt.inr(analytics.totalValue),  'var(--emerald)',  TrendingUp],
                  ['Returns/Misses', analytics.returns,              'var(--red)',      AlertTriangle],
                  ['Paid POs',       analytics.paid,                 'var(--emerald)',  CheckCircle],
                  ['Pending Pay',    analytics.pending,              'var(--amber)',    Clock],
                  ['Delivered',      analytics.delivered,            'var(--sky)',      CheckCircle],
                ].map(([l,v,c,I])=><StatCard key={l} label={l} value={v} color={c} icon={I}/>)}
              </div>

              {/* PO Table */}
              <div className="card" style={{padding:0,overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1.5px solid var(--border)',fontWeight:600,fontSize:'.875rem'}}>
                  Purchase Orders — {period==='365'?'Last 1 Year':period==='90'?'Last 90 Days':'Last 30 Days'}
                </div>
                {analytics.orders?.length===0
                  ? <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>No orders in this period</div>
                  : <div className="table-wrap">
                      <table>
                        <thead><tr>
                          <th>PO Number</th><th>Department</th><th>Items</th><th>Total Amount</th>
                          <th>Payment Status</th><th>Order Status</th><th>Expected Delivery</th><th>Created By</th>
                        </tr></thead>
                        <tbody>
                          {analytics.orders.map(po=>{
                            const pb=payBadge(po.paymentStatus), ob=orderBadge(po.orderStatus);
                            return (
                              <tr key={po._id}>
                                <td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{po.poNumber}</td>
                                <td style={{textTransform:'capitalize',fontSize:'.8125rem'}}>{po.department}</td>
                                <td className="text-sm text-3">{po.items?.length} item(s)</td>
                                <td>
                                  <div style={{fontWeight:700}}>{fmt.inr(po.totalAmount)}</div>
                                  {po.advanceAmount>0&&<div style={{fontSize:'.7rem',color:'var(--emerald)'}}>Adv: {fmt.inr(po.advanceAmount)}</div>}
                                  {po.balanceAmount>0&&<div style={{fontSize:'.7rem',color:'var(--red)'}}>Bal: {fmt.inr(po.balanceAmount)}</div>}
                                </td>
                                <td><span className={'badge '+pb.cls}>{pb.label}</span></td>
                                <td><span className={'badge '+ob.cls}>{ob.label}</span></td>
                                <td className="text-sm">{po.expectedDelivery?fmt.date(po.expectedDelivery):'—'}</td>
                                <td className="text-sm">{po.createdBy?.name||'—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                }
              </div>
            </>
          )}
        </div>
      )}

      {/* Agreement Modal */}
      {agrModal&&(
        <Modal open size="modal-xl" onClose={()=>setAgrModal(null)}
          title={'Vendor Agreement — '+agrModal.shopName+' (v'+(agrModal.currentAgreementVersion+1)+')'}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setAgrModal(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={saveAgreement}>Save Agreement</button></>}>
          {agrModal.agreementVersions?.length>0&&(
            <div style={{padding:'8px 12px',background:'var(--bg-subtle)',borderRadius:'var(--radius)',fontSize:'.8125rem',marginBottom:10}}>
              <strong>Version History:</strong>&nbsp;
              {agrModal.agreementVersions.map(v=>(
                <span key={v.version} style={{marginLeft:8,background:'var(--indigo-lt)',color:'var(--indigo)',padding:'1px 8px',borderRadius:20,fontSize:'.75rem',fontWeight:700}}>
                  v{v.version} — {v.createdBy?.name} ({fmt.date(v.createdAt)})
                </span>
              ))}
            </div>
          )}
          <FG label="Select Template (auto-fills content with vendor details)">
            <select value={agrForm.templateId} onChange={e=>loadTemplate(e.target.value)}>
              <option value="">Select a template…</option>
              {templates.map(t=><option key={t._id} value={t._id}>{t.name} ({t.vendorType})</option>)}
            </select>
          </FG>
          {agrForm.templateId&&<div style={{padding:'8px 12px',background:'var(--emerald-lt)',borderRadius:'var(--radius)',fontSize:'.8125rem',color:'var(--emerald)',marginBottom:8}}>✓ Template auto-filled. Edit the content below as needed.</div>}
          <FG label="Agreement Content (editable)" required>
            <textarea value={agrForm.content||filledContent} onChange={e=>setAgrForm(f=>({...f,content:e.target.value}))}
              style={{minHeight:300,fontFamily:'var(--mono)',fontSize:'.8125rem',lineHeight:1.6}}
              placeholder="Enter agreement content here…&#10;&#10;Placeholders: {{VENDOR_NAME}}, {{SHOP_NAME}}, {{VENDOR_TYPE}}, {{PRODUCTS}}, {{DATE}}, {{VENDOR_ADDRESS}}, {{VENDOR_GST}}"/>
          </FG>
          <FG label="Version Notes">
            <input value={agrForm.notes} onChange={e=>setAgrForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Annual renewal, updated pricing terms…"/>
          </FG>
        </Modal>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// SECTION 3 – PURCHASE ORDERS
// ────────────────────────────────────────────────────────────────────
function PurchaseOrdersTab({ user }) {
  const [orders,     setOrders]   = useState([]);
  const [vendors,    setVendors]  = useState([]);
  const [storeItems, setStoreItems] = useState([]);
  const [loading,    setLoad]     = useState(true);
  const [filters,    setF]        = useState({orderStatus:'',dept:'',paymentStatus:''});
  const [search,     setSearch]   = useState('');
  const [modal,      setModal]    = useState(false);
  const [detail,     setDetail]   = useState(null);
  const [payModal,   setPayModal] = useState(null);
  const [payForm,    setPayForm]  = useState({paymentStatus:'pending',advanceAmount:''});
  const [itemSearch, setItemSearch] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({department:'kitchen',vendor:'',expectedDelivery:'',notes:'',items:[{itemId:'',itemName:'',category:'',quantity:'',unit:'kg',unitPrice:''}]});

  const load = useCallback(()=>{
    setLoad(true);
    const p={};
    if(filters.orderStatus)   p.orderStatus   = filters.orderStatus;
    if(filters.dept)          p.department    = filters.dept;
    if(filters.paymentStatus) p.paymentStatus = filters.paymentStatus;
    Promise.all([procAPI.pos(p), procAPI.vendors(), storeAPI.items({isActive:true})])
      .then(([o,v,si])=>{setOrders(o.data);setVendors(v.data);setStoreItems(si.data);}).finally(()=>setLoad(false));
  },[filters]);
  useEffect(()=>{load();},[load]);

  const addRow = ()=>{
    setForm(f=>({...f,items:[...f.items,{itemId:'',itemName:'',category:'',quantity:'',unit:'kg',unitPrice:''}]}));
    setItemSearch(s=>[...s,'']);
  };
  const removeRow = i=>{
    setForm(f=>({...f,items:f.items.filter((_,x)=>x!==i)}));
    setItemSearch(s=>s.filter((_,x)=>x!==i));
  };
  const setItem = (i,k,v)=>setForm(f=>({...f,items:f.items.map((it,x)=>{
    if(x!==i) return it;
    const u={...it,[k]:v}; u.totalPrice=parseFloat(u.quantity||0)*parseFloat(u.unitPrice||0); return u;
  })}));

  // When user selects a store item from dropdown, auto-fill row
  const selectStoreItem = (rowIdx, storeItemId)=>{
    const si = storeItems.find(s=>s._id===storeItemId);
    if(!si) { setItem(rowIdx,'itemId',''); setItem(rowIdx,'itemName',''); return; }
    setForm(f=>({...f,items:f.items.map((it,x)=>{
      if(x!==rowIdx) return it;
      return {...it, itemId:si._id, itemName:si.name, category:si.category||'', unit:si.unit||'kg', unitPrice:si.unitPrice||0, totalPrice:parseFloat(it.quantity||0)*(si.unitPrice||0)};
    })}));
  };

  const total = form.items.reduce((s,i)=>s+(parseFloat(i.quantity||0)*parseFloat(i.unitPrice||0)),0);

  const savePO = async ()=>{
    if(submitting) return;
    if(!form.vendor) return toast.error('Select a vendor');
    if(!form.items[0].itemName) return toast.error('Add at least one item');
    setSubmitting(true);
    try { await procAPI.createPO({...form,totalAmount:total}); toast.success('Purchase Order created'); load(); setModal(false); setItemSearch([]); }
    catch(e){ toast.error(e.response?.data?.message||'Failed'); }
    finally { setSubmitting(false); }
  };

  const doAction = async (id,action,extra={})=>{
    try { await procAPI.updatePO(id,{action,...extra}); toast.success('Done'); load(); if(detail?._id===id){const r=await procAPI.getPO(id);setDetail(r.data);} }
    catch(e){ toast.error(e.response?.data?.message||'Failed'); }
  };

  const openDetail = async id=>{ const r=await procAPI.getPO(id); setDetail(r.data); };

  const updatePayment = async ()=>{
    try { await procAPI.updatePO(payModal._id,{action:'update_payment',paymentStatus:payForm.paymentStatus,advanceAmount:parseFloat(payForm.advanceAmount)||0}); toast.success('Payment updated'); load(); setPayModal(null); }
    catch(e){ toast.error('Failed'); }
  };

  const filtered = orders.filter(o=>!search||o.poNumber?.toLowerCase().includes(search.toLowerCase())||o.vendor?.shopName?.toLowerCase().includes(search.toLowerCase())||o.department?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
        {[['Draft',orders.filter(o=>o.orderStatus==='draft').length,'var(--text-3)',Clock],
          ['Order Placed',orders.filter(o=>o.orderStatus==='approved').length,'var(--indigo)',CheckCircle],
          ['In Transit',orders.filter(o=>o.orderStatus==='dispatched').length,'var(--sky)',TrendingUp],
          ['Delivered',orders.filter(o=>o.orderStatus==='delivered').length,'var(--emerald)',CheckCircle],
          ['Pay Pending',orders.filter(o=>o.paymentStatus==='pending').length,'var(--amber)',AlertTriangle],
        ].map(([l,v,c,I])=><StatCard key={l} label={l} value={v} color={c} icon={I}/>)}
      </div>

      <div className="flex items-center justify-between" style={{gap:8,flexWrap:'wrap'}}>
        <div className="filter-bar">
          <div className="search-wrap"><span className="search-icon"><Search size={13}/></span><input style={{width:180}} placeholder="Search PO, vendor…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select value={filters.orderStatus} onChange={e=>setF(f=>({...f,orderStatus:e.target.value}))} style={{width:130}}>
            <option value="">All Status</option>
            {['draft','approved','dispatched','delivered','cancelled'].map(s=><option key={s} value={s}>{s === 'approved' ? 'Order Placed' : s === 'dispatched' ? 'In Transit' : cap(s)}</option>)}
          </select>
          <select value={filters.paymentStatus} onChange={e=>setF(f=>({...f,paymentStatus:e.target.value}))} style={{width:130}}>
            <option value="">All Payments</option>
            {['pending','advance','paid','stopped'].map(s=><option key={s} value={s}>{cap(s)}</option>)}
          </select>
          <select value={filters.dept} onChange={e=>setF(f=>({...f,dept:e.target.value}))} style={{width:130}}>
            <option value="">All Depts</option>
            {DEPTS_NO_STORE.map(d=><option key={d} value={d}>{cap(d)}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}><Plus size={14}/>Create PO</button>
      </div>

      {loading?<div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading…</div>:
        filtered.length===0?<Empty icon={ShoppingCart} title="No purchase orders"/>:
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th style={{position:'sticky',left:0,background:'var(--white)',zIndex:2}}></th>
                <th>PO Number</th><th>Vendor</th><th>Dept</th><th>Amount</th><th>Payment</th><th>Order Status</th><th>Delivery</th><th>Bill</th><th>GRC</th><th>Created By</th>
              </tr></thead>
              <tbody>
                {filtered.map(po=>{
                  const ob=orderBadge(po.orderStatus),pb=payBadge(po.paymentStatus);
                  const isHV = po.requiresHighValueApproval;
                  return (
                    <tr key={po._id}>
                      <td style={{position:'sticky',left:0,background:'var(--white)',zIndex:1,padding:'6px 8px'}}>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>openDetail(po._id)} title="View Details"><Eye size={13}/></button>
                      </td>
                      <td>
                        <div className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{po.poNumber}</div>
                        {isHV&&<div style={{fontSize:'.65rem',color:'var(--red)',fontWeight:700}}>⚠ High Value</div>}
                      </td>
                      <td className="text-sm">{po.vendor?.shopName||'—'}<br/><span style={{fontSize:'.7rem',color:'var(--text-4)'}}>{po.vendor?.vendorType}</span></td>
                      <td style={{textTransform:'capitalize',fontSize:'.8125rem'}}>{po.department}</td>
                      <td>
                        <div style={{fontWeight:700}}>{fmt.inr(po.totalAmount)}</div>
                        {po.advanceAmount>0&&<div style={{fontSize:'.72rem',color:'var(--emerald)'}}>Adv: {fmt.inr(po.advanceAmount)}</div>}
                        {po.balanceAmount>0&&<div style={{fontSize:'.72rem',color:'var(--red)'}}>Bal: {fmt.inr(po.balanceAmount)}</div>}
                      </td>
                      <td><span className={'badge '+pb.cls}>{pb.label}</span>{po.paymentUpdatedBy&&<div style={{fontSize:'.7rem',color:'var(--text-4)'}}>by {po.paymentUpdatedBy?.name}</div>}</td>
                      <td><span className={'badge '+ob.cls}>{ob.label}</span></td>
                      <td><div className="text-sm">{po.expectedDelivery?fmt.date(po.expectedDelivery):<span style={{color:'var(--red)',fontSize:'.75rem'}}>Not set</span>}</div></td>
                      <td><span className={'badge '+(po.billUploaded?'badge-green':'badge-muted')}>{po.billUploaded?'✓':'—'}</span></td>
                      <td><span className={'badge '+(po.grcUploaded?'badge-green':'badge-muted')}>{po.grcUploaded?'✓':'—'}</span></td>
                      <td className="text-sm">{po.createdBy?.name||'—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      }

      {detail&&(()=>{
        const isHV = detail.requiresHighValueApproval;
        const hva  = detail.hvApprovals || {};
        const role = user?.role || '';
        const canApproveGM  = ['gm','chairman','secretary'].includes(role) && isHV && !hva.gm?.approved;
        const canApproveAGM = role === 'agm' && isHV && !hva.agm?.approved;
        const canApproveDir = !['gm','agm','chairman','secretary'].includes(role) && isHV && !hva.director?.approved;
        const hvApprove = async () => { await doAction(detail._id,'hv_approve'); };
        const allHVDone = isHV && hva.director?.approved && hva.agm?.approved && hva.gm?.approved;
        return (
        <Modal open size="modal-xl" onClose={()=>setDetail(null)} title={'PO: '+detail.poNumber}
          footer={<div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'flex-end'}}>
            {detail.orderStatus==='draft'&&['gm','agm','chairman','secretary'].includes(role)&&!isHV&&<button className="btn btn-success btn-sm" onClick={()=>doAction(detail._id,'approve')}>Approve PO</button>}
            {detail.orderStatus==='approved'&&<button className="btn btn-ghost btn-xs" style={{color:'var(--amber)'}} onClick={()=>doAction(detail._id,'dispatch')}>Dispatch</button>}
            {detail.orderStatus==='dispatched'&&<button className="btn btn-ghost btn-xs" style={{color:'var(--emerald)'}} onClick={()=>doAction(detail._id,'deliver')}>Deliver</button>}
            <button className="btn btn-ghost btn-sm" onClick={()=>setDetail(null)}>Close</button>
          </div>}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
            {[['Vendor',detail.vendor?.shopName||'—','var(--text-1)'],['Department',cap(detail.department),'var(--indigo)'],
              ['Total',fmt.inr(detail.totalAmount),'var(--indigo)'],['Advance',fmt.inr(detail.advanceAmount),'var(--emerald)'],
              ['Balance',fmt.inr(detail.balanceAmount),detail.balanceAmount>0?'var(--red)':'var(--emerald)'],
              ['Order Status',orderBadge(detail.orderStatus)?.label,'var(--sky)'],
              ['Payment',payBadge(detail.paymentStatus)?.label,'var(--amber)'],
              ['Created By',(detail.createdBy?.name||'—')+' ('+cap((detail.createdBy?.role||'').replace(/_/g,' '))+')','var(--text-2)'],
            ].map(([k,v,c])=>(
              <div key={k} style={{padding:'10px 12px',background:'var(--bg-subtle)',borderRadius:'var(--radius)'}}>
                <div style={{fontSize:'.72rem',color:'var(--text-4)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em',marginBottom:3}}>{k}</div>
                <div style={{fontWeight:600,color:c,fontSize:'.875rem'}}>{v}</div>
              </div>
            ))}
          </div>

          {/* High Value Approval Chain */}
          {isHV&&(
            <div style={{padding:'12px 16px',background:allHVDone?'var(--emerald-lt)':'var(--red-lt)',borderRadius:'var(--radius)',marginBottom:12,border:`1.5px solid ${allHVDone?'var(--emerald)':'var(--red)'}`}}>
              <div style={{fontWeight:700,fontSize:'.875rem',color:allHVDone?'var(--emerald)':'var(--red)',marginBottom:8}}>
                {allHVDone?'✅ All Approvals Received':'⚠ High Value PO (>₹50,000) — Multi-Level Approval Required'}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                {[
                  ['Department Director', hva.director, canApproveDir],
                  ['AGM',                 hva.agm,      canApproveAGM],
                  ['GM / Chairman',       hva.gm,       canApproveGM],
                ].map(([label, appr, canApprove])=>(
                  <div key={label} style={{padding:'8px 12px',background:'var(--white)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}>
                    <div style={{fontSize:'.72rem',fontWeight:700,color:'var(--text-4)',textTransform:'uppercase',marginBottom:4}}>{label}</div>
                    {appr?.approved
                      ? <div style={{color:'var(--emerald)',fontWeight:700,fontSize:'.8125rem'}}>✓ {appr.approvedBy?.name||'Approved'}</div>
                      : <div style={{color:'var(--text-4)',fontSize:'.8rem'}}>Pending</div>}
                    {canApprove&&<button className="btn btn-sm btn-primary" style={{marginTop:6,width:'100%',justifyContent:'center'}} onClick={hvApprove}>Approve (My Level)</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{padding:0,overflow:'hidden',marginBottom:12}}>
            <div style={{padding:'10px 14px',borderBottom:'1.5px solid var(--border)',fontWeight:600,fontSize:'.875rem'}}>Items in Order</div>
            <table>
              <thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Received</th><th>Missing</th><th>Status</th></tr></thead>
              <tbody>
                {detail.items?.map((it,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:600}}>{it.itemName}</td>
                    <td className="text-3 text-sm">{it.category||'—'}</td>
                    <td><strong>{it.quantity}</strong> {it.unit}</td>
                    <td>{fmt.inr(it.unitPrice)}</td>
                    <td style={{fontWeight:700}}>{fmt.inr(it.totalPrice)}</td>
                    <td style={{color:'var(--emerald)',fontWeight:600}}>{it.receivedQty||'—'}</td>
                    <td style={{color:it.missedQty>0?'var(--red)':'var(--text-4)',fontWeight:600}}>{it.missedQty||0}</td>
                    <td><span className={'badge badge-'+(it.itemStatus==='received'?'green':it.itemStatus==='missed'?'red':'muted')}>{it.itemStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ChangeLog log={detail.changeLog||[]}/>
        </Modal>
        );
      })()}

      {payModal&&(
        <Modal open onClose={()=>setPayModal(null)} title={'Update Payment — '+payModal.poNumber}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setPayModal(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={updatePayment}>Update Payment</button></>}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,padding:12,background:'var(--bg-subtle)',borderRadius:'var(--radius)',marginBottom:12}}>
            {[['Total',fmt.inr(payModal.totalAmount),'var(--indigo)'],['Advance',fmt.inr(payModal.advanceAmount),'var(--emerald)'],['Balance',fmt.inr(payModal.balanceAmount),'var(--red)']].map(([k,v,c])=>(
              <div key={k} style={{textAlign:'center'}}><div style={{fontSize:'.75rem',color:'var(--text-4)'}}>{k}</div><div style={{fontWeight:800,color:c,fontSize:'1.2rem'}}>{v}</div></div>
            ))}
          </div>
          <FG label="Payment Status">
            <div style={{display:'flex',gap:6}}>
              {['pending','advance','paid','stopped'].map(s=>(
                <button key={s} onClick={()=>setPayForm(f=>({...f,paymentStatus:s}))} className="btn btn-sm"
                  style={{flex:1,justifyContent:'center',background:payForm.paymentStatus===s?'var(--indigo)':'transparent',color:payForm.paymentStatus===s?'#fff':'var(--indigo)',border:'1.5px solid var(--indigo)'}}>
                  {cap(s)}
                </button>
              ))}
            </div>
          </FG>
          {payForm.paymentStatus==='advance'&&<FG label="Advance Amount (₹)"><input type="number" value={payForm.advanceAmount} onChange={e=>setPayForm(f=>({...f,advanceAmount:e.target.value}))}/></FG>}
          <div style={{fontSize:'.8125rem',color:'var(--text-3)',padding:'8px 12px',background:'var(--amber-lt)',borderRadius:'var(--radius)'}}>⚠️ Payment updates logged with your name. Should be done by Accounts team.</div>
        </Modal>
      )}

      <Modal open={modal} onClose={()=>{ if(!submitting){ setModal(false); setItemSearch([]); }}} title="Create Purchase Order" size="modal-xl"
        footer={<><button className="btn btn-ghost btn-sm" onClick={()=>{ if(!submitting){ setModal(false); setItemSearch([]); }}}>Cancel</button><button className="btn btn-primary btn-sm" onClick={savePO} disabled={submitting}>{submitting?'Creating…':'Create PO'}</button></>}>
        <div className="form-row cols-3">
          <FG label="Department" required><select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{DEPTS_NO_STORE.map(d=><option key={d} value={d}>{cap(d)}</option>)}</select></FG>
          <FG label="Vendor" required><select value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}><option value="">Select vendor…</option>{vendors.map(v=><option key={v._id} value={v._id}>{v.shopName} ({cap(v.vendorType)})</option>)}</select></FG>
          <FG label="Expected Delivery Date"><input type="date" value={form.expectedDelivery} onChange={e=>setForm({...form,expectedDelivery:e.target.value})} min={new Date().toISOString().slice(0,10)}/></FG>
        </div>
        <div>
          <div className="flex items-center justify-between" style={{marginBottom:8}}>
            <label style={{fontSize:'.8125rem',fontWeight:700,color:'var(--text-2)'}}>Items <span style={{color:'var(--red)'}}>*</span></label>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:'.8125rem',fontWeight:700,color:'var(--indigo)'}}>Total: {fmt.inr(total)}</span>
              <button className="btn btn-subtle btn-sm" onClick={addRow}><Plus size={12}/>Add Row</button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2.5fr 1.2fr 0.8fr 0.7fr 1fr 1fr 28px',gap:6,marginBottom:4}}>
            {['Item','Category','Qty','Unit','Unit Price ₹','Total',''].map(h=><div key={h} style={{fontSize:'.72rem',fontWeight:700,color:'var(--text-4)',textTransform:'uppercase',letterSpacing:'.04em'}}>{h}</div>)}
          </div>
          {form.items.map((it,i)=>{
            const search = itemSearch[i]||'';
            const filtered = storeItems.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.category?.toLowerCase().includes(search.toLowerCase()));
            return (
              <div key={i} style={{display:'grid',gridTemplateColumns:'2.5fr 1.2fr 0.8fr 0.7fr 1fr 1fr 28px',gap:6,marginBottom:8,alignItems:'start'}}>
                <div style={{position:'relative'}}>
                  <input
                    placeholder="Search store item…"
                    value={it.itemId ? it.itemName : (itemSearch[i]||'')}
                    onChange={e=>{
                      const v=e.target.value;
                      setItemSearch(s=>{const n=[...s];n[i]=v;return n;});
                      if(it.itemId) setItem(i,'itemId','');
                    }}
                    style={{width:'100%',borderColor:it.itemId?'var(--emerald)':undefined}}
                  />
                  {!it.itemId && search && filtered.length>0 && (
                    <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:99,background:'var(--white)',border:'1.5px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxHeight:180,overflowY:'auto'}}>
                      {filtered.slice(0,10).map(si=>(
                        <div key={si._id} onClick={()=>{selectStoreItem(i,si._id);setItemSearch(s=>{const n=[...s];n[i]='';return n;});}}
                          style={{padding:'7px 12px',cursor:'pointer',fontSize:'.8125rem',borderBottom:'1px solid var(--border)'}}
                          onMouseEnter={e=>e.target.style.background='var(--bg-2)'} onMouseLeave={e=>e.target.style.background=''}>
                          <span style={{fontWeight:600}}>{si.name}</span>
                          <span style={{color:'var(--text-3)',fontSize:'.75rem',marginLeft:8}}>{si.category} · {si.quantity}{si.unit} in stock</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {it.itemId && <div style={{fontSize:'.7rem',color:'var(--emerald)',marginTop:2}}>✓ Linked to store</div>}
                </div>
                <input placeholder="Category" value={it.category} onChange={e=>setItem(i,'category',e.target.value)} style={{color:'var(--text-3)'}}/>
                <input placeholder="Qty" type="number" min="0" value={it.quantity} onChange={e=>setItem(i,'quantity',e.target.value)}/>
                <select value={it.unit} onChange={e=>setItem(i,'unit',e.target.value)}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select>
                <input placeholder="₹ price" type="number" min="0" value={it.unitPrice} onChange={e=>setItem(i,'unitPrice',e.target.value)}/>
                <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',fontWeight:700,fontSize:'.875rem',color:'var(--indigo)',paddingTop:8}}>{fmt.inr(it.totalPrice||0)}</div>
                <button className="btn btn-icon btn-ghost btn-sm" style={{marginTop:4}} onClick={()=>removeRow(i)} disabled={form.items.length===1}><Trash2 size={12} style={{color:'var(--red)'}}/></button>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// SECTION 4 – ORDER TRACKING
// ────────────────────────────────────────────────────────────────────
function OrderTrackingTab() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoad]    = useState(true);
  const [deptF,   setDeptF]   = useState('');
  const [statusF, setStatusF] = useState('');
  const [search,  setSearch]  = useState('');
  const [delivModal, setDM]   = useState(null);
  const [delivDate,  setDD]   = useState('');

  const [subTab, setSubTab]   = useState('upcoming');

  const load = useCallback(()=>{
    setLoad(true);
    procAPI.orderTracking({department:deptF||undefined,orderStatus:statusF||undefined})
      .then(r=>setOrders(r.data)).finally(()=>setLoad(false));
  },[deptF,statusF]);
  useEffect(()=>{load();},[load]);

  const setDelivery = async ()=>{
    if(!delivDate) return toast.error('Select a date');
    try { await procAPI.updateDelivery(delivModal._id,{expectedDelivery:delivDate}); toast.success('Delivery date updated'); load(); setDM(null); }
    catch(e){ toast.error('Failed'); }
  };

  const filtered = orders.filter(o=>{
    if (subTab === 'delivered' && o.orderStatus !== 'delivered') return false;
    if (subTab === 'upcoming' && o.orderStatus === 'delivered') return false;
    if (search && !o.poNumber?.toLowerCase().includes(search.toLowerCase()) && !o.vendor?.shopName?.toLowerCase().includes(search.toLowerCase()) && !o.department?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
        {[['Draft',orders.filter(o=>o.orderStatus==='draft').length,'var(--text-3)'],
          ['Order Placed',orders.filter(o=>o.orderStatus==='approved').length,'var(--indigo)'],
          ['In Transit',orders.filter(o=>o.orderStatus==='dispatched').length,'var(--amber)'],
          ['Delivered',orders.filter(o=>o.orderStatus==='delivered').length,'var(--emerald)'],
        ].map(([l,v,c])=><StatCard key={l} label={l} value={v} color={c} icon={Clock}/>)}
      </div>

      <div className="flex items-center justify-between">
        <div style={{display:'flex', gap: 6, background:'var(--bg-2)', padding: 4, borderRadius: 'var(--radius)'}}>
          <button className="btn btn-sm" style={{background:subTab==='upcoming'?'var(--white)':'transparent', boxShadow:subTab==='upcoming'?'0 1px 3px rgba(0,0,0,.1)':'none', color:subTab==='upcoming'?'var(--indigo)':'var(--text-3)'}} onClick={()=>setSubTab('upcoming')}>Upcoming</button>
          <button className="btn btn-sm" style={{background:subTab==='delivered'?'var(--white)':'transparent', boxShadow:subTab==='delivered'?'0 1px 3px rgba(0,0,0,.1)':'none', color:subTab==='delivered'?'var(--emerald)':'var(--text-3)'}} onClick={()=>setSubTab('delivered')}>Delivered</button>
        </div>
        <div className="filter-bar">
          <div className="search-wrap"><span className="search-icon"><Search size={13}/></span><input style={{width:180}} placeholder="Search PO, vendor…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select value={deptF} onChange={e=>setDeptF(e.target.value)} style={{width:140}}><option value="">All Departments</option>{DEPTS_NO_STORE.map(d=><option key={d} value={d}>{cap(d)}</option>)}</select>
          <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={{width:140}}><option value="">All Status</option>{['draft','approved','dispatched','delivered'].map(s=><option key={s} value={s}>{s === 'approved' ? 'Order Placed' : s === 'dispatched' ? 'In Transit' : cap(s)}</option>)}</select>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13}/>Refresh</button>
        </div>
      </div>

      {loading?<div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading…</div>:
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>PO Number</th><th>Vendor</th><th>Dept</th><th>Items</th><th>Amount</th><th>Order Status</th><th>Payment</th><th>Expected Delivery</th><th>Bill</th><th>GRC</th><th style={{whiteSpace:'nowrap'}}>Delivery Set By</th><th></th></tr></thead>
              <tbody>
                {filtered.map(po=>{
                  const ob=orderBadge(po.orderStatus),pb=payBadge(po.paymentStatus);
                  const isOverdue=po.expectedDelivery&&new Date(po.expectedDelivery)<new Date()&&po.orderStatus!=='delivered';
                  return (
                    <tr key={po._id}>
                      <td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{po.poNumber}</td>
                      <td className="text-sm">{po.vendor?.shopName||'—'}</td>
                      <td style={{textTransform:'capitalize',fontSize:'.8125rem'}}>{po.department}</td>
                      <td className="text-sm text-3">{po.items?.length} item(s)</td>
                      <td style={{fontWeight:700}}>{fmt.inr(po.totalAmount)}</td>
                      <td><span className={'badge '+ob.cls}>{ob.label}</span></td>
                      <td><span className={'badge '+pb.cls}>{pb.label}</span></td>
                      <td>
                        <div className="text-sm" style={{color:isOverdue?'var(--red)':'inherit',fontWeight:isOverdue?700:400}}>
                          {po.expectedDelivery?fmt.date(po.expectedDelivery):<span style={{color:'var(--red)',fontSize:'.75rem'}}>Not set</span>}
                          {isOverdue&&<span style={{fontSize:'.7rem',display:'block'}}>⚠ Overdue</span>}
                        </div>
                      </td>
                      <td><span className={'badge '+(po.billUploaded?'badge-green':'badge-muted')}>{po.billUploaded?'✓':'—'}</span></td>
                      <td><span className={'badge '+(po.grcUploaded?'badge-green':'badge-muted')}>{po.grcUploaded?'✓':'—'}</span></td>
                      <td className="text-sm" style={{whiteSpace:'nowrap'}}>{po.deliveryUpdatedBy?.name||'—'}</td>
                      <td><button className="btn btn-ghost btn-xs" onClick={()=>{setDM(po);setDD(po.expectedDelivery?new Date(po.expectedDelivery).toISOString().slice(0,10):'');}}>Set Date</button></td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={12} style={{textAlign:'center',padding:32,color:'var(--text-4)'}}>No orders found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      }

      {delivModal&&(
        <Modal open onClose={()=>setDM(null)} title={'Set Delivery Date — '+delivModal.poNumber}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setDM(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={setDelivery}>Update Date</button></>}>
          <div style={{padding:'10px 12px',background:'var(--bg-subtle)',borderRadius:'var(--radius)',fontSize:'.8125rem',marginBottom:10}}>
            <strong>Vendor:</strong> {delivModal.vendor?.shopName} &nbsp;|&nbsp; <strong>Dept:</strong> {cap(delivModal.department)} &nbsp;|&nbsp; <strong>Total:</strong> {fmt.inr(delivModal.totalAmount)}
          </div>
          <FG label="Expected Delivery Date" required><input type="date" value={delivDate} onChange={e=>setDD(e.target.value)}/></FG>
        </Modal>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// SECTION 5 – QUALITY & GRC
// ────────────────────────────────────────────────────────────────────
function QualityTab() {
  const [grcs,    setGrcs]   = useState([]);
  const [pos,     setPOs]    = useState([]);
  const [loading, setLoad]   = useState(true);
  const [modal,   setModal]  = useState(false);
  const [billModal,setBM]    = useState(null);
  const billRef              = useRef();
  const [form, setForm] = useState({linkedPO:'',poNumber:'',items:[],notes:''});

  const load = ()=>{
    setLoad(true);
    Promise.all([
      procAPI.grc(),
      procAPI.pos({ orderStatus: 'approved' }),
      procAPI.pos({ orderStatus: 'dispatched' }),
    ]).then(([g,pa,pd])=>{
      setGrcs(g.data);
      // Merge approved + dispatched, deduplicate, exclude already GRC'd
      const grcPOIds = new Set(g.data.map(gr=>gr.linkedPO?.toString()).filter(Boolean));
      const all = [...pa.data, ...pd.data];
      const seen = new Set();
      setPOs(all.filter(p=>{ if(seen.has(p._id)||grcPOIds.has(p._id.toString())) return false; seen.add(p._id); return true; }));
    }).finally(()=>setLoad(false));
  };
  useEffect(()=>{load();},[]);

  const setRow = (i,k,v)=>setForm(f=>({...f,items:f.items.map((it,x)=>{
    if(x!==i) return it;
    const u={...it,[k]:v};
    if(k==='receivedQty') u.missingQty=Math.max(0,(parseFloat(it.orderedQty||0)-parseFloat(v||0)));
    return u;
  })}));

  const selectPO = poId=>{
    if(!poId){ setForm({linkedPO:'',poNumber:'',items:[],notes:''}); return; }
    const po = pos.find(p=>p._id===poId);
    if(po) setForm(f=>({...f,
      linkedPO: poId,
      poNumber: po.poNumber,
      items: po.items.map(it=>({
        itemId:       it.itemId || null,
        itemName:     it.itemName,
        orderedQty:   it.quantity,
        receivedQty:  '',
        missingQty:   0,
        mismatchNotes:'',
        unit:         it.unit,
        unitPrice:    it.unitPrice,
      })),
    }));
  };

  const save = async ()=>{
    const fd=new FormData(); fd.append('data',JSON.stringify(form));
    try { await procAPI.createGRC(fd); toast.success('GRC uploaded'); load(); setModal(false); }
    catch(e){ toast.error(e.response?.data?.message||'Failed'); }
  };

  const uploadBill = async poId=>{
    const file=billRef.current?.files?.[0];
    if(!file) return toast.error('Select a bill file');
    const fd=new FormData(); fd.append('bill',file);
    try { await procAPI.uploadBill(poId,fd); toast.success('Bill uploaded & Accounts notified'); setBM(null); load(); }
    catch(e){ toast.error('Failed to upload bill'); }
  };

  const verify = async id=>{ try { await procAPI.verifyGRC(id); toast.success('Verified'); load(); } catch(e){ toast.error('Failed'); } };

  const sColor={pending:'var(--amber)',partial:'var(--sky)',completed:'var(--emerald)',disputed:'var(--red)'};

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
        {[['Total GRCs',grcs.length,'var(--text-1)',FileText],
          ['Pending Verify',grcs.filter(g=>g.status==='pending').length,'var(--amber)',Clock],
          ['Completed',grcs.filter(g=>g.status==='completed').length,'var(--emerald)',CheckCircle],
          ['Bill Upload Needed',pos.filter(p=>!p.billUploaded).length,'var(--red)',Upload],
        ].map(([l,v,c,I])=><StatCard key={l} label={l} value={v} color={c} icon={I}/>)}
      </div>

      <div className="flex items-center justify-between" style={{gap:8}}>
        <span className="text-3 text-sm">{grcs.length} GRC record(s) · 4-party verification flow</span>
        <div style={{display:'flex',gap:6}}>
          <button className="btn btn-secondary btn-sm" onClick={()=>setBM({})}>
            <Upload size={13}/>Upload Bill for PO
          </button>
          <button className="btn btn-primary btn-sm" onClick={()=>{setModal(true);setForm({linkedPO:'',poNumber:'',items:[{itemName:'',orderedQty:'',receivedQty:'',missingQty:0,mismatchNotes:''}],notes:''});}}>
            <Plus size={13}/>Upload GRC
          </button>
        </div>
      </div>

      {loading?<div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading…</div>:
        grcs.length===0?<Empty icon={FileText} title="No GRC records" sub="Upload goods received copy after delivery"/>:
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>PO Number</th><th>Items</th><th>Received By</th><th>Store ✓</th><th>Accounts ✓</th><th>Procurement ✓</th><th>HOD ✓</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {grcs.map(g=>(
                  <tr key={g._id}>
                    <td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{g.poNumber||'—'}</td>
                    <td>
                      <div className="text-sm">{g.items?.length} item(s)</div>
                      {g.items?.some(i=>i.missingQty>0)&&<span style={{fontSize:'.72rem',color:'var(--red)',fontWeight:600}}>⚠ {g.items.filter(i=>i.missingQty>0).length} missing</span>}
                    </td>
                    <td><div className="text-sm">{g.receivedBy?.name||'—'}</div><span style={{fontSize:'.72rem',color:'var(--text-4)'}}>{fmt.date(g.receivedDate)}</span></td>
                    {[['verifiedByStore','verifiedByStoreAt'],['verifiedByAccounts','verifiedByAccountsAt'],['verifiedByProcurement','verifiedByProcurementAt'],['verifiedByHOD','verifiedByHODAt']].map(([k,d])=>(
                      <td key={k}>{g[k]?<div><div style={{fontWeight:700,fontSize:'.8rem',color:'var(--emerald)'}}>{g[k]?.name||'✓'}</div><div style={{fontSize:'.7rem',color:'var(--text-4)'}}>{fmt.date(g[d])}</div></div>:<span style={{color:'var(--text-4)',fontSize:'.8rem'}}>Pending</span>}</td>
                    ))}
                    <td><span style={{background:sColor[g.status]+'18',color:sColor[g.status],borderRadius:20,padding:'2px 9px',fontSize:'.72rem',fontWeight:700}}>{cap(g.status)}</span></td>
                    <td>{g.status!=='completed'&&<button className="btn btn-ghost btn-xs" onClick={()=>verify(g._id)}>Verify as Me</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }

      {/* Bill Upload Modal */}
      {billModal&&(
        <Modal open onClose={()=>setBM(null)} title="Upload Bill for Purchase Order"
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setBM(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={()=>uploadBill(form.linkedPO)}>Upload Bill</button></>}>
          <FG label="Select PO" required>
            <select value={form.linkedPO} onChange={e=>selectPO(e.target.value)}>
              <option value="">Select a PO…</option>
              {pos.map(p=><option key={p._id} value={p._id}>{p.poNumber} — {cap(p.department)} — {fmt.inr(p.totalAmount)}</option>)}
            </select>
          </FG>
          <FG label="Bill / Invoice File (PDF, Image)" required>
            <input type="file" ref={billRef} accept=".pdf,.jpg,.jpeg,.png"/>
          </FG>
          <div style={{fontSize:'.8125rem',color:'var(--text-3)',padding:'8px 12px',background:'var(--sky-lt)',borderRadius:'var(--radius)'}}>
            📋 After upload, Accounts team will be notified automatically.
          </div>
        </Modal>
      )}

      {/* GRC Upload Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Upload GRC — Goods Received Copy" size="modal-xl"
        footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Upload GRC</button></>}>
        <FG label="Select Purchase Order" required>
          <select value={form.linkedPO} onChange={e=>selectPO(e.target.value)}>
            <option value="">Select PO to receive goods for…</option>
            {pos.map(p=><option key={p._id} value={p._id}>{p.poNumber} — {cap(p.department)} — {p.items?.length} items — {p.vendor?.shopName||'—'} [{p.orderStatus}]</option>)}
          </select>
        </FG>

        {form.linkedPO && form.items.length > 0 && (
          <div>
            <div style={{marginBottom:8}}>
              <label style={{fontSize:'.8125rem',fontWeight:700,color:'var(--text-2)'}}>Items Received</label>
              <span style={{fontSize:'.75rem',color:'var(--text-4)',marginLeft:8}}>Item name & ordered qty are from the PO — enter what you received</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 0.8fr 0.8fr 0.7fr 0.6fr 2fr',gap:6,marginBottom:4}}>
              {['Item','Ordered','Received','Missing','Unit','Notes'].map(h=>(
                <div key={h} style={{fontSize:'.72rem',fontWeight:700,color:'var(--text-4)',textTransform:'uppercase',letterSpacing:'.04em'}}>{h}</div>
              ))}
            </div>
            {form.items.map((it,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 0.8fr 0.8fr 0.7fr 0.6fr 2fr',gap:6,marginBottom:6,alignItems:'center'}}>
                <div style={{padding:'6px 10px',background:'var(--bg-2)',borderRadius:'var(--radius)',fontSize:'.8125rem',fontWeight:600,border:'1.5px solid var(--border)'}}>
                  {it.itemName}
                  {it.itemId && <span style={{fontSize:'.65rem',color:'var(--emerald)',display:'block'}}>✓ linked to store</span>}
                </div>
                <div style={{padding:'6px 10px',background:'var(--bg-2)',borderRadius:'var(--radius)',fontSize:'.875rem',fontWeight:700,color:'var(--indigo)',border:'1.5px solid var(--border)',textAlign:'center'}}>
                  {it.orderedQty}
                </div>
                <input placeholder="Received" type="number" min="0" value={it.receivedQty}
                  onChange={e=>setRow(i,'receivedQty',e.target.value)}
                  style={{borderColor: it.receivedQty&&parseFloat(it.receivedQty)<parseFloat(it.orderedQty)?'var(--amber)':'var(--emerald)'}}/>
                <div style={{padding:'6px 8px',borderRadius:'var(--radius)',fontSize:'.875rem',fontWeight:800,textAlign:'center',
                  background: it.missingQty>0?'var(--red-lt)':'var(--emerald-lt)',
                  color: it.missingQty>0?'var(--red)':'var(--emerald)',
                  border:'1.5px solid '+(it.missingQty>0?'var(--red)':'var(--emerald)')}}>
                  {it.missingQty||0}
                </div>
                <div style={{padding:'6px 8px',background:'var(--bg-2)',borderRadius:'var(--radius)',fontSize:'.8rem',color:'var(--text-3)',border:'1.5px solid var(--border)',textAlign:'center'}}>
                  {it.unit||'—'}
                </div>
                <input placeholder="Quality notes, damage…" value={it.mismatchNotes} onChange={e=>setRow(i,'mismatchNotes',e.target.value)}/>
              </div>
            ))}
          </div>
        )}

        {!form.linkedPO && <div style={{padding:20,textAlign:'center',color:'var(--text-4)',fontSize:'.875rem',background:'var(--bg-2)',borderRadius:'var(--radius)'}}>Select a PO above to auto-fill items</div>}

        <FG label="Overall Notes"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{minHeight:50}} placeholder="General delivery remarks…"/></FG>
        <div style={{padding:'8px 12px',background:'var(--emerald-lt)',borderRadius:'var(--radius)',fontSize:'.8125rem',color:'var(--emerald)'}}>✓ Inventory updates automatically when you submit. Accounts will be notified for payment.</div>
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────
export default function ProcurementPage({ defaultTab }) {
  const [tab,  setTab]  = useState(defaultTab || 'requirements');
  useEffect(() => { if (defaultTab) setTab(defaultTab); }, [defaultTab]);
  const [user, setUser] = useState(null);
  useEffect(()=>{ authAPI.me().then(r=>setUser(r.data)).catch(()=>{}); },[]);

  const tabs = [
    { id:'requirements', label:'Requirements'   },
    { id:'vendors',      label:'Vendors'         },
    { id:'orders',       label:'Purchase Orders' },
    { id:'tracking',     label:'Order Tracking'  },
    { id:'quality',      label:'Quality & GRC'   },
  ];

  return (
    <div className="page">
      <PageHdr icon={ShoppingCart} title="Procurement" color="var(--emerald)"/>
      <div style={{padding:'0 22px',background:'var(--white)',borderBottom:'1.5px solid var(--border)'}}>
        <Tabs tabs={tabs} active={tab} onChange={setTab}/>
      </div>
      <div className="page-body">
        {tab==='requirements'&&<RequirementsTab user={user}/>}
        {tab==='vendors'     &&<VendorsTab/>}
        {tab==='orders'      &&<PurchaseOrdersTab user={user}/>}
        {tab==='tracking'    &&<OrderTrackingTab/>}
        {tab==='quality'     &&<QualityTab/>}
      </div>
    </div>
  );
}
