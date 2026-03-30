import '../styles/Layout.css'

export default function Layout({ children }) {
  return (
    <div className="appShell">
      <div className="mainArea">
        {children}
      </div>
    </div>
  )
}