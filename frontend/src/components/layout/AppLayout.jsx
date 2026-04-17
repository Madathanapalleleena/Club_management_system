import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Topbar } from './Topbar';

const LABELS = {
  '/':'Dashboard','/dashboard':'Dashboard','/directors':'Directors','/procurement':'Procurement','/procurement/requests':'Requirements','/procurement/vendors':'Vendors','/procurement/orders':'Purchase Orders','/procurement/tracking':'Order Tracking','/procurement/quality':'Quality & GRC','/store':'Store','/store/inventory':'Inventory','/store/grc':'GRC','/store/requests':'Internal Requests','/store/tracking':'Order Tracking','/kitchen':'Kitchen','/kitchen/requests':'Kitchen Requests','/kitchen/utilization':'Utilization','/banquet':'Banquet','/rooms':'Rooms','/accounts':'Accounts','/accounts/records':'Finance Records','/hr':'HR','/hr/staff':'Staff List','/bar':'Bar','/sports':'Sports','/maintenance':'Maintenance',
};
const getLBL = path => LABELS[path] || path.split('/').filter(Boolean).map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(' › ');

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <Sidebar collapsed={collapsed}/>
      <div style={{marginLeft:collapsed?62:'var(--sidebar-w)',flex:1,display:'flex',flexDirection:'column',overflow:'hidden',transition:'margin-left var(--t) var(--ease)'}}>
        <Topbar onToggle={()=>setCollapsed(c=>!c)} breadcrumb={getLBL(pathname)}/>
        <main style={{flex:1,overflowY:'auto',background:'var(--bg)'}}>
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
