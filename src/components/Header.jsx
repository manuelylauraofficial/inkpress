import { Menu, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import '../styles/Header.css'

export default function Header({ sidebarOpen, onToggleSidebar }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <header className="topHeader">
      <div className="headerLeft">
        <button className="sidebarToggleBtn" onClick={onToggleSidebar} type="button">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div>
          <h2 className="pageTitle">Inkpress</h2>
          <p className="pageSubtitle">
            Gestione ordini, clienti e magazzino abbigliamento
          </p>
        </div>
      </div>

      <div className="headerActions">
        <button className="secondaryBtn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  )
}