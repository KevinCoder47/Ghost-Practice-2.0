import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Review from './pages/Review';
import Report from './pages/Report';
import LogTime from './pages/LogTime';
import { getTimeEntries } from './services/api';

export default function App() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getTimeEntries({ status: 'pending' })
      .then(entries => setPendingCount(entries.length))
      .catch(() => setPendingCount(0));
  }, []);

  return (
    <BrowserRouter>
      <Layout pendingCount={pendingCount}>
        <Routes>
          <Route path="/"        element={<Dashboard />} />
          <Route path="/pending" element={<Review />} />
          <Route path="/report"  element={<Report />} />
          <Route path="/log"     element={<LogTime />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}