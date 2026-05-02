import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Review from './pages/Review';
import './App.css';

function Nav() {
  return (
    <nav className="app-nav">
      <span className="app-nav__brand">MB AutoTime</span>
      <div className="app-nav__links">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/review"
          className={({ isActive }) =>
            `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
          }
        >
          Review
        </NavLink>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/review" element={<Review />} />
      </Routes>
    </BrowserRouter>
  );
}