import React from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { fmt, initials, roleColor, roleBg } from '../../utils/helpers';

export const Spinner = ({ size=18 }) => <Loader2 size={size} className="spin" style={{color:'var(--indigo)'}}/>;
export const LoadingPage = ({ text='Loading...' }) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',gap:10,color:'var(--text-3)',flexDirection:'column',padding:40}}>
    <Spinner size={24}/><span style={{fontSize:'.875rem'}}>{text}</span>
  </div>
);

export const Modal = ({ open, onClose, title, children, footer, size='' }) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={'modal '+size}>
        <div className="modal-header"><h3>{title}</h3><button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><X size={15}/></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export const FG = ({ label, required, children, hint, error }) => (
  <div className="form-group">
    {label && <label className={required?'required':''}>{label}</label>}
    {children}
    {hint && <div className="form-hint">{hint}</div>}
    {error && <div style={{fontSize:'.75rem',color:'var(--red)',marginTop:2}}><AlertCircle size={11} style={{display:'inline',marginRight:3}}/>{error}</div>}
  </div>
);

export const Tabs = ({ tabs, active, onChange }) => (
  <div className="tabs">
    {tabs.map(t => (
      <button key={t.id} className={'tab '+(active===t.id?'active':'')} onClick={()=>onChange(t.id)}>
        {t.label}{t.count!=null&&<span className="tab-count">{t.count}</span>}
      </button>
    ))}
  </div>
);

export const Stat = ({ label, value, sub, color, icon: Icon, trend }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between" style={{marginBottom:6}}>
      <div className="stat-label">{label}</div>
      {Icon && <div style={{width:32,height:32,borderRadius:8,background:color?color+'18':'var(--bg-subtle)',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={16} style={{color:color||'var(--text-4)'}}/></div>}
    </div>
    <div className="stat-value" style={{color:color||'var(--text-1)'}}>{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
    {trend!==undefined && <div style={{display:'flex',alignItems:'center',gap:3,fontSize:'.75rem',fontWeight:600,color:trend>=0?'var(--emerald)':'var(--red)',marginTop:4}}>{trend>=0?'↑':'↓'} {Math.abs(trend).toFixed(1)}%</div>}
  </div>
);

export const Empty = ({ icon: Icon, title, sub, action }) => (
  <div className="empty-state">
    <div className="empty-icon">{Icon&&<Icon size={24}/>}</div>
    <div className="empty-title">{title}</div>
    {sub&&<div className="empty-sub">{sub}</div>}
    {action&&<div style={{marginTop:12}}>{action}</div>}
  </div>
);

export const PageHdr = ({ icon: Icon, title, color, children }) => (
  <div className="page-header">
    <div className="page-header-left">
      {Icon&&<div style={{width:34,height:34,borderRadius:'var(--r)',background:color?color+'18':'var(--indigo-lt)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Icon size={18} style={{color:color||'var(--indigo)'}}/></div>}
      <h2>{title}</h2>
    </div>
    <div className="page-header-right">{children}</div>
  </div>
);

export const Badge = ({ cls, label }) => <span className={'badge '+cls}>{label}</span>;

export const Avatar = ({ name, role, size=34 }) => (
  <div style={{width:size,height:size,borderRadius:Math.round(size*0.25),background:roleBg(role),color:roleColor(role),display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.35,fontWeight:700,flexShrink:0}}>
    {initials(name)}
  </div>
);

export const Confirm = ({ open, onClose, onConfirm, title='Confirm', message, danger }) => (
  <Modal open={open} onClose={onClose} title={title}
    footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className={'btn btn-sm '+(danger?'btn-danger':'btn-primary')} onClick={()=>{onConfirm();onClose();}}>Confirm</button></>}
  ><p style={{color:'var(--text-2)'}}>{message}</p></Modal>
);

export const ChartTip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{display:'flex',gap:8,color:'var(--text-2)',marginTop:2}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:p.color,display:'inline-block',marginRight:4,marginTop:4,flexShrink:0}}/>
          <span style={{color:'var(--text-3)',minWidth:70}}>{p.name}:</span>
          <span style={{fontWeight:700,color:'var(--text-1)'}}>{typeof p.value==='number'&&p.value>1000?'₹'+Number(p.value).toLocaleString('en-IN'):p.value}</span>
        </div>
      ))}
    </div>
  );
};

export const SectionCard = ({ title, action, children, noPad }) => (
  <div className="card" style={noPad?{padding:0,overflow:'hidden'}:{}}>
    {(title||action)&&(
      <div className="flex items-center justify-between" style={{marginBottom:noPad?0:14,padding:noPad?'12px 16px':0,borderBottom:noPad?'1.5px solid var(--border)':'none'}}>
        {title&&<h3>{title}</h3>}{action}
      </div>
    )}
    {children}
  </div>
);

export const ChangeLog = ({ log = [] }) => {
  if (!log.length) return null;
  return (
    <div>
      <div style={{fontWeight:700,fontSize:'.8125rem',marginBottom:8}}>Activity Log</div>
      {log.map((l,i) => (
        <div key={i} style={{fontSize:'.8rem',color:'var(--text-3)',borderLeft:'2px solid var(--indigo-md)',paddingLeft:10,marginBottom:5}}>
          <span style={{fontWeight:600,color:'var(--text-2)'}}>{l.action?.replace(/_/g,' ')}</span>
          {l.note && ' — ' + l.note}
          {(l.performedBy||l.by) && <span style={{color:'var(--text-4)'}}> · {(l.performedBy||l.by)?.name} ({(l.performedBy||l.by)?.role})</span>}
          <span style={{color:'var(--text-4)'}}> · {fmt.ago(l.performedAt||l.at||l.createdAt)}</span>
        </div>
      ))}
    </div>
  );
};
