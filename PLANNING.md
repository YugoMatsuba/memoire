# Memoire Planning

## Current state

- Authentication already uses Supabase Auth in `App.tsx` and `components/LoginPage.tsx`.
- The globe pins and city photo sets are currently static frontend data from `data/memories.ts`.
- Tokyo photos live at the source root, while the rest of the cities reuse `assets/hero.png`.
- A new `pictures/` folder exists for future application photos.

## Login redesign

Goal: redesign the login screen so the first page feels like a memory wall.

Design direction:

- Use several polaroid-style photos as the visual background.
- Keep the login form readable and simple on top of the background.
- Use generic place/travel photos from places we visited together.
- Do not use private couple photos on the login page, because the deployed login page is publicly visible before authentication.
- Give the polaroids different rotations, positions, and sizes so the page feels personal instead of templated.
- Make sure the layout still works on mobile, where only a smaller number of background polaroids should be visible.

Implementation notes:

- Move or add login background images under `pictures/login/`.
- Keep reusable city photo assets under `pictures/cities/<city-id>/`.
- Update `LoginPage.tsx` and the login CSS to render a polaroid background layer behind the form.
- Avoid putting important form text over visually busy image areas.

## Build order

Current planned order:

1. Modify the login page with generic polaroid pictures.
2. Add the pin/place creation feature.
3. Add the picture upload feature for each place.
4. Deploy.
5. Use the deployed mobile version to add the real private pictures from our phones.

The mobile flow matters because most new photos will already be on the phone and in a browser-uploadable format.

## Add pictures to places

Goal: replace the current placeholder image sets with real photos for every city.

Suggested folder structure:

```text
pictures/
  login/
  cities/
    tokyo/
    osaka/
    kyoto/
    kawaguchiko/
    hiroshima/
    seoul/
    melbourne/
    sydney/
    gold-coast/
    byron-bay/
    paris/
    nice/
    monaco/
    alsace/
    manchester/
    liverpool/
    switzerland/
    amsterdam/
```

Short-term MVP approach:

- Add the real image files to the city folders.
- Import them in `data/memories.ts`.
- Replace `samplePhotos` city by city.

Longer-term product approach:

- Store city memories in Supabase tables.
- Store uploaded photo files in Supabase Storage.
- Store photo metadata, captions, city ownership, and ordering in Postgres.
- Fetch the current user's pins and photos after login instead of importing static frontend data.

## Shared couple data model

For the first real version, the app only needs to support two users: me and Florine. Both users should see the same globe, pins, and pictures.

The better model is a shared couple workspace instead of separate per-user memory sets.

Benefits:

- Today, both accounts can belong to `couple_id = 1`.
- Later, if the app gets a signup/invite flow, each couple can get its own `couple_id`.
- The frontend can always load places by the current user's `couple_id`.
- Pictures can be loaded by `place_id` and `couple_id`.
- This avoids matching users directly to every picture or memory.

Important rule:

- Pictures should be associated with `place_id`, not city name. City names can repeat or change, but `place_id` is stable.

Suggested schema:

```sql
create table couples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table couple_members (
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table places (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  city text not null,
  lat double precision not null,
  lng double precision not null,
  description text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table pictures (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  storage_path text not null,
  caption text default '',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
```

With Row Level Security enabled, policies can check whether `auth.uid()` exists in `couple_members` for the row's `couple_id`.

The actual image files should not be stored directly in the database. They should live in Supabase Storage, while the `pictures` table stores metadata and the file path.

Suggested Storage path:

```text
couples/<couple-id>/places/<place-id>/<picture-id>.jpg
```

That makes cleanup, permissions, and debugging much easier.

## Add more pins and more pictures

This feature has two levels:

MVP admin/manual version:

- Add new city objects manually in `data/memories.ts`.
- Add picture imports manually.
- Fastest option, but not scalable and not user-specific.

Real app version:

- Add a plus button in the right-hand corner of the globe.
- Let the user search for a city or click the globe/map to choose coordinates.
- Create a `places` row in Supabase.
- Upload one or more photos to Supabase Storage.
- Create `pictures` rows for those uploads.
- Refresh the globe points from Supabase after save.

When a user clicks an existing pin:

- Show the pictures for that `place_id`.
- Add a button inside the place modal to upload more pictures.
- Upload the selected phone pictures to Supabase Storage.
- Insert matching rows into the `pictures` table.
- Render the images as polaroids in the frontend with CSS.

Expected complexity:

- Shared couple memories: medium.
- Uploading photos: medium.
- Adding pins from a form: medium.
- Dragging or clicking directly on the 3D globe to create exact pins: medium-high.
- Editing/deleting memories and photos: medium once the database structure exists.

## Supabase backend capabilities to use

Supabase provides enough backend functionality for this app without building a separate backend server at this stage:

- Auth: email/password login and current user sessions.
- Postgres database: structured memory and photo metadata.
- Row Level Security: database-level user isolation.
- Storage: uploaded images, public or private buckets, and signed URLs.
- Realtime: optional live updates if memories are edited from multiple devices.
- Edge Functions: optional server-side logic later if image processing, secure signed URL creation, or custom workflows become necessary.

Recommended next technical step:

1. Keep the static frontend data while redesigning the login page.
2. Organize local login assets into `pictures/login/`.
3. Create the Supabase tables for `couples`, `couple_members`, `places`, and `pictures`.
4. Seed one couple and two members.
5. Replace static `memories` reads with Supabase `places` reads.
6. Add the plus button for creating new places.
7. Add picture upload from the place modal.
8. Deploy and test from mobile.
