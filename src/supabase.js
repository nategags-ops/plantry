import { createClient } from '@supabase/supabase-js'

// ─── PASTE YOUR SUPABASE CREDENTIALS HERE ────────────────────────
// Get these from: supabase.com → Your Project → Settings → API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'
// ─────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
})

// Row IDs — we store each list as a single row with a fixed ID
// so both users always read/write the same record.
export const ROW_IDS = {
  groceryList:   'shared-grocery-list',
  cookList:      'shared-cook-list',
  customRecipes: 'shared-custom-recipes',
  checkedItems:  'shared-checked-items',
}
