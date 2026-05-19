'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import BottomSheet from '@/app/_shared/_components/BottomSheet'
import TodoGroupCard from '@/app/_shared/_components/TodoGroupCard'
import { THEME } from '@/app/_shared/_constants/theme'
import { useTodoEngine } from '@/app/_shared/_hooks/useTodoEngine'
import type { TodoItem } from '@/app/_shared/_types'

export default function TodoSheet({ todos, onClose, onAction, onDone }: {
  todos: TodoItem[]
  onClose: () => void
  onAction: (t: TodoItem) => void
  onDone: (id: string) => void
}) {
  const { groups, advice } = useTodoEngine(todos)

  return (
    <BottomSheet onClose={onClose} title="妈妈待办">
      {todos.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '36px 20px 28px',
          fontSize: 14,
          color: THEME.muted,
          lineHeight: 1.6,
        }}>
          暂无待办事项
        </div>
      ) : (
        <TodoGroupCard
          today={groups.today}
          soon={groups.soon}
          later={groups.later}
          advice={advice}
          onAction={onAction}
          onDone={onDone}
        />
      )}
    </BottomSheet>
  )
}
