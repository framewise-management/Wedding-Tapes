import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Setup from './pages/Setup';
import BusinessProfile from './pages/BusinessProfile';
import Profile from './pages/Profile';
import Customers from './pages/Customers';
import Services from './pages/Services';
import Packages from './pages/Packages';
import PackageDetail from './pages/PackageDetail';
import CreateProposal from './pages/CreateProposal';
import PackageServiceSelection from './pages/PackageServiceSelection';
import ProposalPreview from './pages/ProposalPreview';
import ProposalHistory from './pages/ProposalHistory';
import PublicProposal from './pages/PublicProposal';
import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './components/AppLayout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/p/:id" element={<PublicProposal />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/business" element={<BusinessProfile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/services" element={<Services />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/packages/:id" element={<PackageDetail />} />
          <Route path="/proposals" element={<ProposalHistory />} />
          <Route path="/proposals/new" element={<CreateProposal />} />
          <Route path="/proposals/:id/edit" element={<CreateProposal />} />
          <Route
            path="/proposals/new/packages"
            element={<PackageServiceSelection />}
          />
          <Route path="/proposals/:id/preview" element={<ProposalPreview />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
