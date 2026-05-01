import React, { useState, useEffect, useCallback } from 'react';
import { UserCog, Plus, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { hrAPI, authAPI } from '../../../api';
import { fmt, roleLabel, roleColor, roleBg, initials, deptLabel } from '../../../utils/helpers';
import { Modal, FG, PageHdr, Empty, Avatar } from '../../ui';
import toast from 'react-hot-toast';

const ALL_ROLES = [
  'gm','agm','procurement_manager','procurement_assistant','store_manager','store_assistant',
  'kitchen_manager','food_control','banquet_manager','rooms_manager','bar_manager',
  'sports_manager','hr_manager','accounts_manager','maintenance_manager','staff',
];
const DEPTS = ['management','procurement','store','kitchen','bar','restaurant','rooms','banquet','sports','accounts','hr','maintenance'];

export default function HRPage() {
  const [staff, setStaff]    = useState([]);
  const [loading, setLoad]   = useState(true);
  const [search, setSearch]  = useState('');
  const [deptF, setDeptF]    = useState('');
  const [modal, setModal]    = useState(false);
  const [form, setForm]      = useState({ name:'', email:'', password:'', role:'staff', department:'', mobile:'' });
  const [saving, setSaving]  = useState(false);

  const load = useCallback(() => {
    setLoad(true);
    const p = {};
    if (deptF) p.department = deptF;
    hrAPI.staff(p).then(r=>setStaff(r.data)).finally(()=>setLoad(false));
  }, [deptF]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name||!form.email||!form.password) return toast.error('Fill required fields');
    setSaving(true);
    try {
      await authAPI.register(form);
      toast.success('Staff member created');
      load(); setModal(false);
      setForm({ name:'',email:'',password:'',role:'staff',department:'',mobile:'' });
    } catch(e) { toast.error(e.response?.data?.message||'Failed'); }
    finally { setSaving(false); }
  };

  const toggle = async m => {
    await hrAPI.toggle(m._id);
    toast.success(`${m.name} ${m.isActive?'deactivated':'activated'}`);
    load();
  };

  const filtered = staff.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = staff.filter(s=>s.isActive).length;
  const inactiveCount = staff.filter(s=>!s.isActive).length;
  const managerCount  = staff.filter(s=>s.role.includes('manager')||['gm','agm'].includes(s.role)).length;

  return (
    <div className="page">
      <PageHdr icon={UserCog} title="HR & Staff" color="var(--violet)">
        <div className="filter-bar">
          <div className="search-wrap">
            <span className="search-icon"><Search size={13}/></span>
            <input style={{width:200}} placeholder="Search staff…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <select value={deptF} onChange={e=>setDeptF(e.target.value)} style={{width:150}}>
            <option value="">All Departments</option>
            {DEPTS.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}><Plus size={14}/> Add Staff</button>
      </PageHdr>

      {/* Summary */}
      <div style={{ padding:'10px 24px', background:'var(--white)', borderBottom:'1.5px solid var(--border)', display:'flex', gap:20 }}>
        {[
          { label:'Total', value:staff.length, color:'var(--text-1)' },
          { label:'Active', value:activeCount, color:'var(--emerald)' },
          { label:'Inactive', value:inactiveCount, color:'var(--red)' },
          { label:'Managers', value:managerCount, color:'var(--indigo)' },
        ].map(s=>(
          <div key={s.label} style={{fontSize:'.8125rem'}}>
            <span style={{color:'var(--text-4)'}}>{s.label}: </span>
            <strong style={{color:s.color}}>{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="page-body">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--text-4)'}}>Loading…</div> :
          filtered.length===0 ? <Empty icon={UserCog} title="No staff found" sub="Add your first staff member" action={<button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={12}/>Add Staff</button>} /> :
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Staff Member</th><th>Role</th><th>Department</th><th>Mobile</th><th>Last Login</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m._id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{ width:32,height:32,borderRadius:8,background:roleBg(m.role),color:roleColor(m.role),display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.7rem',fontWeight:800,flexShrink:0 }}>
                            {initials(m.name)}
                          </div>
                          <div>
                            <div style={{fontWeight:600,fontSize:'.875rem'}}>{m.name}</div>
                            <div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{background:roleBg(m.role),color:roleColor(m.role),borderRadius:20,padding:'2px 9px',fontSize:'.75rem',fontWeight:700}}>
                          {roleLabel(m.role)}
                        </span>
                      </td>
                      <td style={{textTransform:'capitalize',fontSize:'.875rem'}}>{m.department||'—'}</td>
                      <td className="text-sm text-3">{m.mobile||'—'}</td>
                      <td className="text-sm text-3">{m.lastLogin?fmt.ago(m.lastLogin):'Never'}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <div className={`dot ${m.isActive?'dot-green':'dot-red'}`} />
                          <span style={{fontSize:'.8125rem',color:m.isActive?'var(--emerald)':'var(--text-4)',fontWeight:500}}>
                            {m.isActive?'Active':'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>toggle(m)} title={m.isActive?'Deactivate':'Activate'} style={{color:m.isActive?'var(--amber)':'var(--emerald)'}}>
                          {m.isActive?<ToggleRight size={15}/>:<ToggleLeft size={15}/>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Add Staff Member"
        footer={<>
          <button className="btn btn-ghost btn-sm" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>{saving?'Creating…':'Create'}</button>
        </>}
      >
        <div className="form-row cols-2">
          <FG label="Full Name" required><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></FG>
          <FG label="Mobile"><input type="tel" maxLength={10} pattern="\d{10}" onKeyPress={e=>!/[0-9]/.test(e.key)&&e.preventDefault()} value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} placeholder="10-digit number" /></FG>
        </div>
        <FG label="Email Address" required><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></FG>
        <FG label="Password" required><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 8 characters" /></FG>
        <div className="form-row cols-2">
          <FG label="Role" required>
            <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              {ALL_ROLES.map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </FG>
          <FG label="Department">
            <select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>
              <option value="">Select department</option>
              {DEPTS.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
            </select>
          </FG>
        </div>
      </Modal>
    </div>
  );
}
