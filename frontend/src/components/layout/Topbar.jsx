import React, { useState, useEffect, useRef } from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { notifAPI } from '../../api';
import { fmt } from '../../utils/helpers';

export function Topbar({ onToggle, breadcrumb }) {
  const [notifs, setNotifs]   = useState([]);
  const [open,   setOpen]     = useState(false);
  const ref = useRef(null);

  useEffect(() => { notifAPI.list().then(r=>setNotifs(r.data)).catch(()=>{}); }, []);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn); return () => document.removeEventListener('mousedown', fn);
  }, []);

  const unread = notifs.filter(n => !n.readBy?.includes(n._id)).length;
  const markAll = async () => { await notifAPI.readAll(); setNotifs(n=>n.map(x=>({...x,readBy:['read']}))); };

  return (
    <div className="topbar">
      <button onClick={onToggle} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--text-3)',display:'flex',padding:6,borderRadius:8}}>
        <Menu size={18}/>
      </button>
      {breadcrumb && <div style={{fontSize:'.8125rem',color:'var(--text-3)',fontWeight:500}}>{breadcrumb}</div>}
      <div style={{flex:1}}/>
      <div style={{position:'relative'}} ref={ref}>
        <button onClick={()=>setOpen(o=>!o)} style={{position:'relative',background:'transparent',border:'none',cursor:'pointer',color:'var(--text-3)',display:'flex',padding:8,borderRadius:8}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <Bell size={17}/>
          {unread>0&&<span style={{position:'absolute',top:4,right:4,width:8,height:8,borderRadius:'50%',background:'var(--red)',border:'2px solid var(--white)'}}/>}
        </button>
        {open&&(
          <div className="notif-panel fade-in">
            <div className="flex items-center justify-between" style={{padding:'12px 16px 10px',borderBottom:'1.5px solid var(--border)'}}>
              <span style={{fontWeight:700,fontSize:'.875rem'}}>Notifications{unread>0&&<span style={{marginLeft:6,background:'var(--red)',color:'#fff',borderRadius:20,padding:'1px 7px',fontSize:'.7rem'}}>{unread}</span>}</span>
              <div className="flex gap-2">
                {unread>0&&<button onClick={markAll} style={{background:'none',border:'none',cursor:'pointer',fontSize:'.75rem',color:'var(--indigo)',fontWeight:600}}>Mark all read</button>}
                <button onClick={()=>setOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-4)',display:'flex'}}><X size={14}/></button>
              </div>
            </div>
            <div style={{maxHeight:360,overflowY:'auto'}}>
              {notifs.length===0?<div style={{padding:28,textAlign:'center',color:'var(--text-4)',fontSize:'.875rem'}}>No notifications</div>:
                notifs.slice(0,25).map(n=>(
                  <div key={n._id} className={'notif-item '+(n.readBy?.length?'':'unread')}>
                    <div className="flex gap-2">
                      <div style={{width:7,height:7,borderRadius:'50%',background:n.type==='alert'?'var(--red)':n.type==='warning'?'var(--amber)':n.type==='success'?'var(--emerald)':'var(--sky)',marginTop:5,flexShrink:0}}/>
                      <div>
                        <div style={{fontWeight:600,fontSize:'.8125rem'}}>{n.title}</div>
                        <div style={{fontSize:'.75rem',color:'var(--text-3)',marginTop:2}}>{n.message}</div>
                        <div style={{fontSize:'.7rem',color:'var(--text-4)',marginTop:3}}>{fmt.ago(n.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
