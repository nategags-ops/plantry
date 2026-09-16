import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, ROW_IDS } from './supabase.js'

const POLL_INTERVAL_MS = 15000

export function useSharedState(key, initial) {
  const [value, setValue]   = useState(initial)
  const [synced, setSynced] = useState(false)
  const rowId                = ROW_IDS[key]
  const latestTsRef          = useRef(0)

  const fetchLatest = useCallback(async (attempt = 0) => {
    try {
      const { data, error } = await supabase
        .from('plantry_shared')
        .select('payload, updated_at')
        .eq('id', rowId)
        .maybeSingle()
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
      if (attempt < 4) {
        await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)))
        return fetchLatest(attempt + 1)
      }
      console.error('Plantry load error (giving up after retries):', err?.message || err)
      setSynced(true)
    }
  }, [rowId])

  useEffect(() => {
    fetchLatest()
  }, [rowId, fetchLatest])

  useEffect(() => {
    const channel = supabase.channel(`plantry_shared:id=eq.${rowId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plantry_shared', filter: `id=eq.${rowId}` },
        (payload) => {
          const incoming = payload.new?.payload
          const ts = payload.new?.updated_at ? new Date(payload.new.updated_at).getTime() : Date.now()
          if (incoming !== undefined && ts >= latestTsRef.current) {
            latestTsRef.current = ts
            setValue(incoming)
          }
        }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [rowId])

  useEffect(() => {
    function wake() {
      if (document.visibilityState === 'visible') fetchLatest()
    }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    window.addEventListener('online', wake)
    return () => {
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
      window.removeEventListener('online', wake)
    }
  }, [fetchLatest])

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchLatest()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchLatest])

  const setShared = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const nowTs = Date.now()
      latestTsRef.current = nowTs
      const row = { id: rowId, payload: next, updated_at: new Date(nowTs).toISOString() }
      async function writeWithRetry(attempt = 0) {
        const { error } = await supabase.from('plantry_shared').upsert(row)
        if (error) {
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)))
            return writeWithRetry(attempt + 1)
          }
          console.error('Plantry sync error (giving up after retries):', error.message)
        }
      }
      writeWithRetry()
      return next
    })
  }, [rowId])

  return [value, setShared, synced]
}
