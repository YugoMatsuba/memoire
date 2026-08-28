import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import backgroundPhoto1 from '../pictures/background/IMG_2544.jpg'
import backgroundPhoto2 from '../pictures/background/IMG_2688.jpg'
import backgroundPhoto3 from '../pictures/background/IMG_2771.jpg'
import backgroundPhoto4 from '../pictures/background/IMG_2940.jpg'
import backgroundPhoto5 from '../pictures/background/IMG_3101.jpg'
import backgroundPhoto6 from '../pictures/background/IMG_3131.jpg'
import backgroundPhoto7 from '../pictures/background/IMG_3258.jpg'
import backgroundPhoto8 from '../pictures/background/IMG_5814.jpg'
import backgroundPhoto9 from '../pictures/background/IMG_6081.jpg'
import backgroundPhoto10 from '../pictures/background/IMG_6394.jpg'
import backgroundPhoto11 from '../pictures/background/IMG_6426.jpg'
import backgroundPhoto12 from '../pictures/background/IMG_6762.jpg'
import backgroundPhoto13 from '../pictures/background/IMG_9572.jpg'
import backgroundPhoto14 from '../pictures/background/fda9ac68-91b0-4439-8ff9-920aa012f206.jpg'

const loginBackgroundPhotos = [
  backgroundPhoto1,
  backgroundPhoto2,
  backgroundPhoto3,
  backgroundPhoto4,
  backgroundPhoto5,
  backgroundPhoto6,
  backgroundPhoto7,
  backgroundPhoto8,
  backgroundPhoto9,
  backgroundPhoto10,
  backgroundPhoto11,
  backgroundPhoto12,
  backgroundPhoto13,
  backgroundPhoto14,
]

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
      <div className="login-background-polaroids" aria-hidden="true">
        {loginBackgroundPhotos.map((photo) => (
          <figure className="login-polaroid" key={photo}>
            <img src={photo} alt="" />
          </figure>
        ))}
      </div>

      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="login-heading">
          <h1>mémoire</h1>
          <p>A little world of us</p>
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
          {isLoading ? 'Opening...' : 'Login'}
        </button>
      </form>
    </main>
  )
}

export default LoginPage
