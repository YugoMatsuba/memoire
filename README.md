# Mémoire

Mémoire is a private shared travel memory app. After login, it shows a 3D globe with saved places, memory text, and photos stored in Supabase.

## Stack

- React
- TypeScript
- Vite
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- `react-globe.gl`

## Architecture

```text
┌──────────────────────────────┐
│ Frontend                     │
│ React + Vite + TypeScript    │
│                              │
│ - Login page                 │
│ - Auth-gated globe page      │
│ - Place and picture modals   │
└──────────────┬───────────────┘
               │
               ├── sign in / sign out
               │
               ▼
┌──────────────────────────────┐
│ Supabase API                 │
│ Auth + PostgREST + Storage   │
└───────┬────────────────┬─────┘
        │                │
        │ read/write     │ upload/read signed URLs
        ▼                ▼
┌──────────────┐   ┌────────────────┐
│ PostgreSQL   │   │ Object Storage │
│              │   │ Pictures bucket│
│ - couples    │   │                │
│ - members    │   │ image files    │
│ - places     │   │                │
│ - pictures   │   │                │
└──────────────┘   └────────────────┘

┌──────────────────────────────┐
│ Geo API                      │
│ Nominatim / OpenStreetMap    │
└──────────────▲───────────────┘
               │ place search
               │
┌──────────────┴───────────────┐
│ Frontend                     │
│ Converts selected result     │
│ into a saved globe pin       │
└──────────────────────────────┘
```

Main flow:

- The frontend checks Supabase Auth before rendering the globe.
- Place search calls the Geo API and returns coordinates.
- Saving a place writes metadata to PostgreSQL through the Supabase API.
- Saving pictures uploads image files to Object Storage and stores their paths in PostgreSQL.
- Loading the globe reads places and picture metadata from PostgreSQL, then requests signed image URLs from Storage.

## Setup

Install dependencies:

```sh
npm install
```

Create `.env` from `.env.example`:

```sh
cp .env.example .env
```

Set the Supabase values:

```sh
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Run locally:

```sh
npm run dev
```

Build:

```sh
npm run build
```

## Authentication Safety

The globe is guarded in `src/App.tsx`. On startup, the app checks `supabase.auth.getSession()`.

- Without a session, only `LoginPage` is rendered.
- With a session, `MemoireApp` is rendered.
- There is no public route that renders the globe without this session check.
- Logging out clears the local React session immediately and then signs out of Supabase locally.

This frontend guard protects the deployed UI, but Supabase Row Level Security must also stay enabled for private data. Database and Storage policies should verify that `auth.uid()` belongs to the row's `couple_id` through `couple_members`.

## Data Model

The app expects these Supabase resources:

- `couple_members`: connects authenticated users to the shared couple workspace.
- `places`: stores globe pins and memory text.
- `pictures`: stores photo metadata and Supabase Storage paths.
- `Pictures`: Storage bucket for uploaded images.

Image files are stored in Supabase Storage. The database stores metadata and `storage_path`.

Suggested storage path:

```text
couples/<couple-id>/places/<place-id>/<uuid>-<filename>
```

## Picture Behavior

Creating a new place:

- Selected photos stay in frontend state while filling out the form.
- Pressing Save creates the place and uploads the selected photos.
- Closing the form before Save discards the selected photos.

Editing an existing place:

- Add pictures only stages selected files in frontend state.
- Pressing Save updates the memory and uploads staged photos.
- Pressing Cancel discards staged photos without uploading them.
- Each existing picture keeps its own delete button.

If a backend API is added later, use `multipart/form-data` for uploads and JSON for batch deletion:

```http
POST /places/:placeId/pictures
Content-Type: multipart/form-data
```

```http
DELETE /places/:placeId/pictures
Content-Type: application/json
```

```json
{
  "pictureIds": ["picture-id-1", "picture-id-2"]
}
```

The backend should look up `storage_path` from `pictureIds` before deleting files from Storage.
