import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard,Shield,Users,ShoppingCart,Package,UtensilsCrossed,Calculator,UserCog,Wrench,Wine,Building2,Trophy,LogOut,Star,ChevronRight,Hotel,CalendarDays } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { roleColor, roleBg, roleLabel, initials } from '../../utils/helpers';

const NAV = [
  { id:'home',        label:'Dashboard',    path:'/',               icon:LayoutDashboard, roles:null },
  { id:'directors',   label:'Directors',    path:'/directors',      icon:Shield,          roles:['chairman','secretary'] },
  { id:'procurement', label:'Procurement',  icon:ShoppingCart,      roles:['chairman','secretary','gm','agm','director','procurement_manager','procurement_assistant'],
    children:[{label:'Dashboard',path:'/procurement'},{label:'Requirements',path:'/procurement/requests'},{label:'Vendors',path:'/procurement/vendors'},{label:'Purchase Orders',path:'/procurement/orders'},{label:'Order Tracking',path:'/procurement/tracking'},{label:'Quality & GRC',path:'/procurement/quality'}] },
  { id:'store',       label:'Store',        icon:Package,           roles:['chairman','secretary','gm','agm','store_manager','store_assistant','procurement_manager','bar_manager','banquet_manager','rooms_manager','sports_manager','maintenance_manager','hr_manager','accounts_manager'],
    children:[
      {label:'Dashboard',path:'/store',roles:['chairman','secretary','gm','agm','store_manager','store_assistant','procurement_manager']},
      {label:'Inventory',path:'/store/inventory',roles:['chairman','secretary','gm','agm','store_manager','store_assistant','procurement_manager']},
      {label:'GRC',path:'/store/grc',roles:['chairman','secretary','gm','agm','store_manager','store_assistant','procurement_manager']},
      {label:'Internal Requests',path:'/store/requests'},
      {label:'Order Tracking',path:'/store/tracking',roles:['chairman','secretary','gm','agm','store_manager','store_assistant','procurement_manager']},
      {label:'Assistants',path:'/store/assistants',roles:['store_manager']},
    ] },

  { id:'kitchen',     label:'Kitchen',      icon:UtensilsCrossed,   roles:['chairman','secretary','gm','agm','kitchen_manager','food_control'],
    children:[{label:'Dashboard',path:'/kitchen'},{label:'Requests',path:'/kitchen/requests'},{label:'Utilization',path:'/kitchen/utilization'}] },
  { id:'banquet',     label:'Banquet',      path:'/banquet',        icon:CalendarDays,    roles:['chairman','secretary','gm','agm','banquet_manager'] },
  { id:'rooms',       label:'Rooms & Hotel',path:'/rooms',          icon:Hotel,           roles:['chairman','secretary','gm','agm','rooms_manager'] },
  { id:'bar',         label:'Bar & Liquor', path:'/bar',            icon:Wine,            roles:['chairman','secretary','gm','agm','bar_manager'] },
  { id:'sports',      label:'Sports',       path:'/sports',         icon:Trophy,          roles:['chairman','secretary','gm','agm','sports_manager'] },
  { id:'accounts',    label:'Accounts',     icon:Calculator,        roles:['chairman','secretary','gm','agm','accounts_manager'],
    children:[{label:'Dashboard',path:'/accounts'},{label:'P&L / Records',path:'/accounts/records'}] },
  { id:'hr',          label:'HR & Staff',   icon:UserCog,           roles:['chairman','secretary','gm','agm','hr_manager'],
    children:[{label:'Dashboard',path:'/hr'},{label:'Staff List',path:'/hr/staff'}] },
  { id:'maintenance', label:'Maintenance',  path:'/maintenance',    icon:Wrench,          roles:['chairman','secretary','gm','agm','maintenance_manager'] },
];

export default function Sidebar({ collapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = React.useState({});
  const color = roleColor(user?.role);
  const bg    = roleBg(user?.role);
  const visNav = NAV.filter(n => !n.roles || n.roles.includes(user?.role || ''));
  const toggle = id => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <div className="sidebar" style={{ width: collapsed ? 62 : 'var(--sidebar-w)' }}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark" style={{ background:`linear-gradient(135deg,${color},${color}cc)` }}><Star size={15} fill="#fff" color="#fff"/></div>
        {!collapsed && <div><div className="sidebar-logo-text">ClubMS</div><div className="sidebar-logo-sub">Management System</div></div>}
      </div>
      <nav style={{ flex:1,overflowY:'auto',overflowX:'hidden',padding:'8px 0' }}>
        {visNav.map(item => {
          const Icon = item.icon;
          const hasChildren = !collapsed && item.children;
          const isOpen = expanded[item.id];
          if (hasChildren) {
            const visibleChildren = item.children.filter(c => !c.roles || c.roles.includes(user?.role || ''));
            if (visibleChildren.length === 0) return null;
            return (
              <div key={item.id}>
                <div onClick={() => toggle(item.id)} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 14px 8px 18px',margin:'1px 8px',borderRadius:'var(--r)',cursor:'pointer',color:'var(--text-2)',fontSize:'.875rem',fontWeight:500,transition:'all var(--t)',userSelect:'none' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{flexShrink:0,display:'flex'}}><Icon size={16}/></span>
                  <span style={{flex:1,whiteSpace:'nowrap'}}>{item.label}</span>
                  <ChevronRight size={13} style={{transform:isOpen?'rotate(90deg)':'none',transition:'transform var(--t)',color:'var(--text-4)'}}/>
                </div>
                {isOpen && (
                  <div style={{paddingLeft:28,paddingRight:8,paddingBottom:4}}>
                    {visibleChildren.map(c => (
                      <NavLink key={c.path} to={c.path} end={c.path.split('/').length<=2}

                        style={({isActive})=>({display:'block',padding:'5px 14px',borderRadius:'var(--r)',marginBottom:2,color:isActive?color:'var(--text-3)',background:isActive?bg:'transparent',fontSize:'.8125rem',fontWeight:isActive?700:400,textDecoration:'none',transition:'all var(--t)',borderLeft:isActive?`2px solid ${color}`:'2px solid transparent'})}>
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink key={item.id} to={item.path} end={item.path==='/'} style={({isActive})=>({display:'flex',alignItems:'center',gap:collapsed?0:10,padding:collapsed?'10px 0':'8px 14px 8px 18px',margin:collapsed?'1px 6px':'1px 8px',borderRadius:'var(--r)',justifyContent:collapsed?'center':'flex-start',color:isActive?color:'var(--text-2)',background:isActive?bg:'transparent',textDecoration:'none',fontSize:'.875rem',fontWeight:isActive?700:500,transition:'all var(--t)',borderLeft:isActive&&!collapsed?`3px solid ${color}`:'3px solid transparent'})}>
              <span style={{flexShrink:0,display:'flex'}}><Icon size={16}/></span>
              {!collapsed && <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        {!collapsed ? (
          <div className="user-card">
            <div className="user-avatar" style={{background:color,fontSize:'.8125rem'}}>{initials(user?.name)}</div>
            <div style={{flex:1,minWidth:0}}><div className="user-name truncate">{user?.name}</div><div className="user-role">{roleLabel(user?.role)}</div></div>
            <button onClick={()=>{logout();navigate('/login');}} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--text-4)',display:'flex',padding:4,borderRadius:6,flexShrink:0}} title="Logout"><LogOut size={15}/></button>
          </div>
        ) : (
          <button onClick={()=>{logout();navigate('/login');}} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--text-4)',display:'flex',padding:10,borderRadius:8,width:'100%',justifyContent:'center'}}><LogOut size={16}/></button>
        )}
      </div>
    </div>
  );
}
