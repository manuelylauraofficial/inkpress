import { useState } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authBrand">INKPRESS</div>
        <h1>Accedi</h1>
        <p className="authText">Gestione ordini e magazzino abbigliamento</p>

        <form onSubmit={handleLogin} className="authForm">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error ? <div className="errorBox">{error}</div> : null}

          <button className="primaryBtn authBtn" type="submit" disabled={loading}>
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}