import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Library from "./pages/Library.jsx";
import Reader from "./pages/Reader.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import VocabBook from "./pages/VocabBook.jsx";
import "./App.css";

function NavBar() {
  return (
    <nav className="app-nav">
      <span className="app-nav__brand">論文リーダー</span>
      <div className="app-nav__links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          ライブラリ
        </NavLink>
        <NavLink to="/vocab" className={({ isActive }) => (isActive ? "active" : "")}>
          単語帳
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
          ダッシュボード
        </NavLink>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <NavBar />
                <Library />
              </>
            }
          />
          <Route
            path="/vocab"
            element={
              <>
                <NavBar />
                <VocabBook />
              </>
            }
          />
          <Route
            path="/dashboard"
            element={
              <>
                <NavBar />
                <Dashboard />
              </>
            }
          />
          <Route path="/reader/:id" element={<Reader />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
