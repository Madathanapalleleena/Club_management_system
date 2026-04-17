import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { roleDash } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Star, Loader2 } from 'lucide-react';

const DEMO = [
  ['Chairman',          'chairman@club.com',    '#b45309'],
  ['Secretary',         'secretary@club.com',   '#7c3aed'],
  ['General Manager',   'gm@club.com',          '#0369a1'],
  ['Procurement Mgr',   'procurement@club.com', '#065f46'],
  ['Store Manager',     'store@club.com',        '#92400e'],
  ['Kitchen Manager',   'kitchen@club.com',     '#dc2626'],
  ['Accounts Manager',  'accounts@club.com',    '#1e40af'],
  ['HR Manager',        'hr@club.com',          '#6d28d9'],
  ['Banquet Manager',   'banquet@club.com',     '#0f766e'],
  ['Rooms Manager',     'rooms@club.com',        '#1d4ed8'],
  ['Bar Manager',       'bar@club.com',          '#b45309'],
  ['Sports Manager',    'sports@club.com',       '#15803d'],
];

export default function Login() {
  const [email,    setEmail]   = useState('');
  const [password, setPw]      = useState('');
  const [showPw,   setShowPw]  = useState(false);
  const [loading,  setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const submit = async e => {
    e.preventDefault();
    if (!email || !password) { toast.error('Enter email and password'); return; }
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success('Welcome, ' + user.name.split(' ')[0] + '!');
      const d = roleDash(user.role);
      navigate(d === 'chairman' ? '/' : '/' + d);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f0f4ff 0%,#fafbff 50%,#f5f0ff 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{position:'fixed',top:'-10%',right:'-5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(79,70,229,.08) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <div style={{display:'flex',gap:32,width:'100%',maxWidth:940,alignItems:'flex-start',flexWrap:'wrap',justifyContent:'center'}}>

        {/* Login form */}
        <div style={{flex:'1 1 320px',maxWidth:400}}>
          <div style={{textAlign:'center',marginBottom:28}}>
            <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,#4f46e5,#7c3aed)',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:14,boxShadow:'0 8px 24px rgba(79,70,229,.3)'}}>
              <Star size={22} fill="#fff" color="#fff"/>
            </div>
            <h1 style={{fontSize:'1.6rem',marginBottom:4}}>Club Management</h1>
            <p style={{color:'var(--text-3)',fontSize:'.9375rem'}}>Sign in to your workspace</p>
          </div>
          <div style={{background:'var(--white)',borderRadius:20,boxShadow:'0 4px 24px rgba(13,21,38,.08),0 0 0 1.5px var(--border)',padding:32}}>
            <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="form-group">
                <label>Email address</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoFocus autoComplete="email"/>
              </div>
              <div className="form-group">
                <label>Password</label>
                <div style={{position:'relative'}}>
                  <input type={showPw?'text':'password'} value={password} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={{paddingRight:40}} autoComplete="current-password"/>
                  <button type="button" onClick={()=>setShowPw(p=>!p)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-4)',display:'flex'}}>
                    {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{justifyContent:'center',padding:'10px 16px',fontSize:'.9375rem',marginTop:4}}>
                {loading?<Loader2 size={17} className="spin"/>:'Sign in →'}
              </button>
            </form>
          </div>
        </div>

        {/* Demo accounts */}
        <div style={{width:300,flexShrink:0,background:'var(--white)',borderRadius:20,boxShadow:'0 4px 24px rgba(13,21,38,.08),0 0 0 1.5px var(--border)',overflow:'hidden'}}>
          <div style={{padding:'12px 18px',borderBottom:'1.5px solid var(--border)',background:'var(--bg-subtle)'}}>
            <div style={{fontSize:'.72rem',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--text-4)'}}>Demo Accounts</div>
            <div style={{fontSize:'.75rem',color:'var(--text-4)',marginTop:2}}>Password: <strong style={{color:'var(--text-2)'}}>Admin@123</strong></div>
          </div>
          <div style={{padding:'6px 0',maxHeight:400,overflowY:'auto'}}>
            {DEMO.map(([role,em,color]) => (
              <button key={em} onClick={()=>{setEmail(em);setPw('Admin@123');}}
                style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'7px 18px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left',transition:'background var(--t)'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{width:28,height:28,borderRadius:7,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.65rem',fontWeight:800,color,flexShrink:0}}>
                  {role.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div style={{fontSize:'.8125rem',fontWeight:600,color:'var(--text-1)'}}>{role}</div>
                  <div style={{fontSize:'.72rem',color:'var(--text-4)'}}>{em}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
