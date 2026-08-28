import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

function isValidSupabaseUrl(value: string | undefined) {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)

    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}

export const invalidSupabaseEnv = [
  ['VITE_SUPABASE_URL', supabaseUrl],
  ['VITE_SUPABASE_PUBLISHABLE_KEY', supabasePublishableKey],
]
  .filter(([key, value]) =>
    key === 'VITE_SUPABASE_URL' ? !isValidSupabaseUrl(value) : !value,
  )
  .map(([key]) => key)

export const hasSupabaseConfig = invalidSupabaseEnv.length === 0

export const supabase = createClient(
  isValidSupabaseUrl(supabaseUrl)
    ? supabaseUrl
    : 'https://placeholder.supabase.co',
  supabasePublishableKey || 'missing-supabase-publishable-key',
)
