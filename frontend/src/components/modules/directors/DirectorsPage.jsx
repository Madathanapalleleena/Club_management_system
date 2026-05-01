import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit2, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { dirAPI } from '../../../api';
import { fmt, deptLabel } from '../../../utils/helpers';
import { Modal, FG, PageHdr, Empty, Stat } from '../../ui';
import toast from 'react-hot-toast';

const DEPTS = ['food_committee','sports','rooms_banquets','general'];
const EMPTY = { committeeName:'', name:'', department:'food_committee', mobile:'', email:'', memberId:'', dateOfCreation: new Date().toISOString().slice(0,10), notes:'' };

const deptColor = d => ({ food_committee:'var(--amber)', sports:'var(--emerald)', rooms_banquets:'var(--sky)', general:'var(--text-3)' }[d] || 'var(--text-3)');
const deptBg    = d => ({ food_committee:'var(--amber-lt)', sports:'var(--emerald-lt)', rooms_banquets:'var(--sky-lt)', general:'var(--bg-subtle)' }[d] || 'var(--bg-subtle)');

export default function Directors() {
  const [directors, setDirs] = useState([]);
  const [loading, setLoad]   = useState(true);
  const [search, setSearch]  = useState('');
  const [filter, setFilter]  = useState('all');
  const [modal, setModal]    = useState(false);
  const [editing, setEditing]= useState(null);
  const [form, setForm]      = useState(EMPTY);
  const [saving, setSaving]  = useState(false);

  const load = useCallback(() => {
    setLoad(true);
    dirAPI.list().then(r => setDirs(r.data)).finally(() => setLoad(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = d => { setEditing(d); setForm({ ...d }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.memberId || !form.mobile) return toast.error('Fill required fields');
    setSaving(true);
    try {
      editing ? await dirAPI.update(editing._id, form) : await dirAPI.create(form);
      toast.success(editing ? 'Director updated' : 'Director created');
      load(); setModal(false);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggle = async d => {
    await dirAPI.toggle(d._id);
    toast.success(`${d.name} ${d.isActive ? 'deactivated' : 'activated'}`);
    load();
  };

  const filtered = directors.filter(d => {
    const ms = filter === 'all' || (filter === 'active' ? d.isActive : !d.isActive);
    const ss = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.memberId.toLowerCase().includes(search.toLowerCase());
    return ms && ss;
  });

  return (
    <div className="page">
      <PageHdr icon={Shield} title="Directors" color="var(--amber)">
        <div className="filter-bar">
          <div className="search-wrap">
            <span className="search-icon"><Search size={13} /></span>
            <input style={{ width:200 }} placeholder="Search directors…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <select value={filter} onChange={e=>setFilter(e.target.value)} style={{ width:120 }}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={14}/> Add Director</button>
      </PageHdr>

      {/* Dept summary bar */}
      <div style={{ padding:'10px 24px', background:'var(--white)', borderBottom:'1.5px solid var(--border)', display:'flex', gap:20, flexWrap:'wrap' }}>
        {DEPTS.map(dept => {
          const count = directors.filter(d => d.department===dept && d.isActive).length;
          return (
            <div key={dept} style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ background:deptBg(dept), color:deptColor(dept), borderRadius:20, padding:'2px 10px', fontSize:'.75rem', fontWeight:700 }}>
                {deptLabel(dept)}
              </span>
              <span style={{ fontWeight:800, fontSize:'.875rem' }}>{count}</span>
              <span style={{ fontSize:'.75rem', color:'var(--text-4)' }}>active</span>
            </div>
          );
        })}
        <div style={{ marginLeft:'auto', fontSize:'.8125rem', color:'var(--text-4)' }}>
          {filtered.length} of {directors.length} shown
        </div>
      </div>

      <div className="page-body">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--text-4)'}}>Loading…</div> :
          filtered.length === 0 ? <Empty icon={Shield} title="No directors found" sub="Add a director to get started" action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={12}/>Add Director</button>} /> :
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member ID</th><th>Director Name</th><th>Committee</th>
                    <th>Department</th><th>Contact</th><th>Created</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d._id}>
                      <td className="font-mono" style={{ color:'var(--indigo)', fontSize:'.8rem', fontWeight:700 }}>{d.memberId}</td>
                      <td style={{ fontWeight:600 }}>{d.name}</td>
                      <td className="text-sm text-3">{d.committeeName}</td>
                      <td>
                        <span style={{ background:deptBg(d.department), color:deptColor(d.department), borderRadius:20, padding:'2px 10px', fontSize:'.75rem', fontWeight:700 }}>
                          {deptLabel(d.department)}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize:'.8125rem', fontWeight:500 }}>{d.mobile}</div>
                        <div style={{ fontSize:'.72rem', color:'var(--text-4)' }}>{d.email}</div>
                      </td>
                      <td className="text-sm text-3">{fmt.date(d.dateOfCreation)}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <div className={`dot ${d.isActive?'dot-green':'dot-red'}`} />
                          <span style={{ fontSize:'.8125rem', color:d.isActive?'var(--emerald)':'var(--text-4)', fontWeight:500 }}>
                            {d.isActive?'Active':'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>openEdit(d)} title="Edit"><Edit2 size={13}/></button>
                          <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>toggle(d)} title={d.isActive?'Deactivate':'Activate'}
                            style={{ color: d.isActive?'var(--amber)':'var(--emerald)' }}>
                            {d.isActive ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editing?'Edit Director':'Add Director'}
        footer={<>
          <button className="btn btn-ghost btn-sm" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving?'Saving…':editing?'Update':'Create'}
          </button>
        </>}
      >
        <div className="form-row cols-2">
          <FG label="Committee Name" required><input value={form.committeeName} onChange={e=>setForm({...form,committeeName:e.target.value})} placeholder="Executive Committee" /></FG>
          <FG label="Member ID" required><input value={form.memberId} onChange={e=>setForm({...form,memberId:e.target.value})} placeholder="DIR001" /></FG>
        </div>
        <FG label="Director Name" required><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full name" /></FG>
        <div className="form-row cols-2">
          <FG label="Department" required>
            <select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>
              {DEPTS.map(d=><option key={d} value={d}>{deptLabel(d)}</option>)}
            </select>
          </FG>
          <FG label="Mobile" required><input type="tel" maxLength={10} pattern="\d{10}" onKeyPress={e=>!/[0-9]/.test(e.key)&&e.preventDefault()} value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} placeholder="9876543210" /></FG>
        </div>
        <div className="form-row cols-2">
          <FG label="Email (Optional)"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="director@example.com" /></FG>
          <FG label="Date of Creation" required><input type="date" value={form.dateOfCreation} onChange={e=>setForm({...form,dateOfCreation:e.target.value})} /></FG>
        </div>
      </Modal>
    </div>
  );
}
