import { Menu, X } from 'lucide-react'
import '../styles/Header.css'

export default function Header({ sidebarOpen, onToggleSidebar }) {
  return (
    <header className="topHeader">
      <div className="headerLeft">
        <button
          className="sidebarToggleBtn"
          onClick={onToggleSidebar}
          type="button"
          aria-label="Apri menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div>
          <h1 className="pageTitle">Inkpress</h1>
          <p className="pageSubtitle">Gestione ordini, clienti e magazzino abbigliamento</p>
        </div>
      </div>
    </header>
  )
}