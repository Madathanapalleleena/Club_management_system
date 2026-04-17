import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { roleDash } from './utils/helpers';
import AppLayout from './components/layout/AppLayout';
import Login from './components/auth/Login';
import { LoadingPage } from './components/ui';

import ChairmanDashboard from './components/modules/dashboard/ChairmanDashboard';
import GMDashboard from './components/modules/dashboard/GMDashboard';
import { DepartmentDashboard } from './components/modules/dashboard/DeptDashboard';
import { ProcurementDashboard, StoreDashboard, KitchenDashboard, AccountsDashboard, HRDashboard } from './components/modules/dashboard/OperationalDashboards';

import ProcurementPage from './components/modules/procurement/ProcurementPage';
import StorePage from './components/modules/store/StorePage';
import KitchenPage from './components/modules/kitchen/KitchenPage';
import BanquetPage from './components/modules/banquet/BanquetPage';
import RoomsPage from './components/modules/rooms/RoomsPage';
import AccountsPage from './components/modules/accounts/AccountsPage';
import HRPage from './components/modules/hr/HRPage';
import DirectorsPage from './components/modules/directors/DirectorsPage';

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage/>;
  if (!user) return <Navigate to="/login" replace/>;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace/>;
  return children;
}

function PublicGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage/>;
  if (user) {
    const d = roleDash(user.role);
    return <Navigate to={d === 'chairman' ? '/' : '/' + d} replace/>;
  }
  return children;
}

function RoleDash() {
  const { user } = useAuth();
  if (!user) return <LoadingPage/>;
  const map = {
    chairman: <ChairmanDashboard/>, secretary: <ChairmanDashboard/>,
    gm: <GMDashboard/>, agm: <GMDashboard/>,
    procurement_manager: <ProcurementDashboard/>, procurement_assistant: <ProcurementDashboard/>,
    store_manager: <StoreDashboard/>, store_assistant: <StoreDashboard/>,
    kitchen_manager: <KitchenDashboard/>, food_control: <KitchenDashboard/>,
    accounts_manager: <AccountsDashboard/>, hr_manager: <HRDashboard/>,
    banquet_manager: <BanquetPage/>, rooms_manager: <RoomsPage/>,
    bar_manager: <DepartmentDashboard dept="bar"/>,
    sports_manager: <DepartmentDashboard dept="sports"/>,
    maintenance_manager: <DepartmentDashboard dept="maintenance"/>,
    staff: <GMDashboard/>,
  };
  return map[user.role] || <GMDashboard/>;
}

const SUPER  = ['chairman','secretary','gm','agm'];
const PROC   = [...SUPER,'procurement_manager','procurement_assistant'];
const STORE  = [...SUPER,'store_manager','store_assistant'];
const KITCH  = [...SUPER,'kitchen_manager','food_control'];
const ACCT   = [...SUPER,'accounts_manager'];
const HR     = [...SUPER,'hr_manager'];
const BANQ   = [...SUPER,'banquet_manager'];
const ROOMS  = [...SUPER,'rooms_manager'];
const BAR    = [...SUPER,'bar_manager'];
const SPORTS = [...SUPER,'sports_manager'];
const MAINT  = [...SUPER,'maintenance_manager'];

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicGuard><Login/></PublicGuard>}/>
      <Route path="/" element={<Guard><AppLayout/></Guard>}>
        <Route index element={<Guard><RoleDash/></Guard>}/>

        {/* Dashboards */}
        <Route path="procurement"            element={<Guard roles={PROC}><ProcurementDashboard/></Guard>}/>
        <Route path="store"                  element={<Guard roles={[...STORE,...PROC]}><StoreDashboard/></Guard>}/>
        <Route path="kitchen"                element={<Guard roles={KITCH}><KitchenDashboard/></Guard>}/>
        <Route path="banquet"                element={<Guard roles={BANQ}><BanquetPage/></Guard>}/>
        <Route path="rooms"                  element={<Guard roles={ROOMS}><RoomsPage/></Guard>}/>
        <Route path="accounts"               element={<Guard roles={ACCT}><AccountsDashboard/></Guard>}/>
        <Route path="hr"                     element={<Guard roles={HR}><HRDashboard/></Guard>}/>
        <Route path="bar"                    element={<Guard roles={BAR}><DepartmentDashboard dept="bar"/></Guard>}/>
        <Route path="sports"                 element={<Guard roles={SPORTS}><DepartmentDashboard dept="sports"/></Guard>}/>
        <Route path="maintenance"            element={<Guard roles={MAINT}><DepartmentDashboard dept="maintenance"/></Guard>}/>

        {/* Work modules */}
        <Route path="procurement/requests"   element={<Guard roles={PROC}><ProcurementPage/></Guard>}/>
        <Route path="procurement/vendors"    element={<Guard roles={PROC}><ProcurementPage defaultTab="vendors"/></Guard>}/>
        <Route path="procurement/orders"     element={<Guard roles={PROC}><ProcurementPage defaultTab="orders"/></Guard>}/>
        <Route path="procurement/tracking"   element={<Guard roles={PROC}><ProcurementPage defaultTab="tracking"/></Guard>}/>
        <Route path="procurement/quality"    element={<Guard roles={PROC}><ProcurementPage defaultTab="quality"/></Guard>}/>
        <Route path="store/inventory"        element={<Guard roles={[...STORE,...PROC]}><StorePage defaultTab="items"/></Guard>}/>
        <Route path="store/grc"              element={<Guard roles={[...STORE,...PROC]}><StorePage defaultTab="grc"/></Guard>}/>
        <Route path="store/requests"         element={<Guard roles={[...STORE,...SUPER]}><StorePage defaultTab="internal"/></Guard>}/>
        <Route path="store/tracking"         element={<Guard roles={[...STORE,...PROC]}><StorePage defaultTab="tracking"/></Guard>}/>
        <Route path="kitchen/requests"       element={<Guard roles={KITCH}><KitchenPage/></Guard>}/>
        <Route path="kitchen/utilization"    element={<Guard roles={KITCH}><KitchenPage defaultTab="utilization"/></Guard>}/>
        <Route path="accounts/records"       element={<Guard roles={ACCT}><AccountsPage/></Guard>}/>
        <Route path="hr/staff"               element={<Guard roles={HR}><HRPage/></Guard>}/>
        <Route path="directors"              element={<Guard roles={['chairman','secretary']}><DirectorsPage/></Guard>}/>

        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes/>
        <Toaster position="top-right" toastOptions={{ style:{ background:'#fff', color:'#0d1526', border:'1.5px solid #e1e6f0', borderRadius:'10px', fontSize:'.875rem', fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'0 4px 16px rgba(13,21,38,.12)' }, success:{ iconTheme:{ primary:'#059669', secondary:'#fff' } }, error:{ iconTheme:{ primary:'#dc2626', secondary:'#fff' } } }}/>
      </AuthProvider>
    </BrowserRouter>
  );
}
