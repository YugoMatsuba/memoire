import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Those details did not open Mémoire.')
      setPassword('')
    }

    setIsLoading(false)
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="login-heading">
          <p className="login-mark" aria-hidden="true">
            M
          </p>
          <h1>Mémoire</h1>
          <p>Our memories, in one place.</p>
        </div>

        <div className="login-field">
          <label htmlFor="memoire-email">Email</label>
          <input
            id="memoire-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            autoFocus
            disabled={isLoading}
            required
          />
        </div>

        <div className="login-field">
          <label htmlFor="memoire-password">Password</label>
          <input
            id="memoire-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={isLoading}
            required
          />
        </div>

        {error ? <p className="login-error">{error}</p> : null}

        <button className="enter-button" type="submit" disabled={isLoading}>
          {isLoading ? 'Opening...' : 'Enter Mémoire'}
        </button>
      </form>
    </main>
  )
}

export default LoginPage
