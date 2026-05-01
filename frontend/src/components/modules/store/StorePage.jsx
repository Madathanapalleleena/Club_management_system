import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Search, Edit2, ArrowUpDown, AlertTriangle, FileText, RotateCcw, Eye, Upload, Download, Power } from 'lucide-react';
import { storeAPI, procAPI, authAPI } from '../../../api';
import { useAuth } from '../../../contexts/AuthContext';
import { fmt, stockBadge, reqBadge, orderBadge, payBadge } from '../../../utils/helpers';
import { Modal, FG, PageHdr, Empty, Tabs, Stat } from '../../ui';
import toast from 'react-hot-toast';

const TYPES = ['raw material', 'perishable', 'packaged', 'liquor', 'consumable', 'fuel', 'equipment'];
const UNITS = ['kg', 'g', 'litre', 'ml', 'pcs', 'box', 'can', 'bottle', 'packet', 'roll', 'cylinder', 'bag'];
const DEPT_LIST = ['kitchen', 'bar', 'rooms', 'banquet', 'store', 'maintenance', 'sports', 'restaurant'];

// ── INVENTORY TAB ────────────────────────────────────────────────
function ItemsTab() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [sum, setSum] = useState(null);
  const [loading, setLoad] = useState(true);
  const [filters, setF] = useState({ search: '', category: '', type: '', view: 'all' });
  const [modal, setModal] = useState(false);
  const [adjModal, setAdj] = useState(null);
  const [txnModal, setTxn] = useState(null);
  const [txns, setTxns] = useState([]);
  const [editing, setEdit] = useState(null);
  const [form, setForm] = useState({ name: '', itemType: 'raw material', category: '', quantity: 0, unit: 'kg', unitPrice: 0, thresholdValue: 0, expiryDate: '', department: 'kitchen', location: '' });
  const [adjForm, setAdjF] = useState({ type: 'add', quantity: '', notes: '' });
  const [docModal, setDocModal] = useState(false);
  const bulkInvRef = React.useRef(null);

  const handleBulkInventory = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const rows = text.split(/\r?\n/).filter(r => r.trim() !== '');
        if (rows.length <= 1) { toast.error('CSV file is empty or only contains headers.'); return; }
        const items = [];
        for (let i = 1; i < rows.length; i++) {
          let p = '', inQuote = false;
          const parts = [];
          for (let c of rows[i]) {
            if (c === '"') inQuote = !inQuote;
            else if (c === ',' && !inQuote) { parts.push(p); p = ''; }
            else p += c;
          }
          parts.push(p);
          
          if (parts.length < 5) continue;
          const rowData = {
            name: parts[0]?.trim(),
            itemType: parts[1]?.trim() || 'raw material',
            category: parts[2]?.trim() || 'General',
            quantity: parseFloat(parts[3]) || 0,
            unit: parts[4]?.trim() || 'kg',
            unitPrice: parseFloat(parts[5]) || 0,
            thresholdValue: parseFloat(parts[6]) || 0,
          };
          const exDate = parts[7]?.trim();
          if (exDate) rowData.expiryDate = exDate;
          if (rowData.name) items.push(rowData);
        }
        if (!items.length) { toast.error('No valid rows found in CSV.'); return; }
        toast.loading('Importing items...');
        try {
          const results = await storeAPI.bulkUpsertItems(items);
          toast.dismiss();
          const created = results.data.filter(r => r.action === 'created').length;
          const updated = results.data.filter(r => r.action === 'updated').length;
          if (created > 0) toast.success(`${created} new item(s) added to inventory.`);
          if (updated > 0) toast.success(`${updated} existing item(s) quantity updated (no duplicates created).`);
        } catch (err) { toast.dismiss(); toast.error(err.response?.data?.message || 'Bulk import failed.'); }
        load();
      } catch (err) { toast.dismiss(); toast.error('Failed to parse CSV file.'); }
      if (bulkInvRef.current) bulkInvRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'Item Name,Type(raw material/perishable/packaged/liquor/consumable/fuel/equipment),Category,Quantity,Unit,Unit Price,Threshold,Expiry Date(YYYY-MM-DD)\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'inventory_bulk_template.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const load = useCallback(() => {
    setLoad(true);
    const p = {};
    if (filters.search) p.search = filters.search;
    if (filters.category) p.category = filters.category;
    if (filters.type) p.type = filters.type;
    if (filters.view === 'low') p.lowStock = 'true';
    if (filters.view === 'expiring') p.expiringSoon = 'true';
    Promise.all([storeAPI.items(p), storeAPI.categories(), storeAPI.summary()])
      .then(([i, c, s]) => { setItems(i.data); setCats(c.data); setSum(s.data); })
      .finally(() => setLoad(false));
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEdit(null); setForm({ name: '', itemType: 'raw material', category: '', quantity: 0, unit: 'kg', unitPrice: 0, thresholdValue: 0, expiryDate: '', department: 'kitchen', location: '' }); setModal(true); };
  const openEdit = i => { setEdit(i); setForm({ ...i, expiryDate: i.expiryDate ? i.expiryDate.slice(0, 10) : '' }); setModal(true); };

  const save = async () => {
    if (!form.name || !form.category) return toast.error('Name and category required');
    try { editing ? await storeAPI.updateItem(editing._id, form) : await storeAPI.createItem(form); toast.success(editing ? 'Updated' : 'Added'); load(); setModal(false); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const adjust = async () => {
    if (!adjForm.quantity || adjForm.quantity <= 0) return toast.error('Enter valid quantity');
    try { await storeAPI.adjust(adjModal._id, adjForm); toast.success('Stock adjusted'); load(); setAdj(null); }
    catch (e) { toast.error('Failed'); }
  };

  const showTxns = async item => {
    setTxn(item);
    const r = await storeAPI.transactions(item._id);
    setTxns(r.data);
  };

  const expiry = i => {
    if (!i.expiryDate) return null;
    const d = Math.floor((new Date(i.expiryDate) - new Date()) / 86400000);
    if (d < 0) return { label: 'Expired', color: 'var(--red)' };
    if (d <= 50) return { label: `${d}d left`, color: d <= 7 ? 'var(--red)' : 'var(--amber)' };
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sum && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))' }}>
          <Stat label="Total" value={sum.total} />
          <Stat label="Adequate" value={sum.adequate} color="var(--emerald)" />
          <Stat label="Low" value={sum.low} color="var(--amber)" />
          <Stat label="Critical" value={sum.critical} color="var(--red)" />
          <Stat label="Out of Stock" value={sum.outOfStock} color="var(--red)" />
          <Stat label="Expiring (50d)" value={sum.expiringSoon} color="var(--violet)" />
          <Stat label="Stock Value" value={fmt.inr(sum.totalValue)} color="var(--indigo)" />
        </div>
      )}
      <div className="flex items-center justify-between" style={{ gap: 8, flexWrap: 'wrap' }}>
        <div className="filter-bar">
          <div className="search-wrap"><span className="search-icon"><Search size={13} /></span><input style={{ width: 170 }} placeholder="Search items..." value={filters.search} onChange={e => setF(f => ({ ...f, search: e.target.value }))} /></div>
          <select value={filters.category} onChange={e => setF(f => ({ ...f, category: e.target.value }))} style={{ width: 140 }}>
            <option value="">All Categories</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.view} onChange={e => setF(f => ({ ...f, view: e.target.value }))} style={{ width: 130 }}>
            <option value="all">All Items</option>
            <option value="low">Low / Critical</option>
            <option value="expiring">Expiring Soon</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-subtle btn-sm" onClick={() => setDocModal(true)} type="button"><Download size={13} />CSV Template</button>
          <input type="file" ref={bulkInvRef} style={{ display: 'none' }} onChange={handleBulkInventory} accept=".csv,.xlsx,.xls,.json,.txt" />
          <button className="btn btn-subtle btn-sm" onClick={() => bulkInvRef.current?.click()} type="button"><Upload size={13} />Bulk Upload</button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={13} />Add Item</button>
        </div>
      </div>

      {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)' }}>Loading...</div> :
        items.length === 0 ? <Empty icon={Package} title="No items found" /> :
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item Name</th><th>Type</th><th>Category</th><th>Stock</th><th>Threshold</th><th>Last Purchased</th><th>Unit Price</th><th>Expiry</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {items.map(i => {
                    const b = stockBadge(i.stockStatus), exp = expiry(i);
                    const qc = i.stockStatus === 'critical' || i.stockStatus === 'out_of_stock' ? 'var(--red)' : i.stockStatus === 'low' ? 'var(--amber)' : 'var(--text-1)';
                    const pct = i.thresholdValue > 0 ? Math.min(100, Math.round((i.quantity / i.thresholdValue) * 100)) : 100;
                    return (
                      <tr key={i._id}>
                        <td style={{ fontWeight: 600 }}>{i.name}</td>
                        <td className="text-sm text-3" style={{ textTransform: 'capitalize' }}>{i.itemType}</td>
                        <td className="text-sm">{i.category}</td>
                        <td>
                          <div style={{ fontWeight: 800, color: qc, fontSize: '.9rem' }}>{fmt.num(i.quantity)}<span className="text-3 text-sm" style={{ fontWeight: 400 }}> {i.unit}</span></div>
                          <div className="progress-bar" style={{ marginTop: 3, width: 70 }}><div className="progress-fill" style={{ width: `${pct}%`, background: qc }} /></div>
                          {i.thresholdValue > 0 && pct < 50 && (
                            <div style={{ fontSize: '.7rem', color: 'var(--red)', fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 2 }}><AlertTriangle size={10} /> {'<'} 50% Alert</div>
                          )}
                        </td>
                        <td className="text-sm text-3">{i.thresholdValue} {i.unit}</td>
                        <td className="text-sm text-3">{i.lastPurchased ? fmt.date(i.lastPurchased) : '—'}</td>
                        <td className="text-sm">{fmt.inr(i.unitPrice)}/{i.unit}</td>
                        <td>{exp ? (<span style={{ fontSize: '.75rem', fontWeight: 700, color: exp.color, display: 'flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={11} />{exp.label}</span>) : i.expiryDate ? <span className="text-xs text-3">{fmt.date(i.expiryDate)}</span> : '—'}</td>
                        <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 3 }}>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setAdj(i); setAdjF({ type: 'add', quantity: '', notes: '' }); }} title="Adjust"><ArrowUpDown size={13} /></button>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => showTxns(i)} title="History"><FileText size={13} /></button>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEdit(i)} title="Edit"><Edit2 size={13} /></button>
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

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Item' : 'Add Item'} size="modal-lg"
        footer={<><button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>{editing ? 'Update' : 'Add'}</button></>}
      >
        <div className="form-row cols-2">
          <FG label="Item Name" required><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></FG>
          <FG label="Category" required><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Grains, Proteins..." /></FG>
        </div>
        <div className="form-row cols-3">
          <FG label="Item Type"><select value={form.itemType} onChange={e => setForm({ ...form, itemType: e.target.value })}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></FG>
          <FG label="Unit"><select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></FG>
          <FG label="Department"><select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>{DEPT_LIST.map(d => <option key={d} value={d}>{d}</option>)}</select></FG>
        </div>
        <div className="form-row cols-3">
          <FG label="Quantity"><input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} /></FG>
          <FG label="Unit Price (₹)"><input type="number" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })} /></FG>
          <FG label="Threshold Value"><input type="number" value={form.thresholdValue} onChange={e => setForm({ ...form, thresholdValue: parseFloat(e.target.value) || 0 })} hint="Alert at 50% of this" /></FG>
        </div>
        <div className="form-row cols-2">
          <FG label="Expiry Date"><input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></FG>
          <FG label="Location"><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Shelf A, Cold storage..." /></FG>
        </div>
      </Modal>

      {/* Adjust Modal */}
      {adjModal && (
        <Modal open onClose={() => setAdj(null)} title={`Adjust Stock — ${adjModal.name}`}
          footer={<><button className="btn btn-ghost btn-sm" onClick={() => setAdj(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={adjust}>Apply</button></>}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            {[{ v: 'add', label: 'Add', c: 'var(--emerald)' }, { v: 'deduct', label: 'Deduct', c: 'var(--red)' }, { v: 'return', label: 'Return', c: 'var(--sky)' }].map(o => (
              <button key={o.v} onClick={() => setAdjF(f => ({ ...f, type: o.v }))} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', background: adjForm.type === o.v ? o.c : 'transparent', color: adjForm.type === o.v ? '#fff' : o.c, border: `1.5px solid ${o.c}` }}>{o.label}</button>
            ))}
          </div>
          <div style={{ padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', fontSize: '.8125rem', color: 'var(--text-3)' }}>
            Current: <strong style={{ color: 'var(--text-1)' }}>{adjModal.quantity} {adjModal.unit}</strong>
            {adjModal.thresholdValue > 0 && <span style={{ marginLeft: 8, color: 'var(--text-4)' }}>Threshold: {adjModal.thresholdValue}</span>}
          </div>
          <FG label={`Quantity to ${adjForm.type}`} required><input type="number" min="0" value={adjForm.quantity} onChange={e => setAdjF(f => ({ ...f, quantity: parseFloat(e.target.value) || '' }))} placeholder="Enter quantity" /></FG>
          <FG label="Reason / Notes"><input value={adjForm.notes} onChange={e => setAdjF(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for adjustment..." /></FG>
        </Modal>
      )}

      {/* Transaction History Modal */}
      {txnModal && (
        <Modal open size="modal-lg" onClose={() => setTxn(null)} title={`Transaction History — ${txnModal.name}`}
          footer={<button className="btn btn-ghost btn-sm" onClick={() => setTxn(null)}>Close</button>}
        >
          {txns.length === 0 ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-4)' }}>No transactions yet</div> :
            <div className="table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Quantity</th><th>Before</th><th>After</th><th>Notes</th><th>By</th><th>Date</th></tr></thead>
                <tbody>
                  {txns.map(t => (
                    <tr key={t._id}>
                      <td><span className={`badge ${t.type === 'purchase' || t.type === 'add' || t.type === 'return' || t.type === 'initial' ? 'badge-green' : 'badge-red'}`} style={{ textTransform: 'capitalize' }}>{t.type}</span></td>
                      <td style={{ fontWeight: 700 }}>{t.quantity}</td>
                      <td className="text-sm text-3">{t.previousQty}</td>
                      <td style={{ fontWeight: 600 }}>{t.newQty}</td>
                      <td className="text-sm text-3">{t.notes || '—'}</td>
                      <td className="text-sm">{t.performedBy?.name || '—'}</td>
                      <td className="text-sm text-3">{fmt.datetime(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </Modal>
      )}

      {/* Template Download Modal */}
      {docModal && (
        <Modal open onClose={() => setDocModal(false)} title="Download CSV Template"
          footer={<><button className="btn btn-ghost btn-sm" onClick={() => setDocModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={() => { handleDownloadTemplate(); setDocModal(false); }}><Download size={13} /> Download CSV</button></>}
        >
          <div style={{ padding: '10px 14px', background: 'var(--amber-lt)', borderRadius: 'var(--radius)', fontSize: '.8125rem', color: 'var(--text-1)' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: 'var(--amber)', fontSize: '.875rem' }}><AlertTriangle size={15} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} /> Please Read Carefully:</strong>
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)' }}>
              <li style={{ marginBottom: 4 }}>Do not change or remove the top row (column headers).</li>
              <li>Ensure that the <strong>Expiry Date</strong> data is strictly formatted exactly as <strong>YYYY-MM-DD</strong>.</li>
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── GRC TAB ──────────────────────────────────────────────────────
function GRCTab() {
  const [grcs, setGrcs] = useState([]);
  const [deliveredPOs, setDeliveredPOs] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ poNumber: '', items: [{ itemName: '', orderedQty: '', receivedQty: '', missingQty: 0, mismatchNotes: '' }], notes: '', status: 'pending' });

  const load = () => { 
    setLoad(true); 
    Promise.all([
      storeAPI.grc(),
      procAPI.orderTracking({ orderStatus: 'delivered' })
    ]).then(([r1, r2]) => {
      setGrcs(r1.data);
      setDeliveredPOs(r2.data);
    }).finally(() => setLoad(false)); 
  };
  useEffect(() => { load(); }, []);

  const addRow = () => setForm(f => ({ ...f, items: [...f.items, { itemName: '', orderedQty: '', receivedQty: '', missingQty: 0, mismatchNotes: '' }] }));
  const setRow = (i, k, v) => setForm(f => ({ ...f, items: f.items.map((it, x) => x === i ? { ...it, [k]: v, missingQty: k === 'receivedQty' ? Math.max(0, (it.orderedQty || 0) - Number(v)) : it.missingQty } : it) }));

  const handlePOChange = (e) => {
    const selPO = e.target.value;
    const poObj = deliveredPOs.find(p => p.poNumber === selPO);
    if (poObj) {
      setForm(f => ({
        ...f,
        poNumber: selPO,
        linkedPO: poObj._id,
        items: poObj.items.map(it => ({
          itemId: it.itemId,
          itemName: it.itemName,
          orderedQty: it.quantity,
          receivedQty: '',
          missingQty: it.quantity,
          mismatchNotes: ''
        }))
      }));
    } else {
      setForm(f => ({
        ...f, poNumber: selPO, linkedPO: '', items: [{ itemId: null, itemName: '', orderedQty: '', receivedQty: '', missingQty: 0, mismatchNotes: '' }]
      }));
    }
  };

  const save = async () => {
    if (!form.poNumber) return toast.error('Select a PO');
    if (!form.items[0].itemName) return toast.error('Add at least one item');
    try {
      const fd = new FormData(); fd.append('data', JSON.stringify(form));
      await storeAPI.createGRC(fd); toast.success('GRC uploaded'); load(); setModal(false);
      setForm({ poNumber: '', items: [{ itemName: '', orderedQty: '', receivedQty: '', missingQty: 0, mismatchNotes: '' }], notes: '', status: 'pending' });
    } catch (e) { toast.error('Failed'); }
  };

  const verify = async id => { await storeAPI.verifyGRC(id); toast.success('Verified'); load(); };

  const statusColor = { pending: 'var(--amber)', partial: 'var(--sky)', completed: 'var(--emerald)', disputed: 'var(--red)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center justify-between">
        <span className="text-3 text-sm">{grcs.length} GRC record(s)</span>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={13} />Upload GRC</button>
      </div>
      {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)' }}>Loading...</div> :
        grcs.length === 0 ? <Empty icon={FileText} title="No GRC records" sub="Upload a Goods Received Copy after delivery" /> :
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>PO Number</th><th>Items</th><th>Received By</th><th>Store ✓</th><th>Accounts ✓</th><th>Procurement ✓</th><th>HOD ✓</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {grcs.map(g => (
                    <tr key={g._id}>
                      <td className="font-mono" style={{ fontSize: '.8rem', color: 'var(--indigo)', fontWeight: 700 }}>{g.poNumber || '—'}</td>
                      <td className="text-sm">{g.items?.length} items</td>
                      <td className="text-sm">{g.receivedBy?.name || '—'}<br /><span className="text-xs text-3">{fmt.date(g.receivedDate)}</span></td>
                      <td>{g.verifiedByStore ? <span style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: '.8rem' }}>{g.verifiedByStore?.name || '✓'}</span> : <span style={{ color: 'var(--text-4)', fontSize: '.8rem' }}>Pending</span>}</td>
                      <td>{g.verifiedByAccounts ? <span style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: '.8rem' }}>{g.verifiedByAccounts?.name || '✓'}</span> : <span style={{ color: 'var(--text-4)', fontSize: '.8rem' }}>Pending</span>}</td>
                      <td>{g.verifiedByProcurement ? <span style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: '.8rem' }}>{g.verifiedByProcurement?.name || '✓'}</span> : <span style={{ color: 'var(--text-4)', fontSize: '.8rem' }}>Pending</span>}</td>
                      <td>{g.verifiedByHOD ? <span style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: '.8rem' }}>{g.verifiedByHOD?.name || '✓'}</span> : <span style={{ color: 'var(--text-4)', fontSize: '.8rem' }}>Pending</span>}</td>
                      <td><span style={{ background: statusColor[g.status] + '18', color: statusColor[g.status], borderRadius: 20, padding: '2px 9px', fontSize: '.72rem', fontWeight: 700 }}>{g.status}</span></td>
                      <td><button className="btn btn-ghost btn-xs" onClick={() => verify(g._id)}>Verify</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      }
      <Modal open={modal} onClose={() => setModal(false)} title="Upload Goods Received Copy" size="modal-lg"
        footer={<><button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Upload GRC</button></>}
      >
        <FG label="PO Number" required>
          <select value={form.poNumber} onChange={handlePOChange}>
            <option value="">Select Delivered PO...</option>
            {deliveredPOs.map(po => <option key={po._id} value={po.poNumber}>{po.poNumber} - {po.vendor?.shopName || 'Unknown Vendor'}</option>)}
          </select>
        </FG>
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>Items Received</label>
            <button className="btn btn-subtle btn-sm" onClick={addRow}><Plus size={12} />Add Row</button>
          </div>
          {form.items.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 0.6fr 2fr', gap: 6, marginBottom: 6 }}>
              <input placeholder="Item name" value={it.itemName} readOnly style={{ background: 'var(--bg-subtle)' }} />
              <input placeholder="Ordered" type="number" value={it.orderedQty} readOnly style={{ background: 'var(--bg-subtle)' }} />
              <input placeholder="Received" type="number" value={it.receivedQty} onChange={e => setRow(i, 'receivedQty', e.target.value)} />
              <input placeholder="Missing" type="number" value={it.missingQty} readOnly style={{ background: 'var(--bg-subtle)', color: it.missingQty > 0 ? 'var(--red)' : 'var(--text-3)' }} />
              <input placeholder="Mismatch notes" value={it.mismatchNotes} onChange={e => setRow(i, 'mismatchNotes', e.target.value)} />
            </div>
          ))}
        </div>
        <FG label="Notes"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ minHeight: 55 }} /></FG>
      </Modal>
    </div>
  );
}

const DEPT_MGR_ROLES = ['kitchen_manager','food_control','bar_manager','banquet_manager','rooms_manager','sports_manager','maintenance_manager','hr_manager','accounts_manager'];
const DEPT_ROLE_MAP  = { kitchen_manager:'kitchen', food_control:'kitchen', bar_manager:'bar', banquet_manager:'banquet', rooms_manager:'rooms', sports_manager:'sports', maintenance_manager:'maintenance', hr_manager:'hr', accounts_manager:'accounts' };

// ── INTERNAL REQUESTS TAB ────────────────────────────────────────
function InternalRequestsTab({ setTab, user }) {
  const isDeptMgr = DEPT_MGR_ROLES.includes(user?.role);
  const userDept  = user?.department || DEPT_ROLE_MAP[user?.role] || 'kitchen';

  const [reqs, setReqs] = useState([]);
  const [loading, setLoad] = useState(true);
  const [statusF, setStatusF] = useState('');
  const [deptF, setDeptF] = useState('');
  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [form, setForm] = useState({ department: userDept, priority: 'medium', items: [{ itemName: '', quantity: '', unit: 'kg', category: '' }], notes: '' });
  const [returnModal, setReturnModal] = useState(null);
  const [returnForm, setReturnForm] = useState([]);

  const load = useCallback(() => {
    setLoad(true);
    const p = {}; if (statusF) p.status = statusF;
    if (deptF) p.department = deptF;
    storeAPI.internalReqs(p).then(r => setReqs(r.data)).finally(() => setLoad(false));
  }, [statusF, deptF]);
  useEffect(() => { load(); }, [load]);

  const addRow = () => setForm(f => ({ ...f, items: [...f.items, { itemName: '', quantity: '', unit: 'kg', category: '' }] }));
  const setItem = (i, k, v) => setForm(f => ({ ...f, items: f.items.map((it, x) => x === i ? { ...it, [k]: v } : it) }));

  const save = async () => {
    if (!form.items[0].itemName) return toast.error('Add at least one item');
    try { await storeAPI.createInternalReq(form); toast.success('Request raised'); load(); setModal(false); setForm({ department: userDept, priority: 'medium', items: [{ itemName: '', quantity: '', unit: 'kg', category: '' }], notes: '' }); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const action = async (id, act, extra = {}) => {
    try { await storeAPI.updateInternalReq(id, { action: act, ...extra }); toast.success('Done'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const openReturn = r => {
    setReturnModal(r);
    setReturnForm(r.items.filter(i => i.status === 'issued' || i.status === 'approved').map(i => ({ itemId: i.itemId, itemName: i.itemName, quantity: '', unit: i.unit || '', notes: '' })));
  };

  const submitReturn = async () => {
    const items = returnForm.filter(i => parseFloat(i.quantity) > 0);
    if (!items.length) return toast.error('Enter quantities to return');
    await action(returnModal._id, 'return', { returnedItems: items });
    setReturnModal(null);
  };

  const statusColor = { pending: 'var(--amber)', approved: 'var(--emerald)', rejected: 'var(--red)', partially_approved: 'var(--sky)', issued: 'var(--indigo)', completed: 'var(--emerald)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center justify-between" style={{ gap: 8, flexWrap: 'wrap' }}>
        <div className="filter-bar">
          <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ width: 160 }}>
            <option value="">All Status</option>
            {['pending', 'approved', 'rejected', 'partially_approved', 'issued', 'completed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select value={deptF} onChange={e => setDeptF(e.target.value)} style={{ width: 160 }}>
            <option value="">All Departments</option>
            {DEPT_LIST.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={13} />Raise Request</button>
      </div>

      {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)' }}>Loading...</div> :
        reqs.length === 0 ? <Empty icon={Package} title="No internal requests" /> :
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Req #</th><th>From</th><th>Items</th><th>Priority</th><th>Status</th><th style={{ minWidth: 130 }}>Approved By (Manager/Asst.)</th><th>Issued By</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {reqs.map(r => {
                    const s = reqBadge(r.status) || { cls: 'badge-muted', label: r.status };
                    return (
                      <tr key={r._id}>
                        <td className="font-mono" style={{ color: 'var(--indigo)', fontWeight: 700, fontSize: '.8rem' }}>{r.requestNumber}</td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '.8125rem', textTransform: 'capitalize' }}>{r.department}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--text-4)' }}>{r.requestedBy?.name || '—'}</div>
                        </td>
                        <td className="text-sm text-3">{r.items?.length} items — {r.items?.slice(0, 2).map(i => i.itemName).join(', ')}{r.items?.length > 2 ? '...' : ''}</td>
                        <td><span className={`badge ${r.priority === 'urgent' ? 'badge-red' : r.priority === 'high' ? 'badge-amber' : r.priority === 'medium' ? 'badge-indigo' : 'badge-muted'}`}>{r.priority}</span></td>
                        <td>
                          <span style={{ background: statusColor[r.status] + '18', color: statusColor[r.status] || 'var(--text-3)', borderRadius: 20, padding: '2px 8px', fontSize: '.72rem', fontWeight: 700 }}>
                            {r.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-sm">{r.approvedBy ? <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>{r.approvedBy?.name}</span> : '—'}</td>
                        <td className="text-sm">{r.issuedBy ? <span style={{ fontWeight: 600, color: 'var(--indigo)' }}>{r.issuedBy?.name}</span> : '—'}</td>
                        <td className="text-sm text-3">{fmt.date(r.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setDetailModal(r)} title="View"><Eye size={13} /></button>
                            {r.status === 'pending' && <><button className="btn btn-ghost btn-xs" style={{ color: 'var(--emerald)' }} onClick={() => action(r._id, 'approve')}>Approve</button><button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => action(r._id, 'reject')}>Reject</button></>}
                            {r.status === 'approved' && <button className="btn btn-ghost btn-xs" style={{ color: 'var(--indigo)' }} onClick={() => action(r._id, 'issue')}>Issue Items</button>}
                            {(r.status === 'issued' || r.status === 'approved') && <button className="btn btn-ghost btn-xs" style={{ color: 'var(--sky)' }} onClick={() => openReturn(r)}><RotateCcw size={11} /> Return</button>}
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

      {/* Detail Modal */}
      {detailModal && (
        <Modal open size="modal-lg" onClose={() => setDetailModal(null)} title={`Request: ${detailModal.requestNumber}`}
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={() => setDetailModal(null)}>Close</button>
            <button className="btn btn-primary btn-sm" onClick={() => { setDetailModal(null); setTab('procurement'); }} title="Raise procurement for missing items">Raise Procurement</button>
          </>}
        >
          <div className="form-row cols-3">
            <div><div style={{ fontSize: '.75rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>From Dept</div><div style={{ fontWeight: 600, textTransform: 'capitalize', marginTop: 2 }}>{detailModal.department}</div></div>
            <div><div style={{ fontSize: '.75rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Raised By</div><div style={{ fontWeight: 600, marginTop: 2 }}>{detailModal.requestedBy?.name || '—'}</div></div>
            <div><div style={{ fontSize: '.75rem', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Status</div><div style={{ marginTop: 2 }}><span style={{ background: statusColor[detailModal.status] + '18', color: statusColor[detailModal.status], borderRadius: 20, padding: '2px 8px', fontSize: '.75rem', fontWeight: 700 }}>{detailModal.status?.replace('_', ' ')}</span></div></div>
          </div>
          {detailModal.approvedBy && <div style={{ padding: '8px 12px', background: 'var(--emerald-lt)', borderRadius: 8, fontSize: '.8125rem', color: 'var(--emerald)', fontWeight: 600 }}>✓ Approved by (Manager/Asst.): {detailModal.approvedBy?.name} on {fmt.date(detailModal.approvedAt)}</div>}
          {detailModal.issuedBy && <div style={{ padding: '8px 12px', background: 'var(--indigo-lt)', borderRadius: 8, fontSize: '.8125rem', color: 'var(--indigo)', fontWeight: 600 }}>📦 Items issued by: {detailModal.issuedBy?.name}</div>}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead><tr><th>Item Details</th><th>Stock & Price</th><th>Qty Req → Appr</th><th>Status</th></tr></thead>
              <tbody>
                {detailModal.items?.map((it, i) => {
                  const itemInfo = it.itemId || {};
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{it.itemName}</div>
                        <div className="text-3 text-xs" style={{ marginTop: 2 }}>
                          {itemInfo.itemType ? <span style={{ textTransform: 'capitalize', marginRight: 6 }}>{itemInfo.itemType}</span> : null}
                          {it.category || itemInfo.category || '—'}
                        </div>
                        {itemInfo.expiryDate && <div className="text-xs" style={{ marginTop: 2, color: 'var(--red)' }}>Expiry: {fmt.date(itemInfo.expiryDate)}</div>}
                        {itemInfo.lastPurchased && <div className="text-xs text-3" style={{ marginTop: 2 }}>Last Pur: {fmt.date(itemInfo.lastPurchased)}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: itemInfo.stockStatus === 'critical' ? 'var(--red)' : 'inherit' }}>{itemInfo.quantity != null ? `${itemInfo.quantity} ${itemInfo.unit || it.unit}` : 'Unknown'}</div>
                        <div className="text-3 text-xs" style={{ marginTop: 2 }}>{fmt.inr(itemInfo.unitPrice || 0)} / {itemInfo.unit || it.unit}</div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-2)' }}>{it.quantity} {it.unit}</div>
                        <div style={{ fontWeight: 600, color: 'var(--emerald)', marginTop: 2 }}>→ {it.approvedQty || it.quantity} {it.unit}</div>
                      </td>
                      <td><span className={`badge ${it.status === 'issued' ? 'badge-green' : it.status === 'approved' ? 'badge-indigo' : it.status === 'rejected' ? 'badge-red' : 'badge-muted'}`}>{it.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {detailModal.returnedItems?.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '.8125rem', marginBottom: 6 }}>Returned Items</div>
              {detailModal.returnedItems.map((r, i) => (
                <div key={i} style={{ fontSize: '.8rem', color: 'var(--text-3)', borderLeft: '2px solid var(--sky)', paddingLeft: 10, marginBottom: 4 }}>
                  {r.itemName}: {r.quantity} returned by {r.returnedBy?.name} · {fmt.ago(r.returnedAt)}
                </div>
              ))}
            </div>
          )}
          {detailModal.changeLog?.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '.8125rem', marginBottom: 6 }}>Activity Log</div>
              {detailModal.changeLog.map((l, i) => (
                <div key={i} style={{ fontSize: '.8rem', color: 'var(--text-3)', borderLeft: '2px solid var(--indigo-md)', paddingLeft: 10, marginBottom: 4 }}>
                  {l.text} <span style={{ color: 'var(--text-4)' }}>· {l.by?.name} · {fmt.ago(l.at)}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Return Modal */}
      {returnModal && (
        <Modal open onClose={() => setReturnModal(null)} title={`Return Items — ${returnModal.requestNumber}`}
          footer={<><button className="btn btn-ghost btn-sm" onClick={() => setReturnModal(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={submitReturn}>Submit Returns</button></>}
        >
          <p style={{ fontSize: '.8125rem', color: 'var(--text-3)', marginBottom: 8 }}>Enter quantities to return to store inventory.</p>
          {returnForm.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 8, marginBottom: 8, alignItems: 'end' }}>
              <FG label={i === 0 ? 'Item' : ''}><input value={it.itemName} readOnly style={{ background: 'var(--bg-subtle)' }} /></FG>
              <FG label={i === 0 ? 'Return Qty' : ''}><input type="number" min="0" value={it.quantity} onChange={e => setReturnForm(f => f.map((r, x) => x === i ? { ...r, quantity: e.target.value } : r))} /></FG>
              <FG label={i === 0 ? 'Notes' : ''}><input value={it.notes} onChange={e => setReturnForm(f => f.map((r, x) => x === i ? { ...r, notes: e.target.value } : r))} placeholder="Reason..." /></FG>
            </div>
          ))}
        </Modal>
      )}

      {/* Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Raise Internal Request" size="modal-lg"
        footer={<><button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Submit</button></>}
      >
        <div className="form-row cols-2">
          <FG label="Department" required>
            {isDeptMgr
              ? <input value={form.department} readOnly style={{ background: 'var(--bg-subtle)', textTransform: 'capitalize' }} />
              : <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>{DEPT_LIST.map(d => <option key={d} value={d}>{d}</option>)}</select>
            }
          </FG>
          <FG label="Priority"><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}</select></FG>
        </div>
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>Items Required</label>
            <button className="btn btn-subtle btn-sm" onClick={addRow}><Plus size={12} />Add</button>
          </div>
          {form.items.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 1fr', gap: 6, marginBottom: 6 }}>
              <input placeholder="Item name *" value={it.itemName} onChange={e => setItem(i, 'itemName', e.target.value)} />
              <input placeholder="Category" value={it.category} onChange={e => setItem(i, 'category', e.target.value)} />
              <input placeholder="Qty" type="number" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
              <select value={it.unit} onChange={e => setItem(i, 'unit', e.target.value)}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select>
            </div>
          ))}
        </div>
        <FG label="Notes"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ minHeight: 55 }} /></FG>
      </Modal>
    </div>
  );
}

// ── ORDER TRACKING TAB ───────────────────────────────────────────
function OrderTrackingTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoad] = useState(true);
  const [editPO, setEditPO] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [subTab, setSubTab] = useState('upcoming');

  const load = () => { setLoad(true); storeAPI.orderTracking().then(r => setOrders(r.data)).finally(() => setLoad(false)); };
  useEffect(() => { load(); }, []);

  const openEditPO = po => { setEditPO(po); setEditItems(po.items?.map(i => ({ ...i })) || []); };
  const setEItem = (i, k, v) => setEditItems(f => f.map((it, x) => x === i ? { ...it, [k]: v, totalPrice: k === 'unitPrice' || k === 'quantity' ? (parseFloat(k === 'unitPrice' ? v : it.unitPrice) || 0) * (parseFloat(k === 'quantity' ? v : it.quantity) || 0) : it.totalPrice } : it));

  const saveEditPO = async () => {
    try { await storeAPI.editPO(editPO._id, { items: editItems, notes: 'Items updated from store' }); toast.success('PO updated'); load(); setEditPO(null); }
    catch (e) { toast.error('Failed'); }
  };

  const filtered = orders.filter(o => {
    if (subTab === 'delivered' && o.orderStatus !== 'delivered') return false;
    if (subTab === 'upcoming' && o.orderStatus === 'delivered') return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center justify-between">
        <div style={{display:'flex', gap: 6, background:'var(--bg-2)', padding: 4, borderRadius: 'var(--radius)'}}>
          <button className="btn btn-sm" style={{background:subTab==='upcoming'?'var(--white)':'transparent', boxShadow:subTab==='upcoming'?'0 1px 3px rgba(0,0,0,.1)':'none', color:subTab==='upcoming'?'var(--indigo)':'var(--text-3)'}} onClick={()=>setSubTab('upcoming')}>Upcoming</button>
          <button className="btn btn-sm" style={{background:subTab==='delivered'?'var(--white)':'transparent', boxShadow:subTab==='delivered'?'0 1px 3px rgba(0,0,0,.1)':'none', color:subTab==='delivered'?'var(--emerald)':'var(--text-3)'}} onClick={()=>setSubTab('delivered')}>Delivered</button>
        </div>
        <span className="text-3 text-sm">{filtered.length} purchase order(s)</span>
      </div>
      {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)' }}>Loading...</div> :
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>PO Number</th><th>Vendor</th><th>Dept</th><th>Items</th><th>Amount</th><th>Payment</th><th>Order Status</th><th>Delivery</th><th>GRC</th><th></th></tr></thead>
              <tbody>
                {filtered.map(po => {
                  const os = orderBadge(po.orderStatus), ps = payBadge(po.paymentStatus);
                  return (
                    <tr key={po._id}>
                      <td className="font-mono" style={{ color: 'var(--indigo)', fontWeight: 700, fontSize: '.8rem' }}>{po.poNumber || '—'}</td>
                      <td className="text-sm">{po.vendor?.shopName || '—'}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: '.8125rem' }}>{po.department}</td>
                      <td className="text-sm text-3">{po.items?.length} items</td>
                      <td style={{ fontWeight: 700 }}>{fmt.inr(po.totalAmount)}</td>
                      <td><span className={`badge ${ps.cls}`}>{ps.label}</span></td>
                      <td><span className={`badge ${os.cls}`}>{os.label}</span></td>
                      <td className="text-sm text-3">{fmt.date(po.expectedDelivery)}</td>
                      <td><span className={`badge ${po.grcUploaded ? 'badge-green' : 'badge-muted'}`}>{po.grcUploaded ? '✓ Done' : 'Pending'}</span></td>
                      <td>{['approved', 'delivered'].includes(po.orderStatus) && <button className="btn btn-ghost btn-xs" onClick={() => openEditPO(po)}>Edit Items</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      }
      {editPO && (
        <Modal open size="modal-lg" onClose={() => setEditPO(null)} title={`Edit PO Items — ${editPO.poNumber}`}
          footer={<><button className="btn btn-ghost btn-sm" onClick={() => setEditPO(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={saveEditPO}>Save Changes</button></>}
        >
          <p style={{ fontSize: '.8125rem', color: 'var(--text-3)', marginBottom: 8 }}>Update received/missing quantities for mismatched items.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
            {['Item Name', 'Category', 'Qty', 'Unit', 'Unit Price', 'Status'].map(h => <div key={h} style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</div>)}
          </div>
          {editItems.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
              <input value={it.itemName} onChange={e => setEItem(i, 'itemName', e.target.value)} />
              <input value={it.category || ''} onChange={e => setEItem(i, 'category', e.target.value)} />
              <input type="number" value={it.quantity} onChange={e => setEItem(i, 'quantity', e.target.value)} />
              <input value={it.unit || ''} onChange={e => setEItem(i, 'unit', e.target.value)} />
              <input type="number" value={it.unitPrice || 0} onChange={e => setEItem(i, 'unitPrice', e.target.value)} />
              <select value={it.status || 'pending'} onChange={e => setEItem(i, 'status', e.target.value)}>
                {['pending', 'received', 'partial', 'missed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}

// ── PROCUREMENT REQUESTS TAB ──────────────────────────────────────
function ProcurementRequestsTab() {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ department: 'store', priority: 'medium', items: [{ itemName: '', quantity: '', unit: 'kg', category: '' }], notes: '' });
  const fileInputRef = React.useRef(null);

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast.success(`${file.name} attached for bulk request`);
    setForm(f => ({ ...f, notes: f.notes ? f.notes + `\n[Attached Bulk File: ${file.name}]` : `[Attached Bulk File: ${file.name}]` }));
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'Item Name,Category,Quantity,Unit\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'procurement_bulk_template.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const load = () => { setLoad(true); procAPI.requests().then(r => setReqs(r.data)).finally(() => setLoad(false)); };
  useEffect(() => { load(); }, []);

  const addRow = () => setForm(f => ({ ...f, items: [...f.items, { itemName: '', quantity: '', unit: 'kg', category: '' }] }));
  const setItem = (i, k, v) => setForm(f => ({ ...f, items: f.items.map((it, x) => x === i ? { ...it, [k]: v } : it) }));

  const save = async () => {
    if (!form.items[0].itemName) return toast.error('Add at least one item');
    try {
      await procAPI.createRequest(form);
      toast.success('Procurement request raised');
      load(); setModal(false);
      setForm({ department: 'store', priority: 'medium', items: [{ itemName: '', quantity: '', unit: 'kg', category: '' }], notes: '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const statusColor = { pending: 'var(--amber)', approved: 'var(--emerald)', rejected: 'var(--red)', po_raised: 'var(--indigo)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center justify-between">
        <span className="text-3 text-sm">{reqs.length} Procurement Request(s) across all departments</span>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={13} />Raise Store Request</button>
      </div>
      {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)' }}>Loading...</div> :
        reqs.length === 0 ? <Empty icon={FileText} title="No procurement requests" /> :
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Req #</th><th>Department</th><th>Items</th><th>Priority</th><th>Status</th><th>Raised By</th><th>Date</th></tr></thead>
                <tbody>
                  {reqs.map(r => (
                    <tr key={r._id}>
                      <td className="font-mono" style={{ color: 'var(--indigo)', fontWeight: 700, fontSize: '.8rem' }}>{r.requestNumber}</td>
                      <td style={{ textTransform: 'capitalize', fontWeight: 500, fontSize: '.8125rem' }}>{r.department}</td>
                      <td className="text-sm">{r.items?.length} items — {r.items?.slice(0,2).map(i => i.itemName).join(', ')}{r.items?.length > 2 ? '…' : ''}</td>
                      <td><span className={`badge ${r.priority === 'urgent' ? 'badge-red' : r.priority === 'high' ? 'badge-amber' : 'badge-muted'}`}>{r.priority}</span></td>
                      <td><span style={{ background: (statusColor[r.status] || 'var(--text-4)') + '18', color: statusColor[r.status], borderRadius: 20, padding: '2px 8px', fontSize: '.72rem', fontWeight: 700 }}>{r.status?.replace('_', ' ')}</span></td>
                      <td className="text-sm">{r.requestedBy?.name || '—'}</td>
                      <td className="text-sm text-3">{fmt.date(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      }
      <Modal open={modal} onClose={() => setModal(false)} title="Raise Procurement Request" size="modal-lg"
        footer={<><button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Submit Request</button></>}
      >
        <p style={{ fontSize: '.8125rem', color: 'var(--text-3)', marginBottom: 8 }}>Request bulk items or missing materials to the procurement department.</p>
        <div className="form-row cols-2">
          <FG label="Expected Delivery Date" required><input type="date" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} /></FG>
          <FG label="Priority"><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}</select></FG>
        </div>
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>Items Needed</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-subtle btn-sm" onClick={handleDownloadTemplate} type="button"><Download size={12} /> CSV Format</button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleBulkUpload} accept=".csv,.xlsx,.xls,.json,.txt" />
              <button className="btn btn-subtle btn-sm" onClick={() => fileInputRef.current?.click()} type="button"><Upload size={12} /> Bulk Upload</button>
              <button className="btn btn-subtle btn-sm" onClick={addRow} type="button"><Plus size={12} />Add Item</button>
            </div>
          </div>
          {form.items.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 1fr', gap: 6, marginBottom: 6 }}>
              <input placeholder="Item name *" value={it.itemName} onChange={e => setItem(i, 'itemName', e.target.value)} />
              <input placeholder="Category" value={it.category} onChange={e => setItem(i, 'category', e.target.value)} />
              <input placeholder="Qty" type="number" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
              <select value={it.unit} onChange={e => setItem(i, 'unit', e.target.value)}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select>
            </div>
          ))}
        </div>
        <FG label="Notes & Justification"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ minHeight: 55 }} placeholder="Reason for procurement..." /></FG>
      </Modal>
    </div>
  );
}

// ── ASSISTANTS TAB ───────────────────────────────────────────────
function AssistantsTab() {
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'store_assistant', mobile: '', department: 'store' });

  const load = useCallback(() => {
    setLoad(true);
    authAPI.users({ role: 'store_assistant' }).then(r => setAssistants(r.data)).catch(() => { toast.error('Failed to load'); }).finally(() => setLoad(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name || !form.email || (!form._id && !form.password)) return toast.error('Fill required fields');
    try {
      if (form._id) await authAPI.update(form._id, form);
      else await authAPI.create(form);
      toast.success('Assistant saved'); load(); setModal(false);
      setForm({ name: '', email: '', password: '', role: 'store_assistant', mobile: '', department: 'store' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const toggle = async (id) => {
    try { await authAPI.toggle(id); toast.success('Status updated'); load(); }
    catch (e) { toast.error('Failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center justify-between">
        <span className="text-3 text-sm">Manage your Store Assistants</span>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm({ name: '', email: '', password: '', role: 'store_assistant', mobile: '', department: 'store' }); setModal(true); }}><Plus size={13} />Add Assistant</button>
      </div>
      {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)' }}>Loading...</div> :
        assistants.length === 0 ? <Empty title="No assistants" /> :
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {assistants.map(a => (
                    <tr key={a._id} style={{ opacity: a.isActive ? 1 : 0.6 }}>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td>{a.email}</td>
                      <td>{a.mobile || '—'}</td>
                      <td><span className={`badge ${a.isActive ? 'badge-green' : 'badge-red'}`}>{a.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setForm({ ...a, password: '' }); setModal(true); }} title="Edit"><Edit2 size={13} /></button>
                          <button className="btn btn-icon btn-ghost btn-sm" onClick={() => toggle(a._id)} title={a.isActive ? 'Deactivate' : 'Activate'}><Power size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      }
      <Modal open={modal} onClose={() => setModal(false)} title={form._id ? 'Edit Assistant' : 'Add Store Assistant'}
        footer={<><button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>{form._id ? 'Update' : 'Add'}</button></>}
      >
        <div className="form-row cols-2">
          <FG label="Name" required><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></FG>
          <FG label="Email" required><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></FG>
        </div>
        <div className="form-row cols-2">
          <FG label="Mobile"><input type="tel" maxLength={10} pattern="\d{10}" onKeyPress={e=>!/[0-9]/.test(e.key)&&e.preventDefault()} value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} /></FG>
          <FG label={form._id ? 'New Password (leave blank to keep)' : 'Password'} required={!form._id}><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></FG>
        </div>
      </Modal>
    </div>
  );
}

// ── STORE PAGE ───────────────────────────────────────────────────
export default function StorePage({ defaultTab }) {
  const { user } = useAuth();
  const isDeptMgr = DEPT_MGR_ROLES.includes(user?.role);

  const allTabs = isDeptMgr
    ? [{ id: 'internal', label: 'My Department Requests' }]
    : [
        { id: 'items',       label: 'Inventory' },
        { id: 'grc',         label: 'GRC / Delivery' },
        { id: 'internal',    label: 'Internal Requests' },
        { id: 'procurement', label: 'Procurement Reqs' },
        { id: 'tracking',    label: 'Order Tracking' },
        ...(user?.role === 'store_manager' ? [{ id: 'assistants', label: 'Assistants' }] : []),
      ];

  const resolvedDefault = isDeptMgr ? 'internal' : (allTabs.find(t => t.id === defaultTab) ? defaultTab : 'items');
  const [tab, setTab] = useState(resolvedDefault);

  useEffect(() => {
    if (isDeptMgr) { setTab('internal'); return; }
    if (defaultTab) {
      const valid = allTabs.find(t => t.id === defaultTab);
      setTab(valid ? defaultTab : 'items');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTab, isDeptMgr]);

  return (
    <div className="page">
      <PageHdr icon={Package} title={isDeptMgr ? 'Store — Internal Requests' : 'Store Management'} color="var(--amber)" />
      <div style={{ padding: '0 24px', background: 'var(--white)', borderBottom: '1.5px solid var(--border)' }}>
        <Tabs tabs={allTabs} active={tab} onChange={setTab} />
      </div>
      <div className="page-body">
        {tab === 'items'       && !isDeptMgr && <ItemsTab setTab={setTab} />}
        {tab === 'grc'         && !isDeptMgr && <GRCTab setTab={setTab} />}
        {tab === 'internal'    && <InternalRequestsTab setTab={setTab} user={user} />}
        {tab === 'procurement' && !isDeptMgr && <ProcurementRequestsTab setTab={setTab} />}
        {tab === 'tracking'    && !isDeptMgr && <OrderTrackingTab setTab={setTab} />}
        {tab === 'assistants'  && user?.role === 'store_manager' && <AssistantsTab />}
      </div>
    </div>
  );
}
