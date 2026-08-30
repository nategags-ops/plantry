import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, ROW_IDS } from './supabase.js'

/**
 * useSharedState — like useState but synced across all users in real time.aimport { useState, useEffect, useRef, useCallback } from 'react'
 import { supabase, ROW_IDS } from './supabase.js'
 
 export function useSharedState(key, initial) {
   const [value, setValue]   = useState(initial)
     const [synced, setSynced] = useState(false)
       const rowId               = ROW_IDS[key]
         const skipNextRef         = useRef(false)
           const latestTsRef         = useRef(0)
           
             useEffect(() => {
                 let cancelled = false
                     async function load(attempt = 0) {
                           try {
                                   const { data, error } = await supabase
                                             .from('plantry_shared')
                                                       .select('payload, updated_at')
                                                                 .eq('id', rowId)
                                                                           .maybeSingle()
                                                                                   if (cancelled) return
                                                                                           if (error) throw error
                                                                                                   if (data?.payload !== undefined) {
                                                                                                             const ts = data.updated_at ? new Date(data.updated_at).getTime() : 0
                                                                                                                       if (ts >= latestTsRef.current) {
                                                                                                                                   latestTsRef.current = ts
                                                                                                                                               setValue(data.payload)
                                                                                                                                                         }
                                                                                                                                                                 }
                                                                                                                                                                         setSynced(true)
                                                                                                                                                                               } catch (err) {
                                                                                                                                                                                       if (cancelled) return
                                                                                                                                                                                               if (attempt < 4) {
                                                                                                                                                                                                         setTimeout(() => { if (!cancelled) load(attempt + 1) }, 400 * Math.pow(2, attempt))
                                                                                                                                                                                                                 } else {
                                                                                                                                                                                                                           console.error('Plantry load error (giving up after retries):', err?.message || err)
                                                                                                                                                                                                                                     setSynced(true)
                                                                                                                                                                                                                                             }
                                                                                                                                                                                                                                                   }
                                                                                                                                                                                                                                                       }
                                                                                                                                                                                                                                                           load()
                                                                                                                                                                                                                                                               return () => { cancelled = true }
                                                                                                                                                                                                                                                                 }, [rowId])
                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                   useEffect(() => {
                                                                                                                                                                                                                                                                       const channel = supabase.channel(`plantry_shared:id=eq.${rowId}`)
                                                                                                                                                                                                                                                                             .on('postgres_changes', { event: '*', schema: 'public', table: 'plantry_shared', filter: `id=eq.${rowId}` },
                                                                                                                                                                                                                                                                                     (payload) => {
                                                                                                                                                                                                                                                                                               if (skipNextRef.current) { skipNextRef.current = false; return }
                                                                                                                                                                                                                                                                                                         const incoming = payload.new?.payload
                                                                                                                                                                                                                                                                                                                   const ts = payload.new?.updated_at ? new Date(payload.new.updated_at).getTime() : Date.now()
                                                                                                                                                                                                                                                                                                                             if (incoming !== undefined && ts >= latestTsRef.current) {
                                                                                                                                                                                                                                                                                                                                         latestTsRef.current = ts
                                                                                                                                                                                                                                                                                                                                                     setValue(incoming)
                                                                                                                                                                                                                                                                                                                                                               }
                                                                                                                                                                                                                                                                                                                                                                       }).subscribe()
                                                                                                                                                                                                                                                                                                                                                                           return () => { supabase.removeChannel(channel) }
                                                                                                                                                                                                                                                                                                                                                                             }, [rowId])
                                                                                                                                                                                                                                                                                                                                                                             
                                                                                                                                                                                                                                                                                                                                                                               const setShared = useCallback(async (updater) => {
                                                                                                                                                                                                                                                                                                                                                                                   setValue(prev => {
                                                                                                                                                                                                                                                                                                                                                                                         const next = typeof updater === 'function' ? updater(prev) : updater
                                                                                                                                                                                                                                                                                                                                                                                               const nowTs = Date.now()
                                                                                                                                                                                                                                                                                                                                                                                                     latestTsRef.current = nowTs
                                                                                                                                                                                                                                                                                                                                                                                                           skipNextRef.current = true
                                                                                                                                                                                                                                                                                                                                                                                                                 supabase.from('plantry_shared')
                                                                                                                                                                                                                                                                                                                                                                                                                         .upsert({ id: rowId, payload: next, updated_at: new Date(nowTs).toISOString() })
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
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   }*
 * Reads from / writes to a single row in the `plantry_shared` Supabase table.
 * Any change made by one user is broadcast to all connected users instantly
 * via Supabase Realtime.
 *
 * FIX: every payload (from the initial load, from a realtime push, or from our
 * own write) now carries an `updated_at` timestamp. We only ever apply a payload
 * if it's newer than (or equal to) whatever we already have locally. This stops
 * a slow, late-arriving initial "load" fetch from overwriting fresher data that
 * already came in via the realtime stream — which is what was causing the
 * grocery list (and other shared data) to load correctly and then wipe a few
 * seconds later.
 *
 * @param {string} key     - one of the ROW_IDS keys
 * @param {*}      initial - fallback value before data loads
 */
export function useSharedState(key, initial) {
  const [value, setValue]   = useState(initial)
  const [synced, setSynced] = useState(false)
  const rowId               = ROW_IDS[key]
  const skipNextRef         = useRef(false)   // avoid echo on our own writes
  const latestTsRef         = useRef(0)       // timestamp (ms) of the newest payload we've applied

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('plantry_shared')
        .select('payload, updated_at')
        .eq('id', rowId)
        .maybeSingle()
      if (cancelled) return
      if (!error && data?.payload !== undefined) {
        const ts = data.updated_at ? new Date(data.updated_at).getTime() : 0
        // Only apply this if nothing more recent has already landed locally
        // (e.g. via a realtime push that arrived while this fetch was in flight).
        if (ts >= latestTsRef.current) {
          latestTsRef.current = ts
          setValue(data.payload)
        }
      }
      setSynced(true)
    }
    load()
    return () => { cancelled = true }
  }, [rowId])

  useEffect(() => {
    const channel = supabase.channel(`plantry_shared:id=eq.${rowId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plantry_shared', filter: `id=eq.${rowId}` },
        (payload) => {
          if (skipNextRef.current) { skipNextRef.current = false; return }
          const incoming = payload.new?.payload
          const ts = payload.new?.updated_at ? new Date(payload.new.updated_at).getTime() : Date.now()
          if (incoming !== undefined && ts >= latestTsRef.current) {
            latestTsRef.current = ts
            setValue(incoming)
          }
        }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [rowId])

  const setShared = useCallback(async (updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const nowTs = Date.now()
      latestTsRef.current = nowTs   // mark our own write as the newest known state immediately
      skipNextRef.current = true
      supabase.from('plantry_shared')
        .upsert({ id: rowId, payload: next, updated_at: new Date(nowTs).toISOString() })
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
