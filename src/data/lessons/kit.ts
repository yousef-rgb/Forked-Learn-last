import type { Lesson, QuizQuestion } from '../../types'

type Sec = [string, ...string[]]
type Ex = [prompt: string, steps: string[], hints: string[]]
type Code = ['python' | 'javascript' | 'text', label: string, source: string]

/** Compact lesson factory so curriculum files stay readable. */
export const lesson =
  (questId: string) =>
  (
    id: string,
    title: string,
    minutes: number,
    brief: string,
    sections: Sec[],
    analogy: string,
    keyConcepts: string[],
    ex: Ex,
    quiz: QuizQuestion[],
    extra: { code?: Code; widget?: Lesson['widget']; boss?: boolean } = {},
  ): Lesson => ({
    id,
    questId,
    title,
    minutes,
    brief,
    sections: sections.map(([heading, ...body]) => ({ heading, body })),
    analogy,
    keyConcepts,
    exercise: { prompt: ex[0], steps: ex[1], hints: ex[2] },
    quiz,
    code: extra.code ? { lang: extra.code[0], label: extra.code[1], source: extra.code[2] } : undefined,
    widget: extra.widget,
    boss: extra.boss,
  })

export const q = (question: string, options: string[], answer: number, explain: string): QuizQuestion => ({
  q: question,
  options,
  answer,
  explain,
})
