import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, ROW_IDS } from './supabase.js'

/**
 * useSharedState — like useState but synced across all users in real time.
 *
 * Reads from / writes to a single row in the `plantry_shared` Supabase table.
 * Any change made by one user is broadcast to all connected users instantly
 * via Supabase Realtime.
 *
 * @param {string} key     - one of the ROW_IDS keys
 * @param {*}      initial - fallback value before data loads
 */
export function useSharedState(key, initial) {
  const [value, setValue]   = useState(initial)
  const [synced, setSynced] = useState(false)  // true once first load completes
  const rowId               = ROW_IDS[key]
  const skipNextRef         = useRef(false)     // avoid echo on own writes

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('plantry_shared')
        .select('payload')
        .eq('id', rowId)
        .maybeSingle()

      if (cancelled) return
      if (!error && data?.payload !== undefined) {
        setValue(data.payload)
      }
      setSynced(true)
    }

    load()
    return () => { cancelled = true }
  }, [rowId])

  // ── Real-time subscription ────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`plantry_shared:id=eq.${rowId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plantry_shared', filter: `id=eq.${rowId}` },
        (payload) => {
          if (skipNextRef.current) { skipNextRef.current = false; return }
          const incoming = payload.new?.payload
          if (incoming !== undefined) setValue(incoming)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rowId])

  // ── Write helper ──────────────────────────────────────────────
  const setShared = useCallback(async (updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      // Fire-and-forget upsert; skipNextRef prevents echo
      skipNextRef.current = true
      supabase
        .from('plantry_shared')
        .upsert({ id: rowId, payload: next, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) {
            console.error('Plantry sync error:', error.message)
            skipNextRef.current = false
          }
        })
      return next
    })
  }, [rowId])

  return [value, setShared, synced]
}
