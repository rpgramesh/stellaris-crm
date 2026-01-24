"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase-client"

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE"

type RealtimePayload<T> = {
  eventType: RealtimeEvent
  schema: string
  table: string
  new: T
  old: T
}

type UseSupabaseRealtimeParams<T> = {
  table: string
  schema?: string
  filter?: string
  events?: RealtimeEvent[]
  onInsert?: (payload: RealtimePayload<T>) => void
  onUpdate?: (payload: RealtimePayload<T>) => void
  onDelete?: (payload: RealtimePayload<T>) => void
}

export function useSupabaseRealtime<T>({
  table,
  schema = "public",
  filter,
  events,
  onInsert,
  onUpdate,
  onDelete,
}: UseSupabaseRealtimeParams<T>) {
  // Use refs to keep latest callbacks without triggering effect re-runs
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)

  useEffect(() => {
    onInsertRef.current = onInsert
    onUpdateRef.current = onUpdate
    onDeleteRef.current = onDelete
  }, [onInsert, onUpdate, onDelete])

  useEffect(() => {
    if (!supabase) {
      return
    }

    // Set auth token if available to ensure RLS policies are respected
    const token = typeof window !== 'undefined' ? (localStorage.getItem("access_token") || sessionStorage.getItem("access_token")) : null
    if (token) {
        supabase.realtime.setAuth(token)
    }

    const client = supabase

    const channel = client
      .channel(`realtime:${schema}.${table}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema,
          table,
          filter,
        },
        (payload: any) => {
          const typedPayload = payload as RealtimePayload<T>
          console.log(`Realtime event received for ${table}:`, typedPayload.eventType)

          if (typedPayload.eventType === "INSERT" && (!events || events.includes("INSERT"))) {
            onInsertRef.current?.(typedPayload)
          } else if (typedPayload.eventType === "UPDATE" && (!events || events.includes("UPDATE"))) {
            onUpdateRef.current?.(typedPayload)
          } else if (typedPayload.eventType === "DELETE" && (!events || events.includes("DELETE"))) {
            onDeleteRef.current?.(typedPayload)
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
            console.log(`Successfully subscribed to realtime channel for ${table}`)
        }
        if (status === 'CHANNEL_ERROR') {
            console.error(`Realtime channel error for ${table}:`, err)
        }
        if (status === 'TIMED_OUT') {
            console.error(`Realtime channel timeout for ${table}`)
        }
      })

    return () => {
      client.removeChannel(channel)
    }
  }, [table, schema, filter, events])
}
