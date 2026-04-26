import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, Plus, CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { finAPI, procAPI } from '../../../api';
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

const payBadge = s => ({ pending:{cls:'badge-amber',label:'Pending'}, advance:{cls:'badge-indigo',label:'Advance'}, paid:{cls:'badge-green',label:'Paid'}, stopped:{cls:'badge-red',label:'Stopped'} }[s]||{cls:'',label:s});
const instBadge= s => ({ pending:{cls:'badge-amber',label:'Pending'}, paid:{cls:'badge-green',label:'Paid'}, overdue:{cls:'badge-red',label:'Overdue'} }[s]||{cls:'',label:s});
const PAY_MODES= ['cash','upi','card','cheque','online'];
const FREQ     = ['monthly','weekly'];

// ── Installment schedule calculator ──────────────────────────────
function calcSchedule(total, n, rate, startDate, freq) {
  const p = parseFloat(total)||0;
  const weeks = freq==='weekly' ? n : n; // n installments
  const interest = freq==='monthly'
    ? (p * parseFloat(rate||0) * n) / 1200
    : (p * parseFloat(rate||0) * n) / 5200;
  const totalPayable = p + interest;
  const emi = Math.round((totalPayable/n)*100)/100;
  const schedule = [];
  const start = new Date(startDate);
  for(let i=0;i<n;i++){
    const d = new Date(start);
    freq==='monthly' ? d.setMonth(d.getMonth()+i) : d.setDate(d.getDate()+(i*7));
    schedule.push({ installmentNumber:i+1, amount:emi, dueDate:d.toISOString().slice(0,10), status:'pending' });
  }
  return { schedule, interest:Math.round(interest*100)/100, totalPayable:Math.round(totalPayable*100)/100, emi };
}

function POPaymentsTab() {
  const [orders,   setOrders]  = useState([]);
  const [loading,  setLoad]    = useState(true);
  const [filter,   setFilter]  = useState('unpaid');

  // Payment plan modal
  const [planModal, setPlanModal] = useState(null);
  const [planForm,  setPlanForm]  = useState({ paymentType:'full', advanceAmount:'', interestRate:'0', numInstallments:'3', amountPerInst:'', startDate:new Date().toISOString().slice(0,10), frequency:'monthly', paymentMode:'cash' });
  const [schedule,  setSchedule]  = useState(null);

  // Mark paid / advance modal
  const [payModal, setPayModal] = useState(null);
  const [payForm,  setPayForm]  = useState({ paymentMode:'cash', note:'' });

  // Installment pay modal
  const [instModal, setInstModal] = useState(null); // { po, inst }
  const [instForm,  setInstForm]  = useState({ paymentMode:'cash', note:'' });

  const load = useCallback(()=>{
    setLoad(true);
    procAPI.pos().then(r=>setOrders(r.data)).finally(()=>setLoad(false));
  },[]);
  useEffect(()=>{ load(); },[load]);

  // Recalculate schedule whenever installment params change
  useEffect(()=>{
    if(planModal && planForm.paymentType==='installment' && planForm.numInstallments && planForm.startDate) {
      const total = planModal.totalAmount - (parseFloat(planForm.advanceAmount)||0);
      const res   = calcSchedule(total, parseInt(planForm.numInstallments), planForm.interestRate, planForm.startDate, planForm.frequency);
      setSchedule(res);
    } else setSchedule(null);
  },[planForm.paymentType, planForm.numInstallments, planForm.interestRate, planForm.startDate, planForm.frequency, planForm.advanceAmount, planModal]);

  const savePlan = async () => {
    try {
      const payload = { paymentType: planForm.paymentType, paymentMode: planForm.paymentMode, interestRate: parseFloat(planForm.interestRate)||0 };
      if(planForm.paymentType==='advance') payload.advanceAmount = parseFloat(planForm.advanceAmount)||0;
      if(planForm.paymentType==='installment') {
        if(!schedule) return toast.error('Configure installment schedule');
        payload.installments = schedule.schedule;
        if(parseFloat(planForm.advanceAmount)>0) { payload.advanceAmount=parseFloat(planForm.advanceAmount); payload.paymentType='installment'; }
      }
      await procAPI.setPaymentPlan(planModal._id, payload);
      toast.success('Payment plan saved — GM/AGM notified');
      load(); setPlanModal(null);
    } catch(e){ toast.error(e.response?.data?.message||'Failed'); }
  };

  const markPaid = async () => {
    try {
      await procAPI.markPaid(payModal._id, payForm);
      toast.success('Marked as fully paid');
      load(); setPayModal(null);
    } catch(e){ toast.error(e.response?.data?.message||'GRC required before final payment'); }
  };

  const payInstallment = async () => {
    try {
      await procAPI.payInstallment(instModal.po._id, { installmentId: instModal.inst._id, ...instForm });
      toast.success(`Installment #${instModal.inst.installmentNumber} paid`);
      load(); setInstModal(null);
    } catch(e){ toast.error(e.response?.data?.message||'Failed'); }
  };

  const visible = orders.filter(o=>{
    if(filter==='unpaid')  return o.paymentStatus!=='paid' && o.orderStatus!=='cancelled';
    if(filter==='advance') return o.paymentType==='advance' && o.paymentStatus!=='paid';
    if(filter==='installment') return o.paymentType==='installment' && o.paymentStatus!=='paid';
    return o.orderStatus!=='cancelled';
  });

  const totalDue     = orders.filter(o=>o.paymentStatus!=='paid'&&o.orderStatus!=='cancelled').reduce((s,o)=>s+(o.balanceAmount||0),0);
  const overdueInsts = orders.flatMap(o=>(o.installments||[]).filter(i=>i.status==='overdue'));
  const advanceDue   = orders.filter(o=>o.paymentType==='advance'&&o.paymentStatus==='pending'&&o.orderStatus==='approved');

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* Alerts */}
      {advanceDue.length>0 && (
        <div style={{background:'var(--red-lt)',border:'2px solid var(--red)',borderRadius:'var(--radius)',padding:'10px 16px',display:'flex',alignItems:'center',gap:10}}>
          <AlertTriangle size={18} style={{color:'var(--red)',flexShrink:0}}/>
          <span style={{fontWeight:700,color:'var(--red)',fontSize:'.875rem'}}>🚨 {advanceDue.length} advance payment(s) pending — pay immediately to proceed with order</span>
        </div>
      )}
      {overdueInsts.length>0 && (
        <div style={{background:'#fff7ed',border:'2px solid var(--amber)',borderRadius:'var(--radius)',padding:'10px 16px',display:'flex',alignItems:'center',gap:10}}>
          <Clock size={18} style={{color:'var(--amber)',flexShrink:0}}/>
          <span style={{fontWeight:700,color:'var(--amber)',fontSize:'.875rem'}}>⚠ {overdueInsts.length} installment(s) overdue</span>
        </div>
      )}

      <div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        <div className="stat-card"><div className="stat-label">Total Due</div><div className="stat-value" style={{color:'var(--red)'}}>{fmt.inr(totalDue)}</div></div>
        <div className="stat-card"><div className="stat-label">Advance Pending</div><div className="stat-value" style={{color:'var(--amber)'}}>{advanceDue.length}</div></div>
        <div className="stat-card"><div className="stat-label">Overdue Installments</div><div className="stat-value" style={{color:'var(--red)'}}>{overdueInsts.length}</div></div>
        <div className="stat-card"><div className="stat-label">No Plan Set</div><div className="stat-value" style={{color:'var(--text-3)'}}>{orders.filter(o=>!o.paymentPlanSetBy&&o.orderStatus!=='cancelled'&&o.paymentStatus!=='paid').length}</div><div className="stat-sub">Needs payment plan</div></div>
      </div>

      <div className="flex items-center justify-between" style={{gap:8}}>
        <div style={{display:'flex',gap:6}}>
          {[['unpaid','Unpaid'],['advance','Advance'],['installment','Installment'],['all','All']].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} className="btn btn-sm"
              style={{background:filter===v?'var(--indigo)':'transparent',color:filter===v?'#fff':'var(--indigo)',border:'1.5px solid var(--indigo)'}}>
              {l}
            </button>
          ))}
        </div>
        <span className="text-sm" style={{color:'var(--text-3)'}}>{visible.length} PO(s)</span>
      </div>

      {loading ? <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading…</div> :
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {visible.length===0 && <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>No POs found</div>}
          {visible.map(po=>{
            const pb = payBadge(po.paymentStatus);
            const hasGRC = po.grcUploaded;
            const planSet = !!po.paymentPlanSetBy;
            const isAdvancePO = po.paymentType==='advance';
            const isInstPO    = po.paymentType==='installment';
            return (
              <div key={po._id} className="card" style={{padding:'14px 18px'}}>
                {/* PO Header */}
                <div className="flex items-center justify-between" style={{marginBottom:10,flexWrap:'wrap',gap:8}}>
                  <div>
                    <span style={{fontFamily:'monospace',fontWeight:800,color:'var(--indigo)',fontSize:'.9rem'}}>{po.poNumber}</span>
                    <span style={{marginLeft:10,textTransform:'capitalize',fontSize:'.8rem',color:'var(--text-3)'}}>{po.department} · {po.vendor?.shopName||'—'}</span>
                    {isAdvancePO && po.paymentStatus==='pending' && po.orderStatus==='approved' && (
                      <span style={{marginLeft:8,background:'var(--red)',color:'#fff',fontSize:'.7rem',fontWeight:800,padding:'2px 8px',borderRadius:20}}>🚨 ADVANCE DUE</span>
                    )}
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                    <span className={'badge '+pb.cls}>{pb.label}</span>
                    <span style={{fontSize:'.75rem',color:hasGRC?'var(--emerald)':'var(--text-4)',fontWeight:600}}>{hasGRC?'✓ GRC':'No GRC'}</span>
                    {!planSet && po.paymentStatus!=='paid' && (
                      <button className="btn btn-primary btn-xs" onClick={()=>{setPlanModal(po);setPlanForm(f=>({...f,startDate:new Date().toISOString().slice(0,10)}));}}>
                        Set Payment Plan
                      </button>
                    )}
                  </div>
                </div>

                {/* Amounts row */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
                  {[['Total',fmt.inr(po.totalAmount),'var(--sky)'],['Advance Paid',fmt.inr(po.advanceAmount||0),'var(--indigo)'],['Balance Due',fmt.inr(po.balanceAmount||0),po.balanceAmount>0?'var(--red)':'var(--emerald)'],['Payment Type',po.paymentType||'full','var(--text-2)']].map(([l,v,c])=>(
                    <div key={l} style={{background:'var(--bg-2)',padding:'8px 12px',borderRadius:'var(--radius)'}}>
                      <div style={{fontSize:'.72rem',color:'var(--text-4)',fontWeight:600}}>{l}</div>
                      <div style={{fontSize:'.9rem',fontWeight:800,color:c,textTransform:'capitalize'}}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Installments table */}
                {isInstPO && po.installments?.length>0 && (
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:'.8rem',fontWeight:700,marginBottom:6,color:'var(--text-2)'}}>Installment Schedule</div>
                    <table style={{width:'100%',fontSize:'.8125rem'}}>
                      <thead><tr style={{background:'var(--bg-2)'}}><th style={{padding:'4px 8px',textAlign:'left'}}>#</th><th style={{padding:'4px 8px',textAlign:'left'}}>Due Date</th><th style={{padding:'4px 8px',textAlign:'right'}}>Amount</th><th style={{padding:'4px 8px',textAlign:'left'}}>Status</th><th style={{padding:'4px 8px'}}></th></tr></thead>
                      <tbody>
                        {po.installments.map(inst=>{
                          const ib=instBadge(inst.status);
                          const isOverdue=inst.status==='overdue';
                          return (
                            <tr key={inst._id} style={{borderBottom:'1px solid var(--border)',background:isOverdue?'var(--red-lt)':''}}>
                              <td style={{padding:'4px 8px',fontWeight:700}}>#{inst.installmentNumber}</td>
                              <td style={{padding:'4px 8px',color:isOverdue?'var(--red)':'inherit',fontWeight:isOverdue?700:400}}>{fmt.date(inst.dueDate)}</td>
                              <td style={{padding:'4px 8px',textAlign:'right',fontWeight:700}}>{fmt.inr(inst.amount)}</td>
                              <td style={{padding:'4px 8px'}}><span className={'badge '+ib.cls}>{ib.label}</span></td>
                              <td style={{padding:'4px 8px',textAlign:'right'}}>
                                {inst.status!=='paid' && (
                                  <button className="btn btn-primary btn-xs" onClick={()=>{setInstModal({po,inst});setInstForm({paymentMode:'cash',note:''});}}>
                                    Pay
                                  </button>
                                )}
                                {inst.status==='paid' && <span style={{color:'var(--emerald)',fontSize:'.75rem'}}>✓ {fmt.date(inst.paidOn)}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap'}}>
                  {isAdvancePO && po.paymentStatus==='pending' && po.orderStatus==='approved' && (
                    <button className="btn btn-danger btn-sm" onClick={()=>{setPayModal({...po,_action:'advance'});setPayForm({paymentMode:'cash',note:''});}}>
                      <CreditCard size={13}/> Pay Advance ₹{fmt.inr(po.advanceAmount||0)}
                    </button>
                  )}
                  {!isInstPO && hasGRC && po.paymentStatus!=='paid' && (
                    <button className="btn btn-success btn-sm" onClick={()=>{setPayModal({...po,_action:'full'});setPayForm({paymentMode:'cash',note:''});}}>
                      <CheckCircle size={13}/> Mark Fully Paid
                    </button>
                  )}
                  {!isInstPO && !hasGRC && po.paymentStatus!=='paid' && po.paymentType!=='advance' && (
                    <span style={{fontSize:'.75rem',color:'var(--text-4)',padding:'6px 10px'}}>Awaiting GRC before payment</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      }

      {/* Payment Plan Modal */}
      {planModal && (
        <Modal open onClose={()=>setPlanModal(null)} title={`Set Payment Plan — ${planModal.poNumber}`} size="modal-xl"
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setPlanModal(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={savePlan}>Save Plan</button></>}>
          <div style={{padding:'10px 14px',background:'var(--bg-2)',borderRadius:'var(--radius)',marginBottom:12,fontSize:'.875rem'}}>
            Vendor: <strong>{planModal.vendor?.shopName||'—'}</strong> &nbsp;|&nbsp; Total: <strong style={{color:'var(--sky)'}}>{fmt.inr(planModal.totalAmount)}</strong>
          </div>
          <FG label="Payment Type">
            <div style={{display:'flex',gap:8}}>
              {[['full','Full (after GRC)'],['advance','Advance Required'],['installment','Installments / EMI']].map(([v,l])=>(
                <button key={v} onClick={()=>setPlanForm(f=>({...f,paymentType:v}))} className="btn btn-sm"
                  style={{flex:1,justifyContent:'center',background:planForm.paymentType===v?'var(--indigo)':'transparent',color:planForm.paymentType===v?'#fff':'var(--indigo)',border:'1.5px solid var(--indigo)'}}>
                  {l}
                </button>
              ))}
            </div>
          </FG>
          {planForm.paymentType==='advance' && (
            <FG label="Advance Amount (₹)" required>
              <input type="number" min="0" max={planModal.totalAmount} value={planForm.advanceAmount}
                onChange={e=>setPlanForm(f=>({...f,advanceAmount:e.target.value}))} placeholder="Amount to pay upfront"/>
            </FG>
          )}
          {planForm.paymentType==='installment' && (<>
            <div style={{padding:'8px 12px',background:'var(--indigo-lt)',borderRadius:'var(--radius)',fontSize:'.8125rem',color:'var(--indigo)',marginBottom:8}}>
              Interest is applied on the PO total. System auto-generates the full schedule.
            </div>
            <div className="form-row cols-2">
              <FG label="Advance / Down Payment (₹) — optional">
                <input type="number" min="0" value={planForm.advanceAmount} onChange={e=>setPlanForm(f=>({...f,advanceAmount:e.target.value}))} placeholder="0"/>
              </FG>
              <FG label="Interest Rate (% per annum)">
                <input type="number" min="0" step="0.1" value={planForm.interestRate} onChange={e=>setPlanForm(f=>({...f,interestRate:e.target.value}))} placeholder="0"/>
              </FG>
            </div>
            <div className="form-row cols-3">
              <FG label="No. of Installments">
                <input type="number" min="1" max="60" value={planForm.numInstallments} onChange={e=>setPlanForm(f=>({...f,numInstallments:e.target.value}))} placeholder="3"/>
              </FG>
              <FG label="Frequency">
                <select value={planForm.frequency} onChange={e=>setPlanForm(f=>({...f,frequency:e.target.value}))}>
                  {FREQ.map(fr=><option key={fr} value={fr}>{fr.charAt(0).toUpperCase()+fr.slice(1)}</option>)}
                </select>
              </FG>
              <FG label="First Payment Date">
                <input type="date" value={planForm.startDate} min={new Date().toISOString().slice(0,10)} onChange={e=>setPlanForm(f=>({...f,startDate:e.target.value}))}/>
              </FG>
            </div>
            {schedule && (
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:12,marginTop:8}}>
                <div style={{display:'flex',gap:16,marginBottom:10,flexWrap:'wrap'}}>
                  <span style={{fontSize:'.8125rem'}}>Principal: <strong>{fmt.inr(planModal.totalAmount - (parseFloat(planForm.advanceAmount)||0))}</strong></span>
                  <span style={{fontSize:'.8125rem'}}>Interest: <strong style={{color:'var(--amber)'}}>{fmt.inr(schedule.interest)}</strong></span>
                  <span style={{fontSize:'.8125rem'}}>Total Payable: <strong style={{color:'var(--sky)'}}>{fmt.inr(schedule.totalPayable)}</strong></span>
                  <span style={{fontSize:'.8125rem'}}>EMI: <strong style={{color:'var(--indigo)'}}>{fmt.inr(schedule.emi)}</strong></span>
                </div>
                <table style={{width:'100%',fontSize:'.8125rem'}}>
                  <thead><tr style={{background:'var(--border)'}}><th style={{padding:'4px 8px',textAlign:'left'}}>#</th><th style={{padding:'4px 8px',textAlign:'left'}}>Due Date</th><th style={{padding:'4px 8px',textAlign:'right'}}>Amount</th></tr></thead>
                  <tbody>
                    {schedule.schedule.map(inst=>(
                      <tr key={inst.installmentNumber} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:'4px 8px',fontWeight:700}}>#{inst.installmentNumber}</td>
                        <td style={{padding:'4px 8px'}}>{fmt.date(inst.dueDate)}</td>
                        <td style={{padding:'4px 8px',textAlign:'right',fontWeight:700}}>{fmt.inr(inst.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>)}
          <FG label="Default Payment Mode">
            <select value={planForm.paymentMode} onChange={e=>setPlanForm(f=>({...f,paymentMode:e.target.value}))}>
              {PAY_MODES.map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </FG>
        </Modal>
      )}

      {/* Mark Paid / Advance Modal */}
      {payModal && (
        <Modal open onClose={()=>setPayModal(null)}
          title={payModal._action==='advance'?`Pay Advance — ${payModal.poNumber}`:`Mark Fully Paid — ${payModal.poNumber}`}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setPayModal(null)}>Cancel</button><button className="btn btn-success btn-sm" onClick={markPaid}>Confirm Payment</button></>}>
          <div style={{padding:'10px 14px',background:'var(--bg-2)',borderRadius:'var(--radius)',marginBottom:12,fontSize:'.875rem'}}>
            <div>Vendor: <strong>{payModal.vendor?.shopName||'—'}</strong></div>
            <div>Amount: <strong style={{color:'var(--sky)'}}>{payModal._action==='advance'?fmt.inr(payModal.advanceAmount||0):fmt.inr(payModal.balanceAmount||0)}</strong></div>
          </div>
          <FG label="Payment Mode">
            <select value={payForm.paymentMode} onChange={e=>setPayForm(f=>({...f,paymentMode:e.target.value}))}>
              {PAY_MODES.map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </FG>
          <FG label="Note"><input value={payForm.note} onChange={e=>setPayForm(f=>({...f,note:e.target.value}))} placeholder="Reference / cheque number…"/></FG>
        </Modal>
      )}

      {/* Installment Payment Modal */}
      {instModal && (
        <Modal open onClose={()=>setInstModal(null)}
          title={`Pay Installment #${instModal.inst.installmentNumber} — ${instModal.po.poNumber}`}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setInstModal(null)}>Cancel</button><button className="btn btn-success btn-sm" onClick={payInstallment}>Confirm</button></>}>
          <div style={{padding:'10px 14px',background:'var(--bg-2)',borderRadius:'var(--radius)',marginBottom:12,fontSize:'.875rem'}}>
            <div>Amount: <strong style={{color:'var(--sky)'}}>{fmt.inr(instModal.inst.amount)}</strong></div>
            <div>Due: <strong style={{color:instModal.inst.status==='overdue'?'var(--red)':'inherit'}}>{fmt.date(instModal.inst.dueDate)}</strong></div>
          </div>
          <FG label="Payment Mode">
            <select value={instForm.paymentMode} onChange={e=>setInstForm(f=>({...f,paymentMode:e.target.value}))}>
              {PAY_MODES.map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </FG>
          <FG label="Note"><input value={instForm.note} onChange={e=>setInstForm(f=>({...f,note:e.target.value}))} placeholder="Reference / cheque number…"/></FG>
        </Modal>
      )}
    </div>
  );
}

export default function AccountsPage() {
  const [tab, setTab] = useState('pnl');
  return (
    <div className="page">
      <PageHdr icon={Calculator} title="Accounts" color="var(--sky)" />
      <div style={{padding:'0 24px',background:'var(--white)',borderBottom:'1.5px solid var(--border)'}}>
        <Tabs tabs={[{id:'pnl',label:'P&L Overview'},{id:'sales',label:'Sales'},{id:'expenses',label:'Expenses'},{id:'po',label:'PO Payments'}]} active={tab} onChange={setTab} />
      </div>
      <div className="page-body">
        {tab==='pnl'      && <PnLTab />}
        {tab==='sales'    && <SalesTab />}
        {tab==='expenses' && <ExpensesTab />}
        {tab==='po'       && <POPaymentsTab />}
      </div>
    </div>
  );
}
