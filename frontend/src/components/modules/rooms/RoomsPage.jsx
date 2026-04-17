import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Eye, X, Check, Search, Bed } from 'lucide-react';
import { roomsAPI } from '../../../api';
import { fmt } from '../../../utils/helpers';
import { Modal, FG, PageHdr, Empty, Tabs, Stat } from '../../ui';
import toast from 'react-hot-toast';

const ROOM_TYPES = ['Standard','Deluxe','Suite','Family Room','Executive','Presidential Suite'];
const ID_PROOFS  = ['Aadhar','Passport','Driving License','Voter ID','PAN Card'];
const GST_RATES  = [0,5,12,18];
const PAY_MODES  = ['cash','upi','card','online'];
const ROOM_STATUS_COLOR = { available:'var(--emerald)', occupied:'var(--red)', maintenance:'var(--amber)', reserved:'var(--indigo)' };
const BOOK_STATUS_COLOR = { confirmed:'var(--indigo)', checked_in:'var(--emerald)', checked_out:'var(--text-3)', cancelled:'var(--red)', no_show:'var(--amber)' };

function calcRoom(form) {
  const nights = Math.max(1, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn))/(1000*60*60*24))) || 0;
  const rc = (parseFloat(form.pricePerNight)||0) * nights;
  const extras = (parseFloat(form.extraBedCharges)||0)+(parseFloat(form.foodCharges)||0)+(parseFloat(form.serviceCharges)||0);
  const tax = ((rc+extras)*(parseFloat(form.gstRate)||0))/100;
  const total = rc+extras+tax;
  const adv = parseFloat(form.advancePayment)||0;
  return { nights, roomCost:rc.toFixed(2), tax:tax.toFixed(2), total:total.toFixed(2), balance:Math.max(0,total-adv).toFixed(2) };
}

const EMPTY_BOOKING = { room:'', roomType:'Standard', pricePerNight:'', checkIn:'', checkOut:'', adults:1, children:0, extraBedCharges:0, foodCharges:0, serviceCharges:0, gstRate:12, advancePayment:0, paymentMode:'cash', paymentStatus:'due', customerName:'', customerMobile:'', customerEmail:'', idProofType:'Aadhar', idProofNumber:'', customerAddress:'', memberId:'', notes:'' };

// ── Rooms Management Tab ──────────────────────────────────────────
function RoomsTab() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoad] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ roomNumber:'', roomType:'Standard', pricePerNight:'', capacity:2, floor:'', amenities:'', description:'' });

  const load = () => { setLoad(true); roomsAPI.rooms().then(r=>setRooms(r.data)).finally(()=>setLoad(false)); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.roomNumber || !form.pricePerNight) return toast.error('Fill required fields');
    try {
      editing ? await roomsAPI.updateRoom(editing._id, form) : await roomsAPI.createRoom(form);
      toast.success(editing ? 'Room updated' : 'Room added');
      load(); setModal(false);
    } catch(e) { toast.error(e.response?.data?.message||'Failed'); }
  };

  const updateStatus = async (id, status) => {
    await roomsAPI.updateRoom(id, { status });
    toast.success('Status updated'); load();
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div className="flex items-center justify-between">
        <span className="text-3 text-sm">{rooms.length} rooms configured</span>
        <button className="btn btn-primary btn-sm" onClick={()=>{setEditing(null);setForm({roomNumber:'',roomType:'Standard',pricePerNight:'',capacity:2,floor:'',amenities:'',description:''});setModal(true);}}>
          <Plus size={13}/> Add Room
        </button>
      </div>
      {loading ? <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading...</div> :
        rooms.length === 0 ? <Empty icon={Bed} title="No rooms configured" sub="Add rooms to start accepting bookings" /> :
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
          {rooms.map(r => (
            <div key={r._id} className="card card-sm" style={{borderLeft:`3px solid ${ROOM_STATUS_COLOR[r.status]||'var(--border)'}` }}>
              <div className="flex items-center justify-between" style={{marginBottom:6}}>
                <span style={{fontWeight:800,fontSize:'1rem',color:'var(--text-1)'}}>{r.roomNumber}</span>
                <span style={{background:ROOM_STATUS_COLOR[r.status]+'18',color:ROOM_STATUS_COLOR[r.status],borderRadius:20,padding:'2px 8px',fontSize:'.7rem',fontWeight:700}}>{r.status}</span>
              </div>
              <div className="text-sm" style={{fontWeight:600}}>{r.roomType}</div>
              <div className="text-sm text-3">{fmt.inr(r.pricePerNight)}/night · {r.capacity} guests</div>
              {r.floor && <div className="text-xs text-3" style={{marginTop:3}}>Floor {r.floor}</div>}
              <div style={{display:'flex',gap:4,marginTop:8,flexWrap:'wrap'}}>
                {['available','occupied','maintenance'].filter(s=>s!==r.status).map(s=>(
                  <button key={s} className="btn btn-ghost btn-xs" onClick={()=>updateStatus(r._id,s)} style={{fontSize:'.65rem'}}>→ {s}</button>
                ))}
                <button className="btn btn-ghost btn-xs" onClick={()=>{setEditing(r);setForm({...r,amenities:r.amenities?.join(',')||''});setModal(true);}}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title={editing?'Edit Room':'Add Room'}
        footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>{editing?'Update':'Add'}</button></>}
      >
        <div className="form-row cols-2">
          <FG label="Room Number" required><input value={form.roomNumber} onChange={e=>setForm({...form,roomNumber:e.target.value})} placeholder="101" /></FG>
          <FG label="Room Type" required><select value={form.roomType} onChange={e=>setForm({...form,roomType:e.target.value})}>{ROOM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></FG>
        </div>
        <div className="form-row cols-3">
          <FG label="Price/Night (₹)" required><input type="number" value={form.pricePerNight} onChange={e=>setForm({...form,pricePerNight:e.target.value})}/></FG>
          <FG label="Capacity (guests)"><input type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></FG>
          <FG label="Floor"><input value={form.floor} onChange={e=>setForm({...form,floor:e.target.value})} placeholder="G, 1, 2..."/></FG>
        </div>
        <FG label="Amenities (comma separated)"><input value={form.amenities} onChange={e=>setForm({...form,amenities:e.target.value})} placeholder="WiFi, AC, TV..."/></FG>
        <FG label="Description"><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={{minHeight:55}}/></FG>
      </Modal>
    </div>
  );
}

// ── Bookings Tab ─────────────────────────────────────────────────
function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms]       = useState([]);
  const [loading, setLoad]      = useState(true);
  const [modal, setModal]       = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [filters, setF]         = useState({ status:'' });
  const [search, setSearch]     = useState('');
  const [form, setForm]         = useState(EMPTY_BOOKING);
  const [avail, setAvail]       = useState([]);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoad(true);
    const p = {}; if (filters.status) p.status = filters.status;
    Promise.all([roomsAPI.bookings(p), roomsAPI.rooms()])
      .then(([b,r]) => { setBookings(b.data); setRooms(r.data); }).finally(() => setLoad(false));
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const pricing = calcRoom(form);

  const checkAvail = async () => {
    if (!form.checkIn || !form.checkOut) return toast.error('Select check-in and check-out dates');
    try {
      const r = await roomsAPI.checkAvailability({ checkIn:form.checkIn, checkOut:form.checkOut, roomType:form.roomType, excludeId:editItem?._id });
      setAvail(r.data);
      if (r.data.length === 0) toast('No rooms available for selected dates', {icon:'⚠️'});
    } catch(e) { toast.error('Failed to check availability'); }
  };

  const handleSave = async () => {
    if (!form.customerName || !form.customerMobile || !form.checkIn || !form.checkOut || !form.room)
      return toast.error('Fill all required fields');
    if (form.customerMobile.length !== 10) return toast.error('Mobile must be 10 digits');
    if (!form.idProofNumber) return toast.error('ID proof is mandatory');
    if (parseFloat(form.advancePayment||0) > parseFloat(pricing.total||0)) return toast.error('Advance payment cannot exceed total amount');
    setSaving(true);
    try {
      editItem ? await roomsAPI.updateBooking(editItem._id, form) : await roomsAPI.createBooking(form);
      toast.success(editItem ? 'Updated' : 'Booking confirmed!');
      load(); setModal(false); setForm(EMPTY_BOOKING); setEditItem(null); setAvail([]);
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    await roomsAPI.updateBooking(id, { status });
    toast.success(`Status updated to ${status}`); load();
  };

  const filtered = bookings.filter(b => !search || b.customerName?.toLowerCase().includes(search.toLowerCase()) || b.bookingRef?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div className="flex items-center justify-between" style={{gap:8,flexWrap:'wrap'}}>
        <div className="filter-bar">
          <div className="search-wrap"><span className="search-icon"><Search size={13}/></span><input style={{width:190}} placeholder="Search bookings..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select value={filters.status} onChange={e=>setF(f=>({...f,status:e.target.value}))} style={{width:140}}>
            <option value="">All Status</option>
            {['confirmed','checked_in','checked_out','cancelled','no_show'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={()=>{setEditItem(null);setForm(EMPTY_BOOKING);setAvail([]);setModal(true);}}>
          <Plus size={14}/> New Booking
        </button>
      </div>

      {loading ? <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading...</div> :
        filtered.length === 0 ? <Empty icon={Building2} title="No bookings" sub="Create the first room booking" /> :
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ref</th><th>Room</th><th>Guest</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b._id}>
                    <td className="font-mono" style={{color:'var(--indigo)',fontWeight:700,fontSize:'.8rem'}}>{b.bookingRef}</td>
                    <td><div style={{fontWeight:600,fontSize:'.8125rem'}}>{b.room?.roomNumber||b.roomNumber||'-'}</div><div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{b.roomType}</div></td>
                    <td><div style={{fontWeight:500,fontSize:'.8125rem'}}>{b.customerName}</div><div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{b.customerMobile}</div></td>
                    <td className="text-sm">{fmt.date(b.checkIn)}</td>
                    <td className="text-sm">{fmt.date(b.checkOut)}</td>
                    <td style={{fontWeight:600}}>{b.numberOfNights}</td>
                    <td style={{fontWeight:700}}>{fmt.inr(b.totalAmount)}</td>
                    <td>
                      <span style={{background:b.paymentStatus==='paid'?'var(--emerald-lt)':b.paymentStatus==='partial'?'var(--amber-lt)':'var(--red-lt)',color:b.paymentStatus==='paid'?'var(--emerald)':b.paymentStatus==='partial'?'var(--amber)':'var(--red)',borderRadius:20,padding:'2px 8px',fontSize:'.72rem',fontWeight:700}}>
                        {(b.paymentStatus||'due').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{background:BOOK_STATUS_COLOR[b.status]+'18',color:BOOK_STATUS_COLOR[b.status]||'var(--text-3)',borderRadius:20,padding:'2px 8px',fontSize:'.72rem',fontWeight:700}}>
                        {(b.status||'confirmed').replace('_',' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={()=>setViewItem(b)} title="View"><Eye size={13}/></button>
                        {b.status==='confirmed' && <button className="btn btn-ghost btn-xs" style={{color:'var(--emerald)'}} onClick={()=>updateStatus(b._id,'checked_in')}>Check In</button>}
                        {b.status==='checked_in' && <button className="btn btn-ghost btn-xs" style={{color:'var(--sky)'}} onClick={()=>updateStatus(b._id,'checked_out')}>Check Out</button>}
                        {b.status==='confirmed' && <button className="btn btn-icon btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={()=>{if(window.confirm('Cancel booking?'))roomsAPI.cancelBooking(b._id).then(()=>{toast.success('Cancelled');load();});}}><X size={13}/></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }

      {/* Detail view */}
      {viewItem && (
        <Modal open size="modal-lg" onClose={()=>setViewItem(null)} title={`Booking: ${viewItem.bookingRef}`}
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={()=>setViewItem(null)}>Close</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>{
              const w=window.open('','_blank');
              w.document.write(`<html><head><title>Invoice - ${viewItem.bookingRef}</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}h2{margin-bottom:0;}p{margin-top:5px;color:#555;}</style></head><body><h2>Tax Invoice / Room Booking Confirmation</h2><p>Booking Ref: ${viewItem.bookingRef}</p><table><tr><th>Customer</th><td>${viewItem.customerName} (${viewItem.customerMobile})</td><th>Check-in</th><td>${fmt.datetime(viewItem.checkIn)}</td></tr><tr><th>Room</th><td>${viewItem.room?.roomNumber||viewItem.roomNumber} (${viewItem.roomType})</td><th>Check-out</th><td>${fmt.datetime(viewItem.checkOut)}</td></tr><tr><th>Guests</th><td>${viewItem.adults} Adults, ${viewItem.children} Children</td><th>Status</th><td>${viewItem.status.replace('_',' ').toUpperCase()}</td></tr></table><br/><table><tr><th>Nights</th><td>${viewItem.numberOfNights}</td></tr><tr><th>Room Cost</th><td>Rs. ${viewItem.totalAmount - viewItem.taxAmount - viewItem.extraBedCharges - viewItem.foodCharges - viewItem.serviceCharges}</td></tr><tr><th>Extra Charges</th><td>Rs. ${(viewItem.extraBedCharges||0)+(viewItem.foodCharges||0)+(viewItem.serviceCharges||0)}</td></tr><tr><th>GST Rate</th><td>${viewItem.gstRate}% (Rs. ${viewItem.taxAmount})</td></tr><tr><th>Total Amount</th><td><h3>Rs. ${viewItem.totalAmount}</h3></td></tr><tr><th>Advance Paid</th><td>Rs. ${viewItem.advancePayment} (${viewItem.paymentMode.toUpperCase()})</td></tr><tr><th>Balance Due</th><td>Rs. ${viewItem.balanceAmount}</td></tr></table><p style="margin-top:30px;font-size:0.8em;color:#888;">System generated invoice. Thank you for choosing us.</p></body></html>`);
              w.document.close(); w.print();
            }}>Download PDF Invoice</button>
          </>}
        >
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{background:'var(--bg-subtle)',borderRadius:'var(--radius)',padding:14}}>
              <div style={{fontWeight:700,marginBottom:8,fontSize:'.75rem',color:'var(--text-4)',textTransform:'uppercase',letterSpacing:'.06em'}}>Booking Details</div>
              {[['Room',`${viewItem.room?.roomNumber||viewItem.roomNumber} (${viewItem.roomType})`],['Check-in',fmt.datetime(viewItem.checkIn)],['Check-out',fmt.datetime(viewItem.checkOut)],['Nights',viewItem.numberOfNights],['Adults',viewItem.adults],['Children',viewItem.children],['Status',viewItem.status?.replace('_',' ')],['Booked by',viewItem.createdBy?.name||'-'],['Checked in by',viewItem.checkedInBy?.name||'-'],['Checked out by',viewItem.checkedOutBy?.name||'-']].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid var(--border)',fontSize:'.8125rem'}}>
                  <span style={{color:'var(--text-3)'}}>{k}</span><span style={{fontWeight:600}}>{String(v)}</span>
                </div>
              ))}
            </div>
            <div style={{background:'var(--bg-subtle)',borderRadius:'var(--radius)',padding:14}}>
              <div style={{fontWeight:700,marginBottom:8,fontSize:'.75rem',color:'var(--text-4)',textTransform:'uppercase',letterSpacing:'.06em'}}>Guest Details</div>
              {[['Name',viewItem.customerName],['Mobile',viewItem.customerMobile],['Email',viewItem.customerEmail||'-'],['ID Proof',`${viewItem.idProofType}: ${viewItem.idProofNumber}`],['Address',viewItem.customerAddress||'-'],['Member ID',viewItem.memberId||'-']].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid var(--border)',fontSize:'.8125rem'}}>
                  <span style={{color:'var(--text-3)'}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[['Room Cost',fmt.inr(viewItem.totalAmount - viewItem.taxAmount - viewItem.extraBedCharges - viewItem.foodCharges - viewItem.serviceCharges),'var(--text-1)'],['Extra Charges',fmt.inr((viewItem.extraBedCharges||0)+(viewItem.foodCharges||0)+(viewItem.serviceCharges||0)),'var(--text-1)'],['Tax',fmt.inr(viewItem.taxAmount),'var(--amber)'],['Total',fmt.inr(viewItem.totalAmount),'var(--indigo)'],['Advance',fmt.inr(viewItem.advancePayment),'var(--emerald)'],['Balance',fmt.inr(viewItem.balanceAmount),viewItem.balanceAmount>0?'var(--red)':'var(--emerald)']].map(([k,v,c])=>(
              <div key={k} style={{textAlign:'center',padding:'10px 6px',background:'var(--white)',borderRadius:8,border:'1px solid var(--border)'}}>
                <div style={{fontSize:'1rem',fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:'.7rem',color:'var(--text-4)',marginTop:2}}>{k}</div>
              </div>
            ))}
          </div>
          {viewItem.changeLog?.length > 0 && (
            <div>
              <div style={{fontWeight:700,fontSize:'.8125rem',marginBottom:6}}>Activity Log</div>
              {viewItem.changeLog.map((l,i)=>(
                <div key={i} style={{fontSize:'.8rem',color:'var(--text-3)',borderLeft:'2px solid var(--indigo-md)',paddingLeft:10,marginBottom:5}}>
                  {l.text} <span style={{color:'var(--text-4)'}}>· {l.by?.name} · {fmt.ago(l.at)}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modal} onClose={()=>{setModal(false);setEditItem(null);setAvail([]);}} title={editItem?`Edit: ${editItem.bookingRef}`:'New Room Booking'} size="modal-lg"
        footer={<><button className="btn btn-ghost btn-sm" onClick={()=>{setModal(false);setEditItem(null);setAvail([]);}}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving?'Saving...':editItem?'Update':'Confirm Booking'}</button></>}
      >
        {/* Availability check */}
        <div style={{background:'var(--indigo-lt)',borderRadius:'var(--radius)',padding:14,border:'1px solid var(--indigo-md)'}}>
          <div style={{fontWeight:700,marginBottom:10,color:'var(--indigo)',fontSize:'.875rem'}}>Room Availability</div>
          <div className="form-row cols-3">
            <FG label="Room Type"><select value={form.roomType} onChange={e=>setForm({...form,roomType:e.target.value,room:''})}>{ROOM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></FG>
            <FG label="Check-in Date" required><input type="date" value={form.checkIn} min={new Date().toISOString().slice(0,10)} onChange={e=>setForm({...form,checkIn:e.target.value})}/></FG>
            <FG label="Check-out Date" required><input type="date" value={form.checkOut} min={form.checkIn||new Date().toISOString().slice(0,10)} onChange={e=>setForm({...form,checkOut:e.target.value})}/></FG>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button className="btn btn-primary btn-sm" onClick={checkAvail}>Check Available Rooms</button>
            {avail.length > 0 && <span style={{fontSize:'.8125rem',color:'var(--emerald)',fontWeight:700}}>{avail.length} room(s) available</span>}
          </div>
          {avail.length > 0 && (
            <FG label="Select Room" required>
              <select value={form.room} onChange={e=>{const r=avail.find(a=>a._id===e.target.value);setForm({...form,room:e.target.value,pricePerNight:r?.pricePerNight||form.pricePerNight,roomNumber:r?.roomNumber,roomType:r?.roomType||form.roomType});}}>
                <option value="">Select a room</option>
                {avail.map(r=><option key={r._id} value={r._id}>{r.roomNumber} - {r.roomType} (₹{r.pricePerNight}/night)</option>)}
              </select>
            </FG>
          )}
        </div>

        <div className="form-row cols-3">
          <FG label="Adults"><input type="number" min="1" value={form.adults} onChange={e=>setForm({...form,adults:e.target.value})}/></FG>
          <FG label="Children"><input type="number" min="0" value={form.children} onChange={e=>setForm({...form,children:e.target.value})}/></FG>
          <FG label="Price/Night (₹)" required><input type="number" value={form.pricePerNight} onChange={e=>setForm({...form,pricePerNight:e.target.value})}/></FG>
        </div>

        {/* Pricing */}
        <div style={{background:'var(--bg-subtle)',borderRadius:'var(--radius)',padding:14}}>
          <div style={{fontWeight:700,marginBottom:10,fontSize:'.875rem'}}>Pricing Breakdown</div>
          <div className="form-row cols-3">
            <FG label="Extra Bed (₹)"><input type="number" value={form.extraBedCharges} onChange={e=>setForm({...form,extraBedCharges:e.target.value})} placeholder="0"/></FG>
            <FG label="Food Charges (₹)"><input type="number" value={form.foodCharges} onChange={e=>setForm({...form,foodCharges:e.target.value})} placeholder="0"/></FG>
            <FG label="Service Charges (₹)"><input type="number" value={form.serviceCharges} onChange={e=>setForm({...form,serviceCharges:e.target.value})} placeholder="0"/></FG>
          </div>
          <div className="form-row cols-2" style={{marginTop:8}}>
            <FG label="GST Rate"><select value={form.gstRate} onChange={e=>setForm({...form,gstRate:e.target.value})}>{GST_RATES.map(r=><option key={r} value={r}>{r===0?'No GST':`GST ${r}%`}</option>)}</select></FG>
            <FG label="Advance Payment (₹)"><input type="number" value={form.advancePayment} onChange={e=>setForm({...form,advancePayment:e.target.value})}/></FG>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginTop:10}}>
            {[['Nights',pricing.nights],['Room Cost','₹'+pricing.roomCost],['Tax','₹'+pricing.tax],['Total','₹'+pricing.total],['Balance','₹'+pricing.balance]].map(([k,v])=>(
              <div key={k} style={{textAlign:'center',padding:'6px 4px',background:'var(--white)',borderRadius:6,border:'1px solid var(--border)'}}>
                <div style={{fontWeight:800,fontSize:'.875rem'}}>{v}</div>
                <div style={{fontSize:'.7rem',color:'var(--text-4)'}}>{k}</div>
              </div>
            ))}
          </div>
          <FG label="Payment Mode" style={{marginTop:8}}>
            <select value={form.paymentMode} onChange={e=>setForm({...form,paymentMode:e.target.value})}>{PAY_MODES.map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}</select>
          </FG>
        </div>

        {/* Customer */}
        <div style={{background:'var(--bg-subtle)',borderRadius:'var(--radius)',padding:14}}>
          <div style={{fontWeight:700,marginBottom:10,fontSize:'.875rem'}}>Guest Details</div>
          <div className="form-row cols-2">
            <FG label="Guest Name" required><input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></FG>
            <FG label="Mobile (10 digits)" required><input type="tel" maxLength={10} value={form.customerMobile} onChange={e=>setForm({...form,customerMobile:e.target.value})}/></FG>
          </div>
          <div className="form-row cols-2">
            <FG label="Email"><input type="email" value={form.customerEmail} onChange={e=>setForm({...form,customerEmail:e.target.value})}/></FG>
            <FG label="Member ID"><input value={form.memberId} onChange={e=>setForm({...form,memberId:e.target.value})} placeholder="If applicable"/></FG>
          </div>
          <div className="form-row cols-2">
            <FG label="ID Proof Type" required><select value={form.idProofType} onChange={e=>setForm({...form,idProofType:e.target.value})}>{ID_PROOFS.map(p=><option key={p} value={p}>{p}</option>)}</select></FG>
            <FG label="ID Proof Number" required><input value={form.idProofNumber} onChange={e=>setForm({...form,idProofNumber:e.target.value})}/></FG>
          </div>
          <FG label="Address"><input value={form.customerAddress} onChange={e=>setForm({...form,customerAddress:e.target.value})}/></FG>
        </div>
        <FG label="Notes"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{minHeight:55}}/></FG>
      </Modal>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState(null);
  useEffect(() => { roomsAPI.stats().then(r=>setStats(r.data)).catch(()=>{}); }, []);
  if (!stats) return <div style={{padding:32,textAlign:'center',color:'var(--text-4)'}}>Loading...</div>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div className="stats-grid">
        <Stat label="Total Rooms"      value={stats.totalRooms}     color="var(--text-1)"/>
        <Stat label="Occupied"         value={stats.occupiedRooms}  color="var(--red)"     sub="Right now"/>
        <Stat label="Available"        value={stats.availableRooms} color="var(--emerald)" sub="Right now"/>
        <Stat label="Occupancy Rate"   value={`${stats.occupancyRate}%`} color="var(--indigo)"/>
        <Stat label="Month Revenue"    value={fmt.inr(stats.monthRevenue)}  color="var(--sky)"/>
        <Stat label="Month Bookings"   value={stats.monthBookings}  color="var(--violet)"/>
        <Stat label="Check-ins Today"  value={stats.checkInsToday}  color="var(--emerald)" sub="Arriving"/>
        <Stat label="Check-outs Today" value={stats.checkOutsToday} color="var(--amber)"   sub="Departing"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1.5px solid var(--border)'}}><h3>Today Check-ins ({stats.checkInsToday})</h3></div>
          {stats.checkInsList?.length===0?<div style={{padding:20,textAlign:'center',color:'var(--text-4)',fontSize:'.875rem'}}>No check-ins today</div>:
            stats.checkInsList?.map(b=>(
              <div key={b._id} style={{padding:'9px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{fontWeight:600,fontSize:'.8125rem'}}>{b.customerName}</div><div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{b.bookingRef} · {b.room?.roomNumber||'-'}</div></div>
                <span style={{background:'var(--emerald-lt)',color:'var(--emerald)',borderRadius:20,padding:'2px 8px',fontSize:'.7rem',fontWeight:700}}>Check-in</span>
              </div>
            ))
          }
        </div>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1.5px solid var(--border)'}}><h3>Today Check-outs ({stats.checkOutsToday})</h3></div>
          {stats.checkOutsList?.length===0?<div style={{padding:20,textAlign:'center',color:'var(--text-4)',fontSize:'.875rem'}}>No check-outs today</div>:
            stats.checkOutsList?.map(b=>(
              <div key={b._id} style={{padding:'9px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{fontWeight:600,fontSize:'.8125rem'}}>{b.customerName}</div><div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{b.bookingRef} · {b.room?.roomNumber||'-'}</div></div>
                <span style={{background:'var(--amber-lt)',color:'var(--amber)',borderRadius:20,padding:'2px 8px',fontSize:'.7rem',fontWeight:700}}>Check-out</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const [tab, setTab] = useState('dashboard');
  return (
    <div className="page">
      <PageHdr icon={Building2} title="Rooms & Hotel" color="var(--sky)"/>
      <div style={{padding:'0 24px',background:'var(--white)',borderBottom:'1.5px solid var(--border)'}}>
        <Tabs tabs={[{id:'dashboard',label:'Dashboard'},{id:'bookings',label:'Bookings'},{id:'rooms',label:'Room Management'}]} active={tab} onChange={setTab}/>
      </div>
      <div className="page-body">
        {tab==='dashboard' && <DashboardTab/>}
        {tab==='bookings'  && <BookingsTab/>}
        {tab==='rooms'     && <RoomsTab/>}
      </div>
    </div>
  );
}
