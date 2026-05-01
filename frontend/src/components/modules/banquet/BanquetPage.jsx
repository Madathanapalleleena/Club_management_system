import React, { useState, useEffect, useCallback } from "react";
import { Building2, Plus, Calendar, Eye, X, Check, AlertTriangle, Clock, Search } from "lucide-react";
import { banquetAPI } from "../../../api";
import { fmt } from "../../../utils/helpers";
import { Modal, FG, PageHdr, Empty, Tabs, Stat } from "../../ui";
import toast from "react-hot-toast";

const BANQUET_TYPES = ["Small Hall","Medium Hall","Large Hall","Outdoor","Rooftop","Conference Room"];
const EVENT_TYPES   = ["Wedding","Birthday","Corporate","Reception","Anniversary","Engagement","Conference","Other"];
const GST_RATES     = [0,5,10,12,18];
const SLOTS = [
  { id:"morning",   label:"Morning",   time:"07:00 – 12:00" },
  { id:"afternoon", label:"Afternoon", time:"12:00 – 17:00" },
  { id:"evening",   label:"Evening",   time:"17:00 – 23:00" },
];
const payColor = s => ({ paid:"var(--emerald)", partial:"var(--amber)", due:"var(--red)" }[s] || "var(--text-3)");
const payBg    = s => ({ paid:"var(--emerald-lt)", partial:"var(--amber-lt)", due:"var(--red-lt)" }[s] || "var(--bg-subtle)");

function calc(form) {
  const p=parseFloat(form.numberOfPersons)||0, pb=parseFloat(form.pricePerBuffet)||0;
  const bc=parseFloat(form.banquetCharges)||0, g=parseFloat(form.gstRate)||0;
  const buffet=p*pb, tax=((buffet+bc)*g)/100, total=buffet+bc+tax;
  const adv=parseFloat(form.advancePayment)||0;
  return {buffet:buffet.toFixed(2),tax:tax.toFixed(2),total:total.toFixed(2),balance:Math.max(0,total-adv).toFixed(2)};
}

const EMPTY = {banquetType:"Small Hall",eventType:"Birthday",bookingDate:"",slot:"morning",numberOfPersons:"",pricePerBuffet:"",banquetCharges:"0",gstRate:"0",advancePayment:"0",paymentMode:"cash",customerName:"",customerMobile:"",customerEmail:"",memberId:"",customerAddress:"",bookingPersonName:"",notes:""};

function BookingsTab() {
  const [bookings,setBookings]=useState([]);
  const [loading,setLoad]=useState(true);
  const [filters,setF]=useState({status:"",paymentStatus:""});
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(false);
  const [viewDetail,setViewDetail]=useState(null);
  const [editItem,setEditItem]=useState(null);
  const [payModal,setPayModal]=useState(null);
  const [form,setForm]=useState(EMPTY);
  const [avail,setAvail]=useState(null);
  const [checking,setChecking]=useState(false);
  const [saving,setSaving]=useState(false);
  const [payAmt,setPayAmt]=useState("");

  const load=useCallback(()=>{
    setLoad(true);
    const p={};
    if(filters.status)p.status=filters.status;
    if(filters.paymentStatus)p.paymentStatus=filters.paymentStatus;
    banquetAPI.list(p).then(r=>setBookings(r.data)).finally(()=>setLoad(false));
  },[filters]);
  useEffect(()=>{load();},[load]);

  const pricing=calc(form);

  const checkSlot=async()=>{
    if(!form.banquetType||!form.bookingDate||!form.slot){toast.error("Select hall, date & slot");return;}
    setChecking(true);
    try{
      const r=await banquetAPI.checkAvailability({banquetType:form.banquetType,bookingDate:form.bookingDate,slot:form.slot,excludeId:editItem?._id});
      setAvail(r.data);
    } catch(e) {
      toast.error(e.response?.data?.message||"Failed to check availability");
    } finally {
      setChecking(false);
    }
  };

  const handleSave=async()=>{
    if(!form.customerName||!form.customerMobile||!form.bookingDate)return toast.error("Fill required fields");
    if(form.customerMobile.length!==10)return toast.error("Mobile must be 10 digits");
    if(!avail?.available&&!editItem)return toast.error("Check slot availability first");
    setSaving(true);
    try{
      editItem?await banquetAPI.update(editItem._id,form):await banquetAPI.create(form);
      toast.success(editItem?"Updated":"Booking confirmed!");
      load();setModal(false);setAvail(null);setForm(EMPTY);setEditItem(null);
    }catch(e){toast.error(e.response?.data?.message||"Failed");}
    finally{setSaving(false);}
  };

  const openEdit=b=>{
    setEditItem(b);
    setForm({banquetType:b.banquetType,eventType:b.eventType,bookingDate:b.bookingDate?.slice(0,10),slot:b.slot,numberOfPersons:b.numberOfPersons,pricePerBuffet:b.pricePerBuffet,banquetCharges:b.banquetCharges,gstRate:b.gstRate,advancePayment:b.advancePayment,paymentMode:b.paymentMode||"cash",customerName:b.customerName,customerMobile:b.customerMobile,customerEmail:b.customerEmail||"",memberId:b.memberId||"",customerAddress:b.customerAddress||"",bookingPersonName:b.bookingPersonName||"",notes:b.notes||""});
    setAvail({available:true});setModal(true);
  };

  const doUpdatePayment=async(id,status,amt)=>{
    await banquetAPI.update(id,{paymentStatus:status,advancePayment:parseFloat(amt)||0});
    toast.success("Payment updated");load();setPayModal(null);
  };

  const doCancel=async id=>{
    if(!window.confirm("Cancel this booking?"))return;
    await banquetAPI.cancel(id);toast.success("Cancelled");load();
  };

  const filtered=bookings.filter(b=>!search||b.customerName.toLowerCase().includes(search.toLowerCase())||b.bookingRef.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div className="flex items-center justify-between" style={{gap:8,flexWrap:"wrap"}}>
        <div className="filter-bar">
          <div className="search-wrap"><span className="search-icon"><Search size={13}/></span><input style={{width:190}} placeholder="Search bookings..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select value={filters.status} onChange={e=>setF(f=>({...f,status:e.target.value}))} style={{width:130}}>
            <option value="">All Status</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
          <select value={filters.paymentStatus} onChange={e=>setF(f=>({...f,paymentStatus:e.target.value}))} style={{width:130}}>
            <option value="">All Payments</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="due">Due</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={()=>{setEditItem(null);setForm(EMPTY);setAvail(null);setModal(true);}}><Plus size={14}/> New Booking</button>
      </div>
      {loading?<div style={{padding:32,textAlign:"center",color:"var(--text-4)"}}>Loading...</div>:
        filtered.length===0?<Empty icon={Building2} title="No bookings" sub="Create the first banquet booking"/>:
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ref</th><th>Hall / Slot</th><th>Event</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map(b=>(
                  <tr key={b._id}>
                    <td className="font-mono" style={{color:"var(--indigo)",fontWeight:700,fontSize:".8rem"}}>{b.bookingRef}</td>
                    <td><div style={{fontWeight:600,fontSize:".8125rem"}}>{b.banquetType}</div><div style={{fontSize:".72rem",color:"var(--text-4)"}}>{SLOTS.find(s=>s.id===b.slot)?.label} · {b.numberOfPersons} pax</div></td>
                    <td style={{fontSize:".8125rem",fontWeight:500}}>{b.eventType}</td>
                    <td><div style={{fontWeight:500,fontSize:".8125rem"}}>{b.customerName}</div><div style={{fontSize:".72rem",color:"var(--text-4)"}}>{b.customerMobile}</div></td>
                    <td className="text-sm">{fmt.date(b.bookingDate)}</td>
                    <td style={{fontWeight:700}}>{fmt.inr(b.totalAmount)}</td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{background:payBg(b.paymentStatus),color:payColor(b.paymentStatus),borderRadius:20,padding:"2px 9px",fontSize:".72rem",fontWeight:700}}>{(b.paymentStatus||"due").toUpperCase()}</span>
                        {b.balanceAmount>0&&<span style={{fontSize:".7rem",color:"var(--red)"}}>{fmt.inr(b.balanceAmount)} due</span>}
                      </div>
                    </td>
                    <td><span style={{background:b.status==="confirmed"?"var(--indigo-lt)":b.status==="completed"?"var(--emerald-lt)":"var(--bg-subtle)",color:b.status==="confirmed"?"var(--indigo)":b.status==="completed"?"var(--emerald)":"var(--text-4)",borderRadius:20,padding:"2px 9px",fontSize:".72rem",fontWeight:700}}>{b.status}</span></td>
                    <td>
                      <div style={{display:"flex",gap:4}}>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>setViewDetail(b)} title="View"><Eye size={13}/></button>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>openEdit(b)} title="Edit" style={{color:"var(--indigo)"}}><Check size={13}/></button>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>{setPayModal(b);setPayAmt(b.advancePayment||0);}} title="Payment" style={{color:payColor(b.paymentStatus),fontWeight:700,fontSize:".85rem"}}>₹</button>
                        {b.status==="confirmed"&&<button className="btn btn-icon btn-ghost btn-sm" onClick={()=>doCancel(b._id)} title="Cancel" style={{color:"var(--red)"}}><X size={13}/></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }

      {/* Detail Modal */}
      {viewDetail&&(
        <Modal open size="modal-lg" onClose={()=>setViewDetail(null)} title={`Booking Details — ${viewDetail.bookingRef}`}
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={()=>setViewDetail(null)}>Close</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>{
              const w=window.open('','_blank');
              w.document.write(`<html><head><title>Invoice - ${viewDetail.bookingRef}</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}h2{margin-bottom:0;}p{margin-top:5px;color:#555;}</style></head><body><h2>Tax Invoice / Booking Confirmation</h2><p>Booking Ref: ${viewDetail.bookingRef}</p><table><tr><th>Customer</th><td>${viewDetail.customerName} (${viewDetail.customerMobile})</td><th>Date</th><td>${fmt.date(viewDetail.bookingDate)}</td></tr><tr><th>Hall / Slot</th><td>${viewDetail.banquetType} (${viewDetail.slot})</td><th>Event</th><td>${viewDetail.eventType}</td></tr><tr><th>Persons</th><td>${viewDetail.numberOfPersons}</td><th>Status</th><td>${viewDetail.status.toUpperCase()}</td></tr></table><br/><table><tr><th>Buffet Cost</th><td>Rs. ${viewDetail.buffetCost}</td></tr><tr><th>Banquet Charges</th><td>Rs. ${viewDetail.banquetCharges}</td></tr><tr><th>GST (${viewDetail.gstRate}%)</th><td>Rs. ${viewDetail.taxAmount}</td></tr><tr><th>Total Amount</th><td><h3>Rs. ${viewDetail.totalAmount}</h3></td></tr><tr><th>Advance Paid</th><td>Rs. ${viewDetail.advancePayment}</td></tr><tr><th>Balance Due</th><td>Rs. ${viewDetail.balanceAmount}</td></tr></table><p style="margin-top:30px;font-size:0.8em;color:#888;">System generated invoice. Automatically notified to Accounts and HOD.</p></body></html>`);
              w.document.close(); w.print();
            }}>Download PDF Invoice</button>
            <button className="btn btn-primary btn-sm" onClick={()=>{setViewDetail(null);openEdit(viewDetail);}}>Edit</button>
          </>}
        >
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{background:"var(--bg-subtle)",borderRadius:"var(--radius)",padding:14}}>
              <div style={{fontWeight:700,marginBottom:8,fontSize:".75rem",color:"var(--text-4)",textTransform:"uppercase",letterSpacing:".06em"}}>Event Details</div>
              {[["Hall",viewDetail.banquetType],["Event",viewDetail.eventType],["Date",fmt.date(viewDetail.bookingDate)],["Slot",SLOTS.find(s=>s.id===viewDetail.slot)?.label+" ("+SLOTS.find(s=>s.id===viewDetail.slot)?.time+")"],["Persons",viewDetail.numberOfPersons],["Status",viewDetail.status],["Booked by",viewDetail.createdBy?.name||"-"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid var(--border)",fontSize:".8125rem"}}>
                  <span style={{color:"var(--text-3)"}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:"var(--bg-subtle)",borderRadius:"var(--radius)",padding:14}}>
              <div style={{fontWeight:700,marginBottom:8,fontSize:".75rem",color:"var(--text-4)",textTransform:"uppercase",letterSpacing:".06em"}}>Customer</div>
              {[["Name",viewDetail.customerName],["Mobile",viewDetail.customerMobile],["Email",viewDetail.customerEmail||"-"],["Member ID",viewDetail.memberId||"-"],["Address",viewDetail.customerAddress||"-"],["Booking Person",viewDetail.bookingPersonName||"-"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid var(--border)",fontSize:".8125rem"}}>
                  <span style={{color:"var(--text-3)"}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[["Buffet Cost",fmt.inr(viewDetail.buffetCost),"var(--text-1)"],["Banquet Charges",fmt.inr(viewDetail.banquetCharges),"var(--text-1)"],["GST ("+viewDetail.gstRate+"%)",fmt.inr(viewDetail.taxAmount),"var(--amber)"],["Total Amount",fmt.inr(viewDetail.totalAmount),"var(--indigo)"],["Advance Paid",fmt.inr(viewDetail.advancePayment),"var(--emerald)"],["Balance Due",fmt.inr(viewDetail.balanceAmount),viewDetail.balanceAmount>0?"var(--red)":"var(--emerald)"]].map(([k,v,c])=>(
              <div key={k} style={{textAlign:"center",padding:"10px 6px",background:"var(--white)",borderRadius:8,border:"1px solid var(--border)"}}>
                <div style={{fontSize:"1rem",fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:".7rem",color:"var(--text-4)",marginTop:2}}>{k}</div>
              </div>
            ))}
          </div>
          {viewDetail.changeLog?.length>0&&(<div><div style={{fontWeight:700,fontSize:".8125rem",marginBottom:6}}>Activity Log</div>{viewDetail.changeLog.map((l,i)=>(<div key={i} style={{fontSize:".8rem",color:"var(--text-3)",borderLeft:"2px solid var(--indigo-md)",paddingLeft:10,marginBottom:5}}>{l.text} <span style={{color:"var(--text-4)"}}>· {l.by?.name} · {fmt.ago(l.at)}</span></div>))}</div>)}
        </Modal>
      )}

      {/* Payment Modal */}
      {payModal&&(
        <Modal open onClose={()=>setPayModal(null)} title="Update Payment"
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setPayModal(null)}>Cancel</button></>}
        >
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,padding:12,background:"var(--bg-subtle)",borderRadius:8}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:".75rem",color:"var(--text-4)"}}>Total</div><div style={{fontWeight:800,color:"var(--indigo)"}}>{fmt.inr(payModal.totalAmount)}</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:".75rem",color:"var(--text-4)"}}>Advance</div><div style={{fontWeight:800,color:"var(--emerald)"}}>{fmt.inr(payModal.advancePayment)}</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:".75rem",color:"var(--text-4)"}}>Balance</div><div style={{fontWeight:800,color:"var(--red)"}}>{fmt.inr(payModal.balanceAmount)}</div></div>
          </div>
          <FG label="Advance Amount Received (₹)"><input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)}/></FG>
          <div style={{display:"flex",gap:8}}>
            {["due","partial","paid"].map(s=>(
              <button key={s} onClick={()=>doUpdatePayment(payModal._id,s,payAmt)} className="btn btn-sm" style={{flex:1,justifyContent:"center",background:payBg(s),color:payColor(s),border:`1px solid ${payColor(s)}`}}>{s.toUpperCase()}</button>
            ))}
          </div>
        </Modal>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modal} onClose={()=>{setModal(false);setAvail(null);setEditItem(null);}} title={editItem?"Edit Booking":"New Banquet Booking"} size="modal-lg"
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setModal(false);setAvail(null);setEditItem(null);}}>Cancel</button>
            <div style={{display:'inline-flex',alignItems:'center',gap:10}}>
              {(!avail?.available&&!editItem)&&<span style={{fontSize:'.75rem',color:'var(--red)',fontWeight:600}}>Check availability first!</span>}
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving||(!avail?.available&&!editItem)}>{saving?"Saving...":editItem?"Update":"Confirm Booking"}</button>
            </div>
          </>
        }
      >
        <div style={{background:"var(--indigo-lt)",borderRadius:"var(--radius)",padding:14,border:"1px solid var(--indigo-md)"}}>
          <div style={{fontWeight:700,marginBottom:10,color:"var(--indigo)",fontSize:".875rem"}}>Slot Booking</div>
          <div className="form-row cols-3">
            <FG label="Hall / Venue" required><select value={form.banquetType} onChange={e=>{setForm({...form,banquetType:e.target.value});setAvail(null);}}>{BANQUET_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></FG>
            <FG label="Booking Date" required><input type="date" value={form.bookingDate} min={new Date().toISOString().slice(0,10)} onChange={e=>{setForm({...form,bookingDate:e.target.value});setAvail(null);}}/></FG>
            <FG label="Time Slot" required><select value={form.slot} onChange={e=>{setForm({...form,slot:e.target.value});setAvail(null);}}>{SLOTS.map(s=><option key={s.id} value={s.id}>{s.label} ({s.time})</option>)}</select></FG>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button className="btn btn-primary btn-sm" onClick={checkSlot} disabled={checking}>{checking?"Checking...":"Check Availability"}</button>
            {avail&&(<div style={{fontWeight:700,fontSize:".875rem",color:avail.available?"var(--emerald)":"var(--red)"}}>{avail.available?"✓ Available":"✗ Slot Taken"}</div>)}
          </div>
        </div>
        <div className="form-row cols-2">
          <FG label="Event Type" required><select value={form.eventType} onChange={e=>setForm({...form,eventType:e.target.value})}>{EVENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></FG>
          <FG label="Number of Persons" required><input type="number" min="1" value={form.numberOfPersons} onChange={e=>setForm({...form,numberOfPersons:e.target.value})}/></FG>
        </div>
        <div style={{background:"var(--bg-subtle)",borderRadius:"var(--radius)",padding:14}}>
          <div style={{fontWeight:700,marginBottom:10,fontSize:".875rem"}}>Pricing Details</div>
          <div className="form-row cols-3">
            <FG label="Price/Buffet (₹ per person)" required><input type="number" value={form.pricePerBuffet} onChange={e=>setForm({...form,pricePerBuffet:e.target.value})} placeholder="0"/></FG>
            <FG label="Banquet Charges (₹)"><input type="number" value={form.banquetCharges} onChange={e=>setForm({...form,banquetCharges:e.target.value})} placeholder="0"/></FG>
            <FG label="GST Rate"><select value={form.gstRate} onChange={e=>setForm({...form,gstRate:e.target.value})}>{GST_RATES.map(r=><option key={r} value={r}>{r===0?"No GST":r+"%"}</option>)}</select></FG>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:10}}>
            {[["Buffet","₹"+pricing.buffet,"var(--text-1)"],["Tax","₹"+pricing.tax,"var(--amber)"],["Total","₹"+pricing.total,"var(--indigo)"],["Balance","₹"+pricing.balance,"var(--red)"]].map(([k,v,c])=>(
              <div key={k} style={{textAlign:"center",padding:"8px 4px",background:"var(--white)",borderRadius:6,border:"1px solid var(--border)"}}>
                <div style={{fontWeight:800,color:c,fontSize:".9rem"}}>{v}</div>
                <div style={{fontSize:".7rem",color:"var(--text-4)"}}>{k}</div>
              </div>
            ))}
          </div>
          <div className="form-row cols-2" style={{marginTop:10}}>
            <FG label="Advance Payment (₹)"><input type="number" value={form.advancePayment} onChange={e=>setForm({...form,advancePayment:e.target.value})} max={pricing.total}/></FG>
            <FG label="Payment Mode"><select value={form.paymentMode} onChange={e=>setForm({...form,paymentMode:e.target.value})}>{["cash","upi","card","online","cheque"].map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}</select></FG>
          </div>
        </div>
        <div style={{background:"var(--bg-subtle)",borderRadius:"var(--radius)",padding:14}}>
          <div style={{fontWeight:700,marginBottom:10,fontSize:".875rem"}}>Customer Details</div>
          <div className="form-row cols-2">
            <FG label="Guest Name" required><input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></FG>
            <FG label="Mobile (10 digits)" required><input type="tel" maxLength={10} pattern="\d{10}" onKeyPress={e=>!/[0-9]/.test(e.key)&&e.preventDefault()} value={form.customerMobile} onChange={e=>setForm({...form,customerMobile:e.target.value})}/></FG>
          </div>
          <div className="form-row cols-2">
            <FG label="Email"><input type="email" value={form.customerEmail} onChange={e=>setForm({...form,customerEmail:e.target.value})}/></FG>
            <FG label="Member ID"><input value={form.memberId} onChange={e=>setForm({...form,memberId:e.target.value})} placeholder="If applicable"/></FG>
          </div>
          <FG label="Address"><input value={form.customerAddress} onChange={e=>setForm({...form,customerAddress:e.target.value})}/></FG>
          <FG label="Booking Person (if different)"><input value={form.bookingPersonName} onChange={e=>setForm({...form,bookingPersonName:e.target.value})}/></FG>
        </div>
      </Modal>
    </div>
  );
}

function CalendarTab() {
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [events,setEvents]=useState([]);
  useEffect(()=>{banquetAPI.calendar(year,month).then(r=>setEvents(r.data)).catch(()=>{});},[year,month]);
  const daysInMonth=new Date(year,month,0).getDate();
  const firstDay=new Date(year,month-1,1).getDay();
  const sc={morning:"#3b82f6",afternoon:"#f59e0b",evening:"#7c3aed"};
  const byDay=day=>events.filter(e=>{const d=new Date(e.bookingDate);return d.getDate()===day&&d.getMonth()===month-1&&d.getFullYear()===year;});
  const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="flex items-center justify-between">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>{if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1);}}>&#8249;</button>
          <h3 style={{minWidth:120,textAlign:"center"}}>{mn[month-1]} {year}</h3>
          <button className="btn btn-ghost btn-sm" onClick={()=>{if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1);}}>&#8250;</button>
        </div>
        <div style={{display:"flex",gap:12,fontSize:".8125rem"}}>
          {SLOTS.map(s=>(<div key={s.id} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:3,background:sc[s.id]}}/><span className="text-3">{s.label}</span></div>))}
        </div>
      </div>
      <div className="card" style={{padding:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(<div key={d} style={{textAlign:"center",fontSize:".72rem",fontWeight:700,color:"var(--text-4)",padding:4}}>{d}</div>))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i}/>)}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const day=i+1,de=byDay(day);
            const isToday=new Date().getDate()===day&&new Date().getMonth()===month-1&&new Date().getFullYear()===year;
            return(
              <div key={day} style={{minHeight:70,padding:4,borderRadius:6,border:"1px solid var(--border)",background:isToday?"var(--indigo-lt)":"var(--white)"}}>
                <div style={{fontWeight:isToday?800:400,fontSize:".8125rem",color:isToday?"var(--indigo)":"var(--text-2)",marginBottom:3}}>{day}</div>
                {de.map(ev=>(<div key={ev._id} style={{background:sc[ev.slot]+"22",borderLeft:`2px solid ${sc[ev.slot]}`,borderRadius:3,padding:"2px 4px",marginBottom:2,fontSize:".63rem",fontWeight:600,color:sc[ev.slot],overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}} title={ev.banquetType+" - "+ev.eventType}>{ev.banquetType.split(" ")[0]} {ev.eventType}</div>))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const [stats,setStats]=useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  useEffect(()=>{banquetAPI.monthlyStats(selectedDate).then(r=>setStats(r.data)).catch(()=>{});},[selectedDate]);
  if(!stats)return <div style={{padding:32,textAlign:"center",color:"var(--text-4)"}}>Loading...</div>;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="flex items-center justify-between">
        <div><h2 style={{fontSize:'1.2rem'}}>Banquet Overview</h2><p style={{color:'var(--text-3)',fontSize:'.875rem'}}>Metrics up to · {fmt.date(new Date(selectedDate))}</p></div>
        <div><input type="date" className="input-sm" style={{borderRadius:8, border:'1px solid var(--border)', padding:'4px 8px'}} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
      </div>
      <div className="stats-grid">
        <Stat label="Events This Month" value={stats.totalEvents} color="var(--indigo)"/>
        <Stat label="Monthly Revenue" value={fmt.inr(stats.revenue)} color="var(--emerald)"/>
        <Stat label="Morning Booked" value={stats.bySlot?.morning||0} color="var(--sky)"/>
        <Stat label="Afternoon Booked" value={stats.bySlot?.afternoon||0} color="var(--amber)"/>
        <Stat label="Evening Booked" value={stats.bySlot?.evening||0} color="var(--violet)"/>
        <Stat label="Pending Payments" value={stats.pendingPayments?.length||0} color="var(--red)" sub="Require follow-up"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1.5px solid var(--border)"}}><h3>Upcoming Events (7 days)</h3></div>
          {stats.upcoming?.length===0?<div style={{padding:20,textAlign:"center",color:"var(--text-4)",fontSize:".875rem"}}>No upcoming events</div>:
            stats.upcoming?.map(e=>(<div key={e._id} style={{padding:"10px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:600,fontSize:".8125rem"}}>{e.eventType} - {e.banquetType}</div><div style={{fontSize:".72rem",color:"var(--text-4)"}}>{e.customerName} · {fmt.date(e.bookingDate)} · {e.numberOfPersons} pax</div></div><span className="font-mono" style={{fontSize:".75rem",color:"var(--indigo)",fontWeight:700}}>{e.bookingRef}</span></div>))
          }
        </div>
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1.5px solid var(--border)"}}><h3>Payment Follow-ups</h3></div>
          {stats.pendingPayments?.length===0?<div style={{padding:20,textAlign:"center",color:"var(--text-4)",fontSize:".875rem"}}>No pending payments</div>:
            stats.pendingPayments?.map(e=>(<div key={e._id} style={{padding:"10px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:600,fontSize:".8125rem"}}>{e.bookingRef}</div><div style={{fontSize:".72rem",color:"var(--text-4)"}}>{e.customerName} · {fmt.date(e.bookingDate)}</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:800,color:"var(--red)",fontSize:".875rem"}}>{fmt.inr(e.balanceAmount)}</div><span style={{background:e.paymentStatus==="partial"?"var(--amber-lt)":"var(--red-lt)",color:e.paymentStatus==="partial"?"var(--amber)":"var(--red)",borderRadius:20,padding:"1px 7px",fontSize:".65rem",fontWeight:700}}>{e.paymentStatus}</span></div></div>))
          }
        </div>
      </div>
    </div>
  );
}

export default function BanquetPage() {
  const [tab,setTab]=useState("dashboard");
  return (
    <div className="page">
      <PageHdr icon={Building2} title="Banquet Management" color="var(--violet)">
        <button className="btn btn-ghost btn-sm" onClick={()=>banquetAPI.runReminders().then(r=>toast.success()).catch(()=>{})}><Clock size={13}/> Run Alerts</button>
      </PageHdr>
      <div style={{padding:"0 24px",background:"var(--white)",borderBottom:"1.5px solid var(--border)"}}>
        <Tabs tabs={[{id:"dashboard",label:"Dashboard"},{id:"bookings",label:"Bookings"},{id:"calendar",label:"Calendar"}]} active={tab} onChange={setTab}/>
      </div>
      <div className="page-body">
        {tab==="dashboard"&&<DashboardTab/>}
        {tab==="bookings"&&<BookingsTab/>}
        {tab==="calendar"&&<CalendarTab/>}
      </div>
    </div>
  );
}
