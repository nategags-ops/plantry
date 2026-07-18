import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, ROW_IDS } from './supabase.js'

export function useSharedState(key, initial) {
  const [value, setValue] = useState(initial)
  const [synced, setSynced] = useState(false)
  const rowId = ROW_IDS[key]
  const skipNextRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.from('plantry_shared').select('payload').eq('id', rowId).maybeSingle()
      if (cancelled) return
      if (!error && data?.payload !== undefined) setValue(data.payload)
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
          if (incoming !== undefined) setValue(incoming)
        }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [rowId])

  const setShared = useCallback(async (updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      skipNextRef.current = true
      supabase.from('plantry_shared').upsert({ id: rowId, payload: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) { console.error('Plantry sync error:', error.message); skipNextRef.current = false; } })
      return next
    })
  }, [rowId])

  return [value, setShared, synced]
}
