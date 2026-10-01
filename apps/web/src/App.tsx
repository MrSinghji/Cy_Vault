import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Identities from './pages/Identities';
import Assets from './pages/Assets';
import Roles from './pages/Roles';
import Audit from './pages/Audit';
import Verify from './pages/Verify';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/identities" element={<Identities />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
