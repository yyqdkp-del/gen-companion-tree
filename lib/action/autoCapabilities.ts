import type { SupabaseClient } from '@supabase/supabase-js'
import { generateDraftContent, type DraftType } from '@/lib/action/draftContent'
import { getExchangeRate } from '@/lib/action/exchangeForPlanner'

export function createAutoCapabilities(supabase: SupabaseClient) {
  return {
    setReminder: async (params: {
      title: string
      dueDate: string
      userId: string
      childId?: string
    }) => {
      const row: Record<string, unknown> = {
        user_id: params.userId,
        title: params.title,
        due_date: params.dueDate,
        priority: 'yellow',
        status: 'pending',
        source: 'auto_execute',
      }
      if (params.childId) row.child_id = params.childId

      const { error } = await supabase.from('todo_items').insert(row)
      if (error) throw error
      return `已设置提醒：${params.title}`
    },

    addCalendarEvent: async (params: {
      title: string
      date: string
      userId: string
      childId: string
      notes?: string
    }) => {
      const { error } = await supabase.from('child_school_calendar').insert({
        user_id: params.userId,
        child_id: params.childId,
        title: params.title,
        date_start: params.date,
        description: params.notes || null,
        source: 'auto_execute',
      })
      if (error) throw error
      return `已写入校历：${params.title}`
    },

    generateDraft: async (params: {
      type: DraftType
      context: Record<string, unknown>
      userId: string
    }) => {
      const draft = await generateDraftContent(params.type, params.context)
      const { error } = await supabase.from('raw_inputs').insert({
        user_id: params.userId,
        input_type: 'draft',
        raw_content: draft,
        status: 'ready',
        processed: true,
      })
      if (error) throw error
      return { text: draft, type: params.type }
    },

    calculateExchange: async (params: {
      amount: number
      fromCurrency: string
      toCurrency: string
    }) => {
      const exchange = await getExchangeRate()
      if (!exchange) return null

      const fromRate = exchange.rates[params.fromCurrency]
      const toRate = exchange.rates[params.toCurrency]
      if (!fromRate || !toRate) return null

      const result = (params.amount / fromRate) * toRate
      return {
        original: `${params.amount}${params.fromCurrency}`,
        converted: `${Math.round(result)}${params.toCurrency}`,
        rate: toRate,
        tip: exchange.trend === 'up' ? '当前汇率有利' : '',
      }
    },

    setMultiReminders: async (params: {
      title: string
      targetDate: string
      daysBefore: number[]
      userId: string
    }) => {
      const results: string[] = []
      for (const days of params.daysBefore) {
        const date = new Date(`${params.targetDate}T12:00:00`)
        date.setDate(date.getDate() - days)
        const dueDate = date.toISOString().slice(0, 10)

        const { error } = await supabase.from('todo_items').insert({
          user_id: params.userId,
          title: `${params.title}（${days}天后到期）`,
          due_date: dueDate,
          priority: days <= 3 ? 'red' : days <= 7 ? 'orange' : 'yellow',
          status: 'pending',
          source: 'auto_execute',
        })
        if (error) throw error
        results.push(`提前${days}天提醒已设置`)
      }
      return results
    },
  }
}

export type AutoCapabilities = ReturnType<typeof createAutoCapabilities>
