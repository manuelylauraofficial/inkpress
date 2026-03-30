import { NavLink } from 'react-router-dom'
import '../styles/Sidebar.css'

const menuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/clienti', label: 'Clienti', icon: '👥' },
  { to: '/magazzino', label: 'Magazzino', icon: '👕' },
  { to: '/ordini', label: 'Ordini', icon: '🧾' },
  { to: '/movimenti', label: 'Movimenti', icon: '📦' },
]

export default function Sidebar({ open, onClose }) {
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
      </aside>
    </>
  )
}