import { Menu, X, Sun, Moon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import '../styles/Header.css'

export default function Header({ sidebarOpen, onToggleSidebar, theme = 'dark', onToggleTheme }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const isLight = theme === 'light'

  return (
    <header className="topHeader">
      <div className="headerLeft">
        <button className="sidebarToggleBtn" onClick={onToggleSidebar} type="button" aria-label="Apri menu">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div>
          <h1 className="pageTitle">Inkpress</h1>
          <p className="pageSubtitle">Gestione ordini, clienti e magazzino abbigliamento</p>
        </div>
      </div>

      <div className="headerActions">
        <button className="secondaryBtn headerBtn" onClick={onToggleTheme} type="button">
          {isLight ? <Moon size={18} /> : <Sun size={18} />}
          <span>{isLight ? 'Tema scuro' : 'Tema chiaro'}</span>
        </button>

        <button className="secondaryBtn headerBtn" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </header>
  )
}
