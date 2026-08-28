import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'
import LoginPage from './components/LoginPage'
import { supabase } from './lib/supabase'
import './App.css'

const INITIAL_GLOBE_VIEW = { lat: -18, lng: 138, altitude: 2.15 }
const GEOCODING_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const STORAGE_BUCKET = 'Pictures'
const PICTURE_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24

type CoupleId = string | number

type Picture = {
  id: string
  placeId: string
  storagePath: string
  url: string
}

type Memory = {
  id: string
  city: string
  lat: number
  lng: number
  photos: Picture[]
  description: string
}

type PlaceRow = {
  place_id: string | number
  couple_id: CoupleId
  name: string
  lat: number
  long: number
  memory: string | null
}

type PictureRow = {
  id: string | number
  couple_id: CoupleId
  place_id: string | number
  storage_path: string
}

type GeocodingResult = {
  place_id: number
  lat: string
  lon: string
  display_name: string
  type: string
}

async function getPictureUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, PICTURE_URL_EXPIRES_IN_SECONDS)

  if (error) {
    throw new Error(error.message)
  }

  return data.signedUrl
}

async function pictureRowToPhoto(row: PictureRow): Promise<Picture> {
  return {
    id: String(row.id),
    placeId: String(row.place_id),
    storagePath: row.storage_path,
    url: await getPictureUrl(row.storage_path),
  }
}

function placeRowToMemory(row: PlaceRow, photos: Picture[] = []): Memory {
  return {
    id: String(row.place_id),
    city: row.name,
    lat: row.lat,
    lng: row.long,
    photos,
    description: row.memory ?? '',
  }
}

function getStoragePath(coupleId: CoupleId, placeId: string, file: File) {
  const safeFileName = file.name.replace(/[^a-zA-Z0-9. -]/g, '-')

  return `couples/${coupleId}/places/${placeId}/${crypto.randomUUID()}-${safeFileName}`
}

function clearSupabaseAuthStorage() {
  const storageKeys = Object.keys(localStorage).filter(
    (key) => key.startsWith('sb-') && key.endsWith('-auth-token'),
  )

  storageKeys.forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

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

  function handleSignOut() {
    clearSupabaseAuthStorage()
    setSession(null)

    void supabase.auth.signOut({ scope: 'local' })
  }

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

  return <MemoireApp onSignOut={handleSignOut} />
}

type MemoireAppProps = {
  onSignOut: () => void
}

function MemoireApp({ onSignOut }: MemoireAppProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [coupleId, setCoupleId] = useState<CoupleId | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [savedPlaces, setSavedPlaces] = useState<Memory[]>([])
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [isPlaceFormOpen, setIsPlaceFormOpen] = useState(false)
  const [placeSearch, setPlaceSearch] = useState('')
  const [isDeletingPlace, setIsDeletingPlace] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [placeError, setPlaceError] = useState('')
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true)
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const trimmedPlaceSearch = placeSearch.trim().toLowerCase()
  const matchingPlaces =
    trimmedPlaceSearch.length > 0
      ? savedPlaces
          .filter((place) =>
            place.city.toLowerCase().includes(trimmedPlaceSearch),
          )
          .slice(0, 5)
      : []

  useEffect(() => {
    document.querySelectorAll('.map-pin').forEach((pin) => pin.remove())
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadSavedPlaces() {
      setPlaceError('')
      setIsLoadingPlaces(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (!isMounted) {
        return
      }

      if (userError || !user) {
        setPlaceError('Could not load the current user.')
        setIsLoadingPlaces(false)
        return
      }

      setCurrentUserId(user.id)

      const { data: membership, error: membershipError } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (!isMounted) {
        return
      }

      if (membershipError || !membership) {
        setPlaceError('No couple workspace is connected to this account.')
        setIsLoadingPlaces(false)
        return
      }

      setCoupleId(membership.couple_id)

      const { data, error } = await supabase
        .from('places')
        .select('place_id, couple_id, name, lat, long, memory')
        .eq('couple_id', membership.couple_id)
        .order('created_at', { ascending: true })

      if (!isMounted) {
        return
      }

      if (error) {
        setPlaceError('Could not load saved places.')
        setIsLoadingPlaces(false)
        return
      }

      const placeRows = (data ?? []) as PlaceRow[]
      const placeIds = placeRows.map((row) => String(row.place_id))
      const picturesByPlaceId = new Map<string, Picture[]>()

      if (placeIds.length > 0) {
        const { data: pictureData, error: pictureError } = await supabase
          .from('pictures')
          .select('id, couple_id, place_id, storage_path')
          .eq('couple_id', membership.couple_id)
          .in('place_id', placeIds)
          .order('created_at', { ascending: true })

        if (!isMounted) {
          return
        }

        if (pictureError) {
          setPlaceError('Could not load saved pictures.')
          setIsLoadingPlaces(false)
          return
        }

        const pictureRows = (pictureData ?? []) as PictureRow[]

        const photos = await Promise.all(
          pictureRows.map((pictureRow) => pictureRowToPhoto(pictureRow)),
        )

        photos.forEach((photo) => {
          const placePhotos = picturesByPlaceId.get(photo.placeId) ?? []

          picturesByPlaceId.set(photo.placeId, [...placePhotos, photo])
        })
      }

      setSavedPlaces(
        placeRows.map((row) =>
          placeRowToMemory(
            row,
            picturesByPlaceId.get(String(row.place_id)) ?? [],
          ),
        ),
      )
      setIsLoadingPlaces(false)
    }

    void loadSavedPlaces()

    return () => {
      isMounted = false
    }
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

  async function handleCreatePlace(input: {
    name: string
    memory: string
    geocodingResult: GeocodingResult
    files: File[]
  }) {
    if (!coupleId) {
      throw new Error('No couple workspace is connected to this account.')
    }

    if (!currentUserId) {
      throw new Error('Could not load the current user.')
    }

    const placeName = input.name.trim()
    const placeMemory = input.memory.trim()

    const { data, error } = await supabase
      .from('places')
      .insert({
        couple_id: coupleId,
        name: placeName,
        lat: Number(input.geocodingResult.lat),
        long: Number(input.geocodingResult.lon),
        memory: placeMemory,
        created_by: currentUserId,
      })
      .select('place_id, couple_id, name, lat, long, memory')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const newMemory = placeRowToMemory(data as PlaceRow)
    const photos = await uploadPlacePictures(newMemory.id, input.files)
    const memoryWithPhotos = { ...newMemory, photos }

    setSavedPlaces((currentPlaces) => [...currentPlaces, memoryWithPhotos])
    setSelectedMemory(memoryWithPhotos)
    globeRef.current?.pointOfView(
      { lat: memoryWithPhotos.lat, lng: memoryWithPhotos.lng, altitude: 1.7 },
      900,
    )
  }

  async function uploadPlacePictures(placeId: string, files: File[]) {
    if (!coupleId || files.length === 0) {
      return []
    }

    if (!currentUserId) {
      throw new Error('Could not load the current user.')
    }

    const insertedPhotos: Picture[] = []

    for (const file of files) {
      const storagePath = getStoragePath(coupleId, placeId, file)
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data, error } = await supabase
        .from('pictures')
        .insert({
          couple_id: coupleId,
          place_id: placeId,
          storage_path: storagePath,
          created_by: currentUserId,
        })
        .select('id, couple_id, place_id, storage_path')
        .single()

      if (error) {
        throw new Error(error.message)
      }

      insertedPhotos.push(await pictureRowToPhoto(data as PictureRow))
    }

    return insertedPhotos
  }

  async function handleDeletePlace(memory: Memory) {
    if (!coupleId) {
      setPlaceError('No couple workspace is connected to this account.')
      return
    }

    setPlaceError('')
    setIsDeletingPlace(true)

    const { data, error } = await supabase
      .from('places')
      .delete()
      .eq('place_id', memory.id)
      .eq('couple_id', coupleId)
      .select('place_id')

    setIsDeletingPlace(false)

    if (error) {
      setPlaceError(error.message)
      return
    }

    if (!data || data.length !== 1) {
      setPlaceError('No matching place was deleted.')
      return
    }

    setSavedPlaces((currentPlaces) =>
      currentPlaces.filter((place) => place.id !== memory.id),
    )
    setSelectedMemory(null)
  }

  async function handleSavePlaceMemory(
    memory: Memory,
    description: string,
    files: File[],
  ) {
    if (!coupleId) {
      throw new Error('No couple workspace is connected to this account.')
    }

    const { data, error } = await supabase
      .from('places')
      .update({ memory: description.trim() })
      .eq('place_id', memory.id)
      .eq('couple_id', coupleId)
      .select('place_id, couple_id, name, lat, long, memory')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const photos = await uploadPlacePictures(memory.id, files)
    const updatedMemory = placeRowToMemory(data as PlaceRow, [
      ...memory.photos,
      ...photos,
    ])

    setSavedPlaces((currentPlaces) =>
      currentPlaces.map((place) =>
        place.id === updatedMemory.id ? updatedMemory : place,
      ),
    )
    setSelectedMemory(updatedMemory)
  }

  async function handleDeletePicture(memory: Memory, picture: Picture) {
    if (!coupleId) {
      throw new Error('No couple workspace is connected to this account.')
    }

    const { data, error } = await supabase
      .from('pictures')
      .delete()
      .eq('id', picture.id)
      .eq('couple_id', coupleId)
      .eq('place_id', memory.id)
      .select('id, storage_path')

    if (error) {
      throw new Error(error.message)
    }

    if (!data || data.length !== 1) {
      throw new Error('No matching picture was deleted.')
    }

    const deletedPicture = data[0] as Pick<PictureRow, 'id' | 'storage_path'>

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([deletedPicture.storage_path])

    if (storageError) {
      throw new Error(storageError.message)
    }

    const updatedMemory = {
      ...memory,
      photos: memory.photos.filter((photo) => photo.id !== picture.id),
    }

    setSavedPlaces((currentPlaces) =>
      currentPlaces.map((place) =>
        place.id === memory.id ? updatedMemory : place,
      ),
    )
    setSelectedMemory(updatedMemory)
  }

  function handleSignOut() {
    setPlaceError('')
    setIsSigningOut(true)
    onSignOut()
  }

  function handleSelectSearchedPlace(memory: Memory) {
    setSelectedMemory(memory)
    setPlaceSearch('')
    globeRef.current?.pointOfView(
      { lat: memory.lat, lng: memory.lng, altitude: 1.7 },
      900,
    )
  }

  return (
    <main className="globe-page">
      <button
        className="logout-button"
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? 'Logging out...' : 'Log out'}
      </button>

      <div className="place-toolbar">
        <button
          className="add-place-button"
          type="button"
          onClick={() => setIsPlaceFormOpen(true)}
        >
          Add place
        </button>

        <div className="place-search">
          <label className="place-search-field" htmlFor="place-search">
            <span>Search place</span>
            <input
              id="place-search"
              type="search"
              value={placeSearch}
              onChange={(event) => setPlaceSearch(event.target.value)}
              placeholder="Search"
            />
          </label>

          {matchingPlaces.length > 0 ? (
            <div className="place-search-results">
              {matchingPlaces.map((place) => (
                <button
                  className="place-search-result"
                  type="button"
                  key={place.id}
                  onClick={() => handleSelectSearchedPlace(place)}
                >
                  {place.city}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="place-status" aria-live="polite">
        {isLoadingPlaces ? 'Loading saved places...' : placeError}
      </div>

      <Globe
        key="memoire-globe-front-map-pins"
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        onGlobeReady={() => {
          globeRef.current?.pointOfView(INITIAL_GLOBE_VIEW, 0)
        }}
        pointsData={savedPlaces}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.008}
        pointRadius={0.15}
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
          isDeleting={isDeletingPlace}
          onClose={() => setSelectedMemory(null)}
          onDelete={() => void handleDeletePlace(selectedMemory)}
          onSave={(description, files) =>
            handleSavePlaceMemory(selectedMemory, description, files)
          }
          onDeletePicture={(picture) =>
            handleDeletePicture(selectedMemory, picture)
          }
        />
      ) : null}

      {isPlaceFormOpen ? (
        <PlaceFormModal
          onCreate={handleCreatePlace}
          onClose={() => setIsPlaceFormOpen(false)}
        />
      ) : null}
    </main>
  )
}

type PlaceFormModalProps = {
  onCreate: (input: {
    name: string
    memory: string
    geocodingResult: GeocodingResult
    files: File[]
  }) => Promise<void>
  onClose: () => void
}

function PlaceFormModal({ onCreate, onClose }: PlaceFormModalProps) {
  const [name, setName] = useState('')
  const [memory, setMemory] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [geocodingResults, setGeocodingResults] = useState<GeocodingResult[]>([])
  const [error, setError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setGeocodingResults([])
    setIsSearching(true)

    const geocodingUrl = new URL(GEOCODING_ENDPOINT)

    geocodingUrl.searchParams.set('format', 'jsonv2')
    geocodingUrl.searchParams.set('limit', '5')
    geocodingUrl.searchParams.set('q', name.trim())

    try {
      const response = await fetch(geocodingUrl)

      if (!response.ok) {
        throw new Error('Could not search for that place.')
      }

      const results = (await response.json()) as GeocodingResult[]

      if (results.length === 0) {
        throw new Error('No matching places were found.')
      }

      setGeocodingResults(results)
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'Could not search for that place.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  async function handleSelectPlace(geocodingResult: GeocodingResult) {
    setError('')
    setIsSaving(true)

    try {
      await onCreate({ name, memory, geocodingResult, files })
      onClose()
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Could not save that place.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <aside className="place-form-modal" aria-label="Add a place">
      <form className="place-form" onSubmit={handleSearch}>
        <header className="memory-header">
          <div>
            <h2>Add place</h2>
            <p className="memory-description">Search, choose the match, and save it.</p>
          </div>

          <button className="memory-close" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <label className="place-field" htmlFor="place-name">
          <span>City or place</span>
          <input
            id="place-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setGeocodingResults([])
            }}
            placeholder="Tokyo"
            disabled={isSearching || isSaving}
            required
          />
        </label>

        <label className="place-field" htmlFor="place-memory">
          <span>Memory</span>
          <textarea
            id="place-memory"
            value={memory}
            onChange={(event) => setMemory(event.target.value)}
            placeholder="A small note from this place"
            disabled={isSearching || isSaving}
            required
          />
        </label>

        <label className="place-field" htmlFor="place-pictures">
          <span>Pictures</span>
          <input
            id="place-pictures"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) =>
              setFiles(Array.from(event.target.files ?? []))
            }
            disabled={isSearching || isSaving}
          />
        </label>

        {files.length > 0 ? (
          <p className="selected-picture-count">
            {files.length} picture{files.length === 1 ? '' : 's'} selected
          </p>
        ) : null}

        {error ? <p className="place-form-error">{error}</p> : null}

        <button
          className="save-place-button"
          type="submit"
          disabled={isSearching || isSaving}
        >
          {isSearching ? 'Searching...' : 'Search places'}
        </button>
      </form>

      {geocodingResults.length > 0 ? (
        <div className="geocoding-results" aria-label="Place matches">
          {geocodingResults.map((result) => (
            <button
              className="geocoding-result"
              type="button"
              key={result.place_id}
              onClick={() => void handleSelectPlace(result)}
              disabled={isSaving}
            >
              <span>{result.display_name}</span>
              <small>
                {Number(result.lat).toFixed(4)}, {Number(result.lon).toFixed(4)}
              </small>
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  )
}

type MemoryModalProps = {
  memory: Memory
  isDeleting: boolean
  onClose: () => void
  onDelete: () => void
  onSave: (description: string, files: File[]) => Promise<void>
  onDeletePicture: (picture: Picture) => Promise<void>
}

function MemoryModal({
  memory,
  isDeleting,
  onClose,
  onDelete,
  onSave,
  onDeletePicture,
}: MemoryModalProps) {
  const [editedDescription, setEditedDescription] = useState(memory.description)
  const [editError, setEditError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [pictureError, setPictureError] = useState('')
  const [pendingPictureFiles, setPendingPictureFiles] = useState<File[]>([])
  const [deletingPictureId, setDeletingPictureId] = useState<string | null>(null)

  async function handleSaveEdit() {
    setEditError('')
    setPictureError('')
    setIsSavingEdit(true)

    try {
      await onSave(editedDescription, pendingPictureFiles)
      setPendingPictureFiles([])
      setIsEditing(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not save this memory.'

      setEditError(message)
      setPictureError(message)
    } finally {
      setIsSavingEdit(false)
    }
  }

  function handlePictureInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])

    if (files.length === 0) {
      return
    }

    setPictureError('')
    setPendingPictureFiles((currentFiles) => [
      ...currentFiles,
      ...files,
    ])
    event.target.value = ''
  }

  function handleCancelEdit() {
    setEditedDescription(memory.description)
    setIsEditing(false)
    setEditError('')
    setPictureError('')
    setPendingPictureFiles([])
  }

  async function handleDeletePicture(picture: Picture) {
    setPictureError('')
    setDeletingPictureId(picture.id)

    try {
      await onDeletePicture(picture)
    } catch (error) {
      setPictureError(
        error instanceof Error ? error.message : 'Could not delete picture.',
      )
    } finally {
      setDeletingPictureId(null)
    }
  }

  return (
    <aside className="memory-modal" aria-label={`${memory.city} memories`}>
      <header className="memory-header">
        <div>
          <h2>{memory.city}</h2>
        </div>

        <div className="memory-actions">
          {isEditing ? (
            <>
              <button
                className="memory-close"
                type="button"
                onClick={handleCancelEdit}
                disabled={isSavingEdit}
              >
                Cancel
              </button>

              <button
                className="save-memory-button"
                type="button"
                onClick={() => void handleSaveEdit()}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button
                className="memory-close"
                type="button"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>

              <button
                className="delete-place-button"
                type="button"
                onClick={onDelete}
                disabled={isDeleting || isSavingEdit}
              >
                {isDeleting ? 'Deleting...' : 'Delete place'}
              </button>

              <button className="memory-close" type="button" onClick={onClose}>
                Close
              </button>
            </>
          )}
        </div>
      </header>

      <div className="memory-note">
        {isEditing ? (
          <textarea
            className="memory-edit-input"
            value={editedDescription}
            onChange={(event) => setEditedDescription(event.target.value)}
            disabled={isSavingEdit}
            aria-label="Memory description"
          />
        ) : (
          <p className="memory-description">{memory.description}</p>
        )}
        {editError ? <p className="place-form-error">{editError}</p> : null}
      </div>

      {isEditing ? (
        <div className="picture-toolbar">
          <label className="picture-upload-button" htmlFor={`pictures-${memory.id}`}>
            Add pictures
          </label>
          <input
            id={`pictures-${memory.id}`}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePictureInputChange}
            disabled={isSavingEdit}
          />
          {pendingPictureFiles.length > 0 ? (
            <span className="pending-picture-count">
              {pendingPictureFiles.length} pending
            </span>
          ) : null}
        </div>
      ) : null}

      {pictureError ? <p className="place-form-error">{pictureError}</p> : null}

      <div className="polaroid-stack">
        {memory.photos.length > 0 ? (
          memory.photos.map((photo) => (
            <figure className="polaroid-card" key={photo.id}>
              <img src={photo.url} alt={`${memory.city} memory`} />
              {isEditing ? (
                <button
                  className="delete-picture-button"
                  type="button"
                  onClick={() => void handleDeletePicture(photo)}
                  disabled={deletingPictureId === photo.id}
                  aria-label={`Delete ${memory.city} picture`}
                >
                  {deletingPictureId === photo.id ? 'Deleting...' : 'Delete'}
                </button>
              ) : null}
            </figure>
          ))
        ) : (
          <p className="empty-place-photos">Photos can be added later.</p>
        )}
      </div>
    </aside>
  )
}

export default App
