import { NavLink } from 'react-router-dom'
import { Sun, Moon, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import '../styles/Sidebar.css'

const menuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/clienti', label: 'Clienti', icon: '👥' },
  { to: '/magazzino', label: 'Magazzino', icon: '👕' },
  { to: '/ordini', label: 'Ordini', icon: '🧾' },
  { to: '/movimenti', label: 'Movimenti', icon: '📦' },
]

export default function Sidebar({ open, onClose, theme = 'dark', onToggleTheme }) {
  const isLight = theme === 'light'

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <>
      <div className={open ? 'sidebarOverlay visible' : 'sidebarOverlay'} onClick={onClose} />

      <aside className={open ? 'sidebar mobileOpen' : 'sidebar'}>
        <div className="brandBox">
          <div className="brandLogo">INK</div>
          <div>
            <h1 className="brandTitle">Inkpress</h1>
            <p className="brandSubtitle">Order & Stock Manager</p>
          </div>
        </div>

        <nav className="navMenu">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}
            >
              <span className="navIcon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebarActions">
          <button className="sidebarActionBtn" onClick={onToggleTheme} type="button">
            {isLight ? <Moon size={18} /> : <Sun size={18} />}
            <span>{isLight ? 'Tema scuro' : 'Tema chiaro'}</span>
          </button>

          <button className="sidebarActionBtn" onClick={handleLogout} type="button">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}