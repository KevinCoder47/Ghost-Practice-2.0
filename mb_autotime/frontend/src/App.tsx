import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PendingCountProvider, usePendingCount } from './context/PendingCountContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Review from './pages/Review';
import Report from './pages/Report';
import LogTime from './pages/LogTime';
import Invoice from './pages/Invoice';

// Inner component so it can consume the context
function AppRoutes() {
  const { pendingCount } = usePendingCount();

  return (
    <Layout pendingCount={pendingCount}>
      <Routes>
        <Route path="/"        element={<Dashboard />} />
        <Route path="/pending" element={<Review />} />
        <Route path="/report"  element={<Report />} />
        <Route path="/log"     element={<LogTime />} />
        <Route path="/invoice" element={<Invoice />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PendingCountProvider>
        <AppRoutes />
      </PendingCountProvider>
    </BrowserRouter>
  );
}