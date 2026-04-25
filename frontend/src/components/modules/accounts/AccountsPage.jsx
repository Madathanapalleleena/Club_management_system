import React, { useState, useEffect } from 'react';
import { Calculator, Plus } from 'lucide-react';
import { finAPI } from '../../../api';
import { fmt } from '../../../utils/helpers';
import { Modal, FG, PageHdr, Tabs, ChartTip } from '../../ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const DEPTS  = ['restaurant','bar','rooms','banquet','sports','kitchen','store','maintenance'];
const PMODES = ['cash','card','upi','credit'];

function PnLTab() {
  const [pnl, setPnl]       = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoad]  = useState(true);

  useEffect(()=>{
    Promise.all([finAPI.pnl(),finAPI.monthly()])
      .then(([p,m])=>{setPnl(p.data);setMonthly(m.data);}).finally(()=>setLoad(false));
  },[]);

  const totR = monthly.reduce((s,m)=>s+m.sales,0);
  const totE = monthly.reduce((s,m)=>s+m.expenses,0);

  if(loading) return <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading…</div>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value" style={{color:'var(--sky)'}}>{fmt.inr(totR)}</div><div className="stat-sub">6 months, all depts</div></div>
        <div className="stat-card"><div className="stat-label">Total Expenses</div><div className="stat-value" style={{color:'var(--amber)'}}>{fmt.inr(totE)}</div><div className="stat-sub">6 months, all depts</div></div>
        <div className="stat-card"><div className="stat-label">Net Profit</div><div className="stat-value" style={{color:(totR-totE)>=0?'var(--emerald)':'var(--red)'}}>{fmt.inr(totR-totE)}</div><div className="stat-sub">{(totR-totE)>=0?'Surplus':'Deficit'}</div></div>
      </div>

      <div className="card">
        <h3 style={{marginBottom:12}}>Monthly Overview</h3>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={monthly} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill:'var(--text-3)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1e5).toFixed(0)}L`} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{fontSize:'.8125rem'}} />
            <Bar dataKey="sales"    name="Revenue"  fill="#1e40af" radius={[4,4,0,0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4,4,0,0]} />
            <Bar dataKey="profit"   name="Profit"   fill="#059669" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:'1.5px solid var(--border)'}}><h3>Department P&L</h3></div>
        <table>
          <thead><tr><th>Department</th><th>Revenue</th><th>Expenses</th><th>Profit / Loss</th><th>Margin</th></tr></thead>
          <tbody>
            {pnl.sort((a,b)=>b.profit-a.profit).map(d=>{
              const margin = d.sales>0?(d.profit/d.sales*100):0;
              return (
                <tr key={d.department}>
                  <td style={{fontWeight:600,textTransform:'capitalize'}}>{d.department}</td>
                  <td style={{color:'var(--sky)',fontWeight:700}}>{fmt.inr(d.sales)}</td>
                  <td style={{color:'var(--amber)',fontWeight:700}}>{fmt.inr(d.expenses)}</td>
                  <td style={{fontWeight:800,color:d.profit>=0?'var(--emerald)':'var(--red)'}}>{d.profit>=0?'+':''}{fmt.inr(d.profit)}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="progress-bar" style={{flex:1}}>
                        <div className="progress-fill" style={{width:`${Math.min(Math.abs(margin),100)}%`,background:d.profit>=0?'var(--emerald)':'var(--red)'}} />
                      </div>
                      <span style={{fontSize:'.8rem',fontWeight:700,color:d.profit>=0?'var(--emerald)':'var(--red)',minWidth:44}}>{margin.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesTab() {
  const [sales, setSales] = useState([]);
  const [modal, setModal] = useState(false);
  const [loading, setLoad]= useState(true);
  const [form, setForm]   = useState({ department:'restaurant',category:'',date:new Date().toISOString().slice(0,10),amount:'',description:'',paymentMode:'cash',invoiceNumber:'' });

  const load = () => { setLoad(true); finAPI.sales().then(r=>setSales(r.data)).finally(()=>setLoad(false)); };
  useEffect(()=>{load();},[]);

  const save = async () => {
    if(!form.amount||!form.date||!form.category) return toast.error('Fill required fields');
    try { await finAPI.createSale(form); toast.success('Sale recorded'); load(); setModal(false); }
    catch(e) { toast.error('Failed'); }
  };

  const today = sales.filter(s=>new Date(s.date).toDateString()===new Date().toDateString()).reduce((t,s)=>t+s.amount,0);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div className="flex items-center justify-between" style={{flexWrap:'wrap',gap:8}}>
        <span className="text-sm" style={{color:'var(--text-3)'}}>Today: <strong style={{color:'var(--emerald)'}}>{fmt.inr(today)}</strong></span>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={13}/>Record Sale</button>
      </div>
      {loading ? <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading…</div> :
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Department</th><th>Amount</th><th>Mode</th><th>Invoice</th><th>Description</th></tr></thead>
              <tbody>
                {sales.slice(0,50).map(s=>(
                  <tr key={s._id}>
                    <td className="text-sm">{fmt.date(s.date)}</td>
                    <td style={{textTransform:'capitalize'}}>{s.department}</td>
                    <td style={{fontWeight:800,color:'var(--emerald)'}}>{fmt.inr(s.amount)}</td>
                    <td><span className="badge badge-indigo">{s.paymentMode}</span></td>
                    <td className="font-mono text-3" style={{fontSize:'.75rem'}}>{s.invoiceNumber||'—'}</td>
                    <td className="text-sm text-3">{s.description||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="Record Sale"
        footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-success btn-sm" onClick={save}>Record</button></>}
      >
        <div className="form-row cols-2">
          <FG label="Department" required>
            <select value={form.department} onChange={e=>setForm({...form,department:e.target.value,category:''})}>
              {DEPTS.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
            </select>
          </FG>
          <FG label="Category / Source" required>
            <input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}
              placeholder={form.department==='restaurant'?'e.g. Lunch, Dinner, Events':form.department==='bar'?'e.g. Liquor, Beverages':'e.g. Hall Booking, Events'} />
          </FG>
        </div>
        <FG label="Date" required><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></FG>
        <div className="form-row cols-2">
          <FG label="Amount (₹)" required><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" /></FG>
          <FG label="Payment Mode">
            <select value={form.paymentMode} onChange={e=>setForm({...form,paymentMode:e.target.value})}>
              {PMODES.map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </FG>
        </div>
        <FG label="Invoice Number"><input value={form.invoiceNumber} onChange={e=>setForm({...form,invoiceNumber:e.target.value})} placeholder="INV-001" /></FG>
        <FG label="Description"><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></FG>
      </Modal>
    </div>
  );
}

function ExpensesTab() {
  const [expenses, setExp] = useState([]);
  const [modal, setModal]  = useState(false);
  const [loading, setLoad] = useState(true);
  const [form, setForm]    = useState({ department:'kitchen',category:'purchase',date:new Date().toISOString().slice(0,10),amount:'',description:'',expenseType:'purchase' });

  const load = () => { setLoad(true); finAPI.expenses().then(r=>setExp(r.data)).finally(()=>setLoad(false)); };
  useEffect(()=>{load();},[]);

  const save = async () => {
    if(!form.amount) return toast.error('Amount required');
    try { await finAPI.createExp(form); toast.success('Expense recorded'); load(); setModal(false); }
    catch(e) { toast.error('Failed'); }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div className="flex items-center justify-between">
        <span className="text-3 text-sm">{expenses.length} expense record(s)</span>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}><Plus size={13}/>Add Expense</button>
      </div>
      {loading ? <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading…</div> :
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Department</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead>
              <tbody>
                {expenses.slice(0,50).map(e=>(
                  <tr key={e._id}>
                    <td className="text-sm">{fmt.date(e.date)}</td>
                    <td style={{textTransform:'capitalize'}}>{e.department}</td>
                    <td><span className="badge badge-amber" style={{textTransform:'capitalize'}}>{e.expenseType}</span></td>
                    <td style={{fontWeight:800,color:'var(--red)'}}>{fmt.inr(e.amount)}</td>
                    <td className="text-sm text-3">{e.description||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="Record Expense"
        footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-danger btn-sm" onClick={save}>Record</button></>}
      >
        <div className="form-row cols-2">
          <FG label="Department" required>
            <select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>
              {DEPTS.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
            </select>
          </FG>
          <FG label="Expense Type">
            <select value={form.expenseType} onChange={e=>setForm({...form,expenseType:e.target.value})}>
              {['purchase','salary','maintenance','utilities','other'].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </FG>
        </div>
        <div className="form-row cols-2">
          <FG label="Amount (₹)" required><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} /></FG>
          <FG label="Date" required><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></FG>
        </div>
        <FG label="Description"><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></FG>
      </Modal>
    </div>
  );
}

export default function AccountsPage() {
  const [tab, setTab] = useState('pnl');
  return (
    <div className="page">
      <PageHdr icon={Calculator} title="Accounts" color="var(--sky)" />
      <div style={{padding:'0 24px',background:'var(--white)',borderBottom:'1.5px solid var(--border)'}}>
        <Tabs tabs={[{id:'pnl',label:'P&L Overview'},{id:'sales',label:'Sales'},{id:'expenses',label:'Expenses'}]} active={tab} onChange={setTab} />
      </div>
      <div className="page-body">
        {tab==='pnl'      && <PnLTab />}
        {tab==='sales'    && <SalesTab />}
        {tab==='expenses' && <ExpensesTab />}
      </div>
    </div>
  );
}
