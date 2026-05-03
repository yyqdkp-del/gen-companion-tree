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

      <motion.button whileTap={{ scale: 0.97 }}
        onClick={() => window.location.href = '/rian'}
        style={{ width: '100%', marginTop: 18, padding: '13px', borderRadius: 16,
          border: '1px solid rgba(176,141,87,0.25)', background: 'rgba(176,141,87,0.08)',
          fontSize: 13, color: THEME.gold, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        去日安添加新事项 <ChevronRight size={14} />
      </motion.button>
    </BottomSheet>
  )
}
