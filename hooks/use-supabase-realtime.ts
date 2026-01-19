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

          if (typedPayload.eventType === "INSERT" && (!events || events.includes("INSERT"))) {
            onInsertRef.current?.(typedPayload)
          } else if (typedPayload.eventType === "UPDATE" && (!events || events.includes("UPDATE"))) {
            onUpdateRef.current?.(typedPayload)
          } else if (typedPayload.eventType === "DELETE" && (!events || events.includes("DELETE"))) {
            onDeleteRef.current?.(typedPayload)
          }
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [table, schema, filter, events])
}
