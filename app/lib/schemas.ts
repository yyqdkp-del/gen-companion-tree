// app/lib/schemas.ts
import { z } from 'zod'

export const ExecutionPackSchema = z.object({
  summary: z.string(),
  checklist: z.array(z.object({
    item: z.string(),
    status: z.enum(['ready', 'missing', 'optional']),
    note: z.string().optional(),
    action: z.enum(['buy', 'print', 'prepare', 'download']).nullable().optional(),
  })),
  actions: z.array(z.object({
    type: z.enum(['navigate', 'call', 'email', 'whatsapp', 'calendar', 'download_pdf', 'open_url', 'pay', 'buy']),
    label: z.string(),
    data: z.record(z.string(), z.any()),
  })).max(5),
  draft: z.string().optional(),
  depart_suggestion: z.string().optional(),
  cost_estimate: z.string().optional(),
  risk_warnings: z.array(z.string()),
  carry_items: z.array(z.string()),
})
