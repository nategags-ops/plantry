import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
})

export const ROW_IDS = {
  groceryList:   'shared-grocery-list',
  cookList:      'shared-cook-list',
  customRecipes: 'shared-custom-recipes',
  checkedItems:  'shared-checked-items',
  deletedGroceryItems: 'shared-deleted-grocery-items',
  staples: 'shared-staples',
  storeTaggingEnabled: 'shared-store-tagging-enabled',
  itemStores: 'shared-item-stores',
  storeList: 'shared-store-list',
}
