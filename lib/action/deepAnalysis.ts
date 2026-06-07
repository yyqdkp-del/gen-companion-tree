import type { SupabaseClient } from '@supabase/supabase-js'
import { buildFamilyContext } from '@/lib/action/contextBuilder'
import { makeDecision } from '@/lib/action/claudeDecision'
import { executeAction } from '@/lib/action/executor'
import type { RootDecision } from '@/lib/action/rootBrain'

export async function runDeepAnalysisForTodo(
  supabase: SupabaseClient,
  userId: string,
  todoId: string,
  todo: Record<string, unknown>,
): Promise<{ decision: RootDecision; autoCompleted: string[] }> {
  const context = await buildFamilyContext(userId, todoId, supabase)
  const decision = await makeDecision(context)

  const autoActions = decision.actions.filter(
    (a) => !a.requiresConfirm && a.executor.service === 'internal',
  )

  const autoCompleted: string[] = []
  for (const action of autoActions) {
    try {
      const result = await executeAction(action, userId)
      if (result.ok) autoCompleted.push(action.label)
    } catch (e) {
      console.error('[runDeepAnalysisForTodo] auto action failed:', action.id, e)
    }
  }

  const now = new Date().toISOString()
  await supabase.from('todo_items').update({
    ai_action_data: {
      ...(todo.ai_action_data as Record<string, unknown> || {}),
      root_decision: decision,
      prepared_at: now,
      cached_at: now,
      deep_analysis_pending: false,
    },
  }).eq('id', todoId).eq('user_id', userId)

  return { decision, autoCompleted }
}

export async function triggerDeepAnalysis(
  supabase: SupabaseClient,
  userId: string,
  todoId: string,
  todo: Record<string, unknown>,
): Promise<void> {
  await supabase.from('todo_items').update({
    ai_action_data: {
      ...(todo.ai_action_data as Record<string, unknown> || {}),
      deep_analysis_pending: true,
    },
  }).eq('id', todoId).eq('user_id', userId)

  try {
    const { data: freshTodo } = await supabase
      .from('todo_items')
      .select('*')
      .eq('id', todoId)
      .eq('user_id', userId)
      .single()

    await runDeepAnalysisForTodo(supabase, userId, todoId, (freshTodo || todo) as Record<string, unknown>)
    console.log('[deep analysis complete]', todoId)
  } catch (e) {
    console.error('[deep analysis error]', todoId, e)
    await supabase.from('todo_items').update({
      ai_action_data: {
        ...(todo.ai_action_data as Record<string, unknown> || {}),
        deep_analysis_pending: false,
      },
    }).eq('id', todoId).eq('user_id', userId)
  }
}
