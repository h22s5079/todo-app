import { useState, useEffect, useRef } from 'react'

// カテゴリの型定義
type Category = 'work' | 'private' | 'study' | 'other'

type Todo = {
  id: number
  text: string
  completed: boolean
  dueDate: string | null
  category: Category // 追加
}

type Filter = 'all' | 'active' | 'completed'

const STORAGE_KEY = 'my-todo-app'
const THEME_KEY = 'my-todo-theme'

// カテゴリの設定（表示名と色）
const CATEGORIES: Record<Category, { label: string; color: string; emoji: string }> = {
  work: {
    label: '仕事',
    emoji: '💼',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  private: {
    label: 'プライベート',
    emoji: '🏠',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  },
  study: {
    label: '勉強',
    emoji: '📚',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  other: {
    label: 'その他',
    emoji: '📌',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  },
}

const getToday = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDaysUntilDue = (dueDate: string): number => {
  const today = new Date(getToday())
  const due = new Date(dueDate)
  const diffMs = due.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

const getDueDateInfo = (dueDate: string | null, completed: boolean) => {
  if (!dueDate) return null
  if (completed) {
    return { text: `📅 ${dueDate}`, className: 'text-gray-400 dark:text-gray-500' }
  }
  const days = getDaysUntilDue(dueDate)
  if (days < 0) {
    return {
      text: `⚠️ 期限切れ (${Math.abs(days)}日経過)`,
      className: 'text-red-600 dark:text-red-400 font-semibold',
    }
  }
  if (days === 0) {
    return { text: '🔥 今日が締切！', className: 'text-orange-500 dark:text-orange-400 font-semibold' }
  }
  if (days === 1) {
    return { text: '📅 明日まで', className: 'text-yellow-600 dark:text-yellow-400' }
  }
  if (days <= 3) {
    return { text: `📅 あと${days}日`, className: 'text-yellow-600 dark:text-yellow-400' }
  }
  return { text: `📅 ${dueDate}`, className: 'text-gray-500 dark:text-gray-400' }
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    // 既存データに category がない場合は 'other' を補完（後方互換性）
    const parsed = JSON.parse(saved) as Todo[]
    return parsed.map((todo) => ({
      ...todo,
      category: todo.category ?? 'other',
    }))
  })
  const [input, setInput] = useState('')
  const [dueDateInput, setDueDateInput] = useState('')
  const [categoryInput, setCategoryInput] = useState<Category>('other') // 追加
  const [filter, setFilter] = useState<Filter>('all')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all') // 追加

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved !== null) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [editingDueDate, setEditingDueDate] = useState<string>('')
  const [editingCategory, setEditingCategory] = useState<Category>('other') // 追加
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const addTodo = () => {
    if (input.trim() === '') return
    const newTodo: Todo = {
      id: Date.now(),
      text: input,
      completed: false,
      dueDate: dueDateInput || null,
      category: categoryInput,
    }
    setTodos([...todos, newTodo])
    setInput('')
    setDueDateInput('')
    // カテゴリは継続選択できるよう、リセットしない
  }

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  const clearCompleted = () => {
    setTodos(todos.filter((todo) => !todo.completed))
  }

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id)
    setEditingText(todo.text)
    setEditingDueDate(todo.dueDate ?? '')
    setEditingCategory(todo.category)
  }

  const saveEditing = () => {
    if (editingId === null) return
    const trimmed = editingText.trim()
    if (trimmed === '') {
      deleteTodo(editingId)
    } else {
      setTodos(
        todos.map((todo) =>
          todo.id === editingId
            ? {
                ...todo,
                text: trimmed,
                dueDate: editingDueDate || null,
                category: editingCategory,
              }
            : todo
        )
      )
    }
    setEditingId(null)
    setEditingText('')
    setEditingDueDate('')
    setEditingCategory('other')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingText('')
    setEditingDueDate('')
    setEditingCategory('other')
  }

  // フィルタリング（完了状態 + カテゴリ）とソート
  const filteredTodos = todos
    .filter((todo) => {
      if (filter === 'active' && todo.completed) return false
      if (filter === 'completed' && !todo.completed) return false
      if (categoryFilter !== 'all' && todo.category !== categoryFilter) return false
      return true
    })
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })

  const remainingCount = todos.filter((todo) => !todo.completed).length
  const completedCount = todos.filter((todo) => todo.completed).length
  const overdueCount = todos.filter(
    (todo) => !todo.completed && todo.dueDate && getDaysUntilDue(todo.dueDate) < 0
  ).length

  const filterButtonClass = (target: Filter) => {
    const base = 'px-4 py-1.5 rounded-lg text-sm font-medium transition'
    if (filter === target) {
      return `${base} bg-blue-500 text-white shadow`
    }
    return `${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600`
  }

  const categoryButtonClass = (target: Category | 'all') => {
    const base = 'px-3 py-1 rounded-full text-xs font-medium transition'
    if (categoryFilter === target) {
      return `${base} bg-indigo-500 text-white shadow`
    }
    return `${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600`
  }

  // カテゴリ別の件数を集計
  const categoryCount = (cat: Category) =>
    todos.filter((t) => t.category === cat).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-10 px-4 transition-colors">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="w-8" />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            📝 My ToDo
          </h1>
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
          残り {remainingCount} 件 / 完了 {completedCount} 件
        </p>

        {overdueCount > 0 && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm text-center mb-4">
            ⚠️ 期限切れのタスクが {overdueCount} 件あります
          </div>
        )}

        {/* 入力エリア */}
        <div className="space-y-2 mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="新しいタスクを入力..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2">
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value as Category)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            >
              {(Object.keys(CATEGORIES) as Category[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORIES[cat].emoji} {CATEGORIES[cat].label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
              min={getToday()}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
            <button
              onClick={addTodo}
              className="px-5 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 active:scale-95 transition"
            >
              追加
            </button>
          </div>
        </div>

        {/* 完了状態フィルター */}
        <div className="flex justify-center gap-2 mb-3">
          <button onClick={() => setFilter('all')} className={filterButtonClass('all')}>
            全て ({todos.length})
          </button>
          <button onClick={() => setFilter('active')} className={filterButtonClass('active')}>
            未完了 ({remainingCount})
          </button>
          <button onClick={() => setFilter('completed')} className={filterButtonClass('completed')}>
            完了済み ({completedCount})
          </button>
        </div>

        {/* カテゴリフィルター */}
        <div className="flex justify-center flex-wrap gap-1.5 mb-4">
          <button onClick={() => setCategoryFilter('all')} className={categoryButtonClass('all')}>
            全カテゴリ
          </button>
          {(Object.keys(CATEGORIES) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={categoryButtonClass(cat)}
            >
              {CATEGORIES[cat].emoji} {CATEGORIES[cat].label} ({categoryCount(cat)})
            </button>
          ))}
        </div>

        {/* タスクリスト */}
        <ul className="space-y-2">
          {filteredTodos.map((todo) => {
            const dueInfo = getDueDateInfo(todo.dueDate, todo.completed)
            const isEditing = editingId === todo.id
            const catInfo = CATEGORIES[todo.category]
            return (
              <li
                key={todo.id}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="w-5 h-5 mt-1 accent-blue-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing()
                          if (e.key === 'Escape') cancelEditing()
                        }}
                        className="w-full px-2 py-1 border border-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <div className="flex gap-2 items-center flex-wrap">
                        <select
                          value={editingCategory}
                          onChange={(e) => setEditingCategory(e.target.value as Category)}
                          className="px-2 py-1 border border-blue-400 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          {(Object.keys(CATEGORIES) as Category[]).map((cat) => (
                            <option key={cat} value={cat}>
                              {CATEGORIES[cat].emoji} {CATEGORIES[cat].label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={editingDueDate}
                          onChange={(e) => setEditingDueDate(e.target.value)}
                          className="flex-1 min-w-[120px] px-2 py-1 border border-blue-400 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        {editingDueDate && (
                          <button
                            onClick={() => setEditingDueDate('')}
                            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 px-1"
                            title="締切をクリア"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <button
                          onClick={saveEditing}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                        >
                          キャンセル
                        </button>
                        <span className="ml-auto self-center">Enter:保存 / Esc:キャンセル</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p
                        onDoubleClick={() => !todo.completed && startEditing(todo)}
                        className={`${
                          todo.completed
                            ? 'line-through text-gray-400 dark:text-gray-500'
                            : 'text-gray-800 dark:text-gray-100 cursor-pointer'
                        } break-words`}
                        title={!todo.completed ? 'ダブルクリックで編集' : ''}
                      >
                        {todo.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${catInfo.color}`}
                        >
                          {catInfo.emoji} {catInfo.label}
                        </span>
                        {dueInfo && (
                          <span className={`text-xs ${dueInfo.className}`}>
                            {dueInfo.text}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm font-medium"
                >
                  削除
                </button>
              </li>
            )
          })}
        </ul>

        {filteredTodos.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 mt-6">
            該当するタスクはありません
          </p>
        )}

        {completedCount > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={clearCompleted}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 underline transition"
            >
              完了済み {completedCount} 件を削除
            </button>
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
          💡 タスクをダブルクリックで編集できます
        </p>
      </div>
    </div>
  )
}

export default App
