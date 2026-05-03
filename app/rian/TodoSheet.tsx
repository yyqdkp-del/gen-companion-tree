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
      <TodoGroupCard
        today={groups.today}
        soon={groups.soon}
        later={groups.later}
        advice={advice}
        onAction={onAction}
        onDone={onDone}
      />

    </BottomSheet>
  )
}
