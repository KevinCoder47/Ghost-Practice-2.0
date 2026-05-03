import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Review from './pages/Review';
import Report from './pages/Report';
import LogTime from './pages/LogTime';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
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