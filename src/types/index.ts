export type CourseId = 'cs' | 'python' | 'js'
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type QuestStatus = 'locked' | 'available' | 'in-progress' | 'completed' | 'mastered' | 'soon'

export interface QuizQuestion {
  q: string
  options: string[]
  answer: number
  explain: string
}

export interface Lesson {
  id: string
  questId: string
  title: string
  minutes: number
  brief: string
  sections: { heading: string; body: string[] }[]
  analogy: string
  code?: { lang: 'python' | 'javascript' | 'text'; label: string; source: string }
  widget?: 'bits' | 'search'
  keyConcepts: string[]
  exercise: { prompt: string; steps: string[]; hints: string[] }
  quiz: QuizQuestion[]
  boss?: boolean
}

export interface Quest {
  id: string
  worldId: string
  course?: CourseId
  num: number
  title: string
  description: string
  difficulty: Difficulty
  minutes: number
  xp: number
  prereqs: string[]
  lessonIds: string[]
  boss?: boolean
  soon?: boolean
  icon: string
}

export interface World {
  id: string
  num: number
  title: string
  tagline: string
  course?: CourseId
  accent: 'blue' | 'red' | 'yellow' | 'green'
  icon: string
}

export interface Course {
  id: CourseId
  title: string
  tagline: string
  description: string
  worldId: string
  objectives: string[]
  skills: string[]
  prerequisites: string[]
  instructor: { name: string; role: string; intro: string }
  roadmap: string[] // the full topic outline (all topics, built or planned)
  accent: 'blue' | 'red' | 'yellow' | 'green'
  icon: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  xp: number
  /** progress 0..1 and whether it is unlocked, computed from state */
  check: (s: ProgressSnapshot) => { progress: number; done: boolean; label: string }
}

export interface ProgressSnapshot {
  completedLessons: Record<string, { at: string; perfect: boolean }>
  streak: number
  longestStreak: number
}

export interface UserProfile {
  name: string
  email: string
  username: string
  goal?: string
  level?: string
  track?: CourseId
  dailyMinutes?: number
}

export interface AppNotification {
  id: string
  kind: 'xp' | 'achievement' | 'unlock' | 'daily' | 'level' | 'info'
  title: string
  body: string
  at: string
  read: boolean
}
