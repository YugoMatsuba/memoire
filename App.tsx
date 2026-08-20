import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'
import LoginPage from './components/LoginPage'
import { memories } from './data/memories'
import type { Memory } from './data/memories'
import { supabase } from './lib/supabase'
import './App.css'

const INITIAL_GLOBE_VIEW = { lat: -18, lng: 138, altitude: 2.15 }

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return
      }

      setSession(data.session)
      setIsCheckingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsCheckingSession(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (isCheckingSession) {
    return (
      <main className="auth-loading" aria-label="Loading Mémoire">
        <span></span>
      </main>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return <MemoireApp />
}

function MemoireApp() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    document.querySelectorAll('.map-pin').forEach((pin) => pin.remove())
  }, [])

  useEffect(() => {
    function handleResize() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <main className="globe-page">
      <button
        className="logout-button"
        type="button"
        onClick={() => void supabase.auth.signOut()}
      >
        Log out
      </button>

      <Globe
        key="memoire-globe-front-map-pins"
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        onGlobeReady={() => {
          globeRef.current?.pointOfView(INITIAL_GLOBE_VIEW, 0)
        }}
        pointsData={memories}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.02}
        pointRadius={0.5}
        pointResolution={20}
        pointColor={() => '#ffd84d'}
        pointLabel="city"
        pointsTransitionDuration={0}
        onPointClick={(memory) => setSelectedMemory(memory as Memory)}
        width={viewport.width}
        height={viewport.height}
      />

      {selectedMemory ? (
        <MemoryModal
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
        />
      ) : null}
    </main>
  )
}

type MemoryModalProps = {
  memory: Memory
  onClose: () => void
}

function MemoryModal({ memory, onClose }: MemoryModalProps) {
  return (
    <aside className="memory-modal" aria-label={`${memory.city} memories`}>
      <header className="memory-header">
        <div>
          <p>Place memory</p>
          <h2>{memory.city}</h2>
        </div>

        <button className="memory-close" type="button" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="polaroid-stack">
        {memory.photos.map((photo, index) => (
          <figure className="polaroid-card" key={`${memory.id}-${index}`}>
            <img src={photo} alt={`${memory.city} memory`} />
          </figure>
        ))}
      </div>

      <div className="memory-copy">
        <p>{memory.description}</p>
      </div>
    </aside>
  )
}

export default App
