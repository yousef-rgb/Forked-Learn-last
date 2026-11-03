import type { Achievement, Course, Lesson, ProgressSnapshot, Quest, World } from '../types'
import { csLessons } from './lessons/cs'
import { pyLessons } from './lessons/python'
import { jsLessons } from './lessons/js'

export const LESSONS: Lesson[] = [...csLessons, ...pyLessons, ...jsLessons]
export const lessonById = (id: string) => LESSONS.find((l) => l.id === id)
export const lessonsOfQuest = (questId: string) => LESSONS.filter((l) => l.questId === questId)

export const WORLDS: World[] = [
  { id: 'w1', num: 1, title: 'Computer Science Foundations', tagline: 'How machines think, store and talk.', course: 'cs', accent: 'blue', icon: 'globe' },
  { id: 'w2', num: 2, title: 'Python Programming', tagline: 'Readable code, real power.', course: 'python', accent: 'yellow', icon: 'brain' },
  { id: 'w3', num: 3, title: 'JavaScript Programming', tagline: 'Make the web move.', course: 'js', accent: 'red', icon: 'code' },
  { id: 'w4', num: 4, title: 'Problem Solving & Algorithms', tagline: 'Patterns that crack hard problems.', accent: 'green', icon: 'trophy' },
  { id: 'w5', num: 5, title: 'Final Projects', tagline: 'Build things people can use.', accent: 'blue', icon: 'rocket' },
]

const ids = (prefix: string) => LESSONS.filter((l) => l.id.startsWith(prefix)).map((l) => l.id)

export const QUESTS: Quest[] = [
  // World 01
  { id: 'q-cs1', worldId: 'w1', course: 'cs', num: 1, title: 'Introduction to Computer Science', description: 'What CS is, how computers work, algorithms, computational thinking and planning with pseudocode.', difficulty: 'Beginner', minutes: 53, xp: 120, prereqs: [], lessonIds: ids('cs1-'), icon: 'flag' },
  { id: 'q-cs2', worldId: 'w1', course: 'cs', num: 2, title: 'Binary & Data Representation', description: 'Bits, bytes, hex, text, images, audio, video and storage.', difficulty: 'Beginner', minutes: 55, xp: 140, prereqs: ['q-cs1'], lessonIds: ids('cs2-'), icon: 'calendar' },
  { id: 'q-cs3', worldId: 'w1', course: 'cs', num: 3, title: 'Algorithms', description: 'Searching, sorting, recursion and the language of Big O.', difficulty: 'Intermediate', minutes: 61, xp: 180, prereqs: ['q-cs2'], lessonIds: ids('cs3-'), icon: 'checklist' },
  { id: 'q-cs4', worldId: 'w1', course: 'cs', num: 4, title: 'Web & Software Fundamentals', description: 'The internet, HTTP, APIs, databases, authentication and testing.', difficulty: 'Intermediate', minutes: 60, xp: 180, prereqs: ['q-cs3'], lessonIds: ids('cs4-'), icon: 'doc' },
  { id: 'q-cs-boss', worldId: 'w1', course: 'cs', num: 5, title: 'Boss: The Machine', description: 'Prove World 01 mastery with a four-question boss challenge.', difficulty: 'Intermediate', minutes: 15, xp: 250, prereqs: ['q-cs4'], lessonIds: ['cs-boss'], boss: true, icon: 'crown' },

  // World 02
  { id: 'q-py1', worldId: 'w2', course: 'python', num: 1, title: 'First Spell: Python Basics', description: 'Install Python, run code and master variables, types and operators.', difficulty: 'Beginner', minutes: 37, xp: 120, prereqs: ['q-cs1'], lessonIds: ids('py1-'), icon: 'sprout' },
  { id: 'q-py2', worldId: 'w2', course: 'python', num: 2, title: 'Choices & Loops', description: 'Strings, conditions and loops: make your programs decide and repeat.', difficulty: 'Beginner', minutes: 28, xp: 120, prereqs: ['q-py1'], lessonIds: ids('py2-'), icon: 'star' },
  { id: 'q-py3', worldId: 'w2', course: 'python', num: 3, title: 'Collections', description: 'Lists, tuples, sets and dictionaries.', difficulty: 'Beginner', minutes: 29, xp: 150, prereqs: ['q-py2'], lessonIds: ids('py3-'), icon: 'checklist' },
  { id: 'q-py-boss', worldId: 'w2', course: 'python', num: 4, title: 'Boss: The Grade Book', description: 'Combine everything so far in a three-question boss challenge.', difficulty: 'Intermediate', minutes: 12, xp: 220, prereqs: ['q-py3'], lessonIds: ['py-boss'], boss: true, icon: 'crown' },
  { id: 'q-py4', worldId: 'w2', course: 'python', num: 5, title: 'Functions & Modules', description: 'Functions, scope, recursion, modules and packages.', difficulty: 'Intermediate', minutes: 60, xp: 160, prereqs: ['q-py-boss'], lessonIds: [], soon: true, icon: 'rocket' },
  { id: 'q-py5', worldId: 'w2', course: 'python', num: 6, title: 'Files, Errors & OOP', description: 'File handling, exceptions, debugging, classes, inheritance, polymorphism and encapsulation.', difficulty: 'Intermediate', minutes: 90, xp: 220, prereqs: ['q-py4'], lessonIds: [], soon: true, icon: 'doc' },
  { id: 'q-py6', worldId: 'w2', course: 'python', num: 7, title: 'Pythonic Power', description: 'Iterators, generators, decorators, comprehensions, APIs, testing and clean code.', difficulty: 'Advanced', minutes: 100, xp: 260, prereqs: ['q-py5'], lessonIds: [], soon: true, icon: 'crown' },

  // World 03
  { id: 'q-js1', worldId: 'w3', course: 'js', num: 1, title: 'Hello, JavaScript', description: 'The language, the runtime, variables and data types.', difficulty: 'Beginner', minutes: 36, xp: 120, prereqs: ['q-cs1'], lessonIds: ids('js1-'), icon: 'flag' },
  { id: 'q-js2', worldId: 'w3', course: 'js', num: 2, title: 'Logic & Functions', description: 'Operators, conversion, conditions, loops and functions.', difficulty: 'Beginner', minutes: 38, xp: 140, prereqs: ['q-js1'], lessonIds: ids('js2-'), icon: 'star' },
  { id: 'q-js3', worldId: 'w3', course: 'js', num: 3, title: 'Data Structures I', description: 'Arrays, array methods, objects, destructuring, spread and rest.', difficulty: 'Intermediate', minutes: 31, xp: 160, prereqs: ['q-js2'], lessonIds: ids('js3-'), icon: 'checklist' },
  { id: 'q-js-boss', worldId: 'w3', course: 'js', num: 4, title: 'Boss: The Inventory', description: 'Combine functions, arrays and objects in a boss challenge.', difficulty: 'Intermediate', minutes: 12, xp: 220, prereqs: ['q-js3'], lessonIds: ['js-boss'], boss: true, icon: 'crown' },
  { id: 'q-js4', worldId: 'w3', course: 'js', num: 5, title: 'Scope & Closures', description: 'Scope, closures, execution context and hoisting.', difficulty: 'Intermediate', minutes: 50, xp: 160, prereqs: ['q-js-boss'], lessonIds: [], soon: true, icon: 'sprout' },
  { id: 'q-js5', worldId: 'w3', course: 'js', num: 6, title: 'The DOM', description: 'DOM, manipulation, events, event delegation and error handling.', difficulty: 'Intermediate', minutes: 70, xp: 200, prereqs: ['q-js4'], lessonIds: [], soon: true, icon: 'doc' },
  { id: 'q-js6', worldId: 'w3', course: 'js', num: 7, title: 'Async JavaScript', description: 'Callbacks, promises, async/await, the event loop, fetch, JSON and modules.', difficulty: 'Advanced', minutes: 110, xp: 280, prereqs: ['q-js5'], lessonIds: [], soon: true, icon: 'rocket' },

  // World 04
  { id: 'q-ps1', worldId: 'w4', num: 1, title: 'Problem-Solving Patterns', description: 'Break problems down, find patterns and choose strategies.', difficulty: 'Intermediate', minutes: 60, xp: 200, prereqs: ['q-py-boss', 'q-js-boss'], lessonIds: [], soon: true, icon: 'trophy' },
  { id: 'q-ps2', worldId: 'w4', num: 2, title: 'Hashing & Two Pointers', description: 'Fast lookups and clever scanning techniques.', difficulty: 'Advanced', minutes: 70, xp: 240, prereqs: ['q-ps1'], lessonIds: [], soon: true, icon: 'star' },
  { id: 'q-ps3', worldId: 'w4', num: 3, title: 'Recursion & Backtracking', description: 'Explore every possibility without getting lost.', difficulty: 'Advanced', minutes: 80, xp: 260, prereqs: ['q-ps2'], lessonIds: [], soon: true, icon: 'crown' },

  // World 05
  { id: 'q-pr1', worldId: 'w5', num: 1, title: 'Calculator & Guessing Game', description: 'Your first complete programs.', difficulty: 'Beginner', minutes: 90, xp: 300, prereqs: ['q-ps1'], lessonIds: [], soon: true, icon: 'rocket' },
  { id: 'q-pr2', worldId: 'w5', num: 2, title: 'Quiz App & To-Do App', description: 'State, events and data.', difficulty: 'Intermediate', minutes: 120, xp: 400, prereqs: ['q-pr1'], lessonIds: [], soon: true, icon: 'checklist' },
  { id: 'q-pr3', worldId: 'w5', num: 3, title: 'Capstone: Interactive Dashboard', description: 'Ship something you are proud of.', difficulty: 'Advanced', minutes: 240, xp: 700, prereqs: ['q-pr2'], lessonIds: [], soon: true, icon: 'crown' },
]

export const questById = (id: string) => QUESTS.find((q) => q.id === id)
export const questsOfWorld = (worldId: string) => QUESTS.filter((q) => q.worldId === worldId)
export const questOfLesson = (lessonId: string) => QUESTS.find((q) => q.lessonIds.includes(lessonId))

export const COURSES: Course[] = [
  {
    id: 'cs', title: 'Computer Science Foundations', tagline: 'Think like an engineer before you type a line.',
    description: 'A CS50-inspired tour of how computers work: binary, algorithms, the web, and the problem-solving habits behind every great program. No prior experience required.',
    worldId: 'w1', accent: 'blue', icon: 'globe',
    objectives: ['Explain how hardware and software cooperate', 'Convert between binary, decimal and hexadecimal', 'Compare algorithms using Big O', 'Describe how the web, APIs and databases fit together'],
    skills: ['Computational thinking', 'Binary & data', 'Searching & sorting', 'Recursion', 'HTTP & APIs', 'Debugging mindset'],
    prerequisites: ['None. Curiosity is enough.'],
    instructor: { name: 'Team Forked Learn', role: 'Curriculum guild', intro: 'Welcome, adventurer. In this world we open the machine and look inside. Every lesson is a short mission: read the briefing, explore the concept, try the exercise and clear the knowledge check.' },
    roadmap: ['What is Computer Science?', 'What is Programming?', 'How Computers Work', 'Hardware and Software', 'Algorithms', 'Computational Thinking', 'Decomposition', 'Abstraction', 'Pseudocode', 'Flowcharts', 'Binary', 'Bits and Bytes', 'Decimal Conversion', 'Hexadecimal', 'ASCII', 'Unicode', 'Images', 'Audio', 'Video', 'Data Storage', 'Searching', 'Linear Search', 'Binary Search', 'Sorting', 'Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Recursion', 'Big O', 'Time Complexity', 'Space Complexity', 'Internet', 'Client and Server', 'HTTP and HTTPS', 'DNS', 'APIs', 'JSON', 'Frontend and Backend', 'Databases', 'SQL', 'Authentication', 'Debugging', 'Testing'],
  },
  {
    id: 'python', title: 'Python Programming', tagline: 'From print("hello") to real programs.',
    description: 'Learn Python the way professionals use it: clear, readable and test-friendly. Start with variables and finish with data structures, object-oriented design and real APIs.',
    worldId: 'w2', accent: 'yellow', icon: 'brain',
    objectives: ['Write and run Python scripts', 'Use strings, conditions and loops confidently', 'Model data with lists, tuples, sets and dictionaries', 'Prepare for functions, OOP and testing'],
    skills: ['Variables & types', 'Control flow', 'Collections', 'Problem decomposition'],
    prerequisites: ['Complete CS Foundations: Introduction to Computer Science'],
    instructor: { name: 'Team Forked Learn', role: 'Python guild', intro: 'Python reads like English, so we can focus on thinking. Type every example yourself; muscle memory is half the magic.' },
    roadmap: ['Introduction to Python', 'Installation and Execution', 'Variables', 'Data Types', 'Operators', 'Strings', 'Conditions', 'Loops', 'Lists', 'Tuples', 'Sets', 'Dictionaries', 'Functions', 'Scope', 'Recursion', 'Modules', 'Packages', 'File Handling', 'Exceptions', 'Debugging', 'Object-Oriented Programming', 'Classes and Objects', 'Inheritance', 'Polymorphism', 'Encapsulation', 'Iterators', 'Generators', 'Decorators', 'Comprehensions', 'APIs', 'Testing', 'Clean Code', 'Algorithms', 'Data Structures'],
  },
  {
    id: 'js', title: 'JavaScript Programming', tagline: 'The language of the browser, from zero.',
    description: 'Learn the language that powers the interactive web. Build solid foundations in values, functions and data before moving on to the DOM, asynchronous code and tooling.',
    worldId: 'w3', accent: 'red', icon: 'code',
    objectives: ['Run JavaScript in the console and in Node', 'Reason about types and coercion', 'Write functions and use array methods', 'Model data with objects, destructuring and spread'],
    skills: ['Variables & types', 'Functions', 'Arrays & objects', 'Modern syntax (ES6+)'],
    prerequisites: ['Complete CS Foundations: Introduction to Computer Science'],
    instructor: { name: 'Team Forked Learn', role: 'JavaScript guild', intro: 'JavaScript is quirky, powerful and everywhere. We will learn it deliberately, so the quirks become tools instead of traps.' },
    roadmap: ['JavaScript Introduction', 'JavaScript Runtime', 'Variables', 'Data Types', 'Operators', 'Type Conversion', 'Conditions', 'Loops', 'Functions', 'Scope', 'Closures', 'Arrays', 'Array Methods', 'Objects', 'Destructuring', 'Spread and Rest', 'DOM', 'DOM Manipulation', 'Events', 'Event Delegation', 'Error Handling', 'Execution Context', 'Hoisting', 'Prototypes', 'Classes', 'Inheritance', 'Asynchronous JavaScript', 'Callbacks', 'Promises', 'Async/Await', 'Event Loop', 'Fetch API', 'JSON', 'ES Modules', 'npm', 'Node.js Fundamentals', 'Testing', 'Algorithms', 'Data Structures', 'Performance Optimization'],
  },
]
export const courseById = (id: string) => COURSES.find((c) => c.id === id)!
export const questsOfCourse = (id: string) => QUESTS.filter((q) => q.course === id)

/* ───────────── Achievements ───────────── */
const count = (s: ProgressSnapshot, prefix: string) => Object.keys(s.completedLessons).filter((k) => k.startsWith(prefix)).length
const total = (s: ProgressSnapshot) => Object.keys(s.completedLessons).length
const questDone = (s: ProgressSnapshot, questId: string) => {
  const ls = questById(questId)?.lessonIds ?? []
  return ls.length > 0 && ls.every((id) => s.completedLessons[id])
}
const ratio = (n: number, d: number) => Math.min(1, n / d)

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-line', title: 'First Line of Code', description: 'Complete your first lesson.', icon: 'flag', xp: 25, check: (s) => ({ progress: ratio(total(s), 1), done: total(s) >= 1, label: `${Math.min(total(s), 1)}/1 lesson` }) },
  { id: 'python-explorer', title: 'Python Explorer', description: 'Complete 3 Python lessons.', icon: 'brain', xp: 50, check: (s) => ({ progress: ratio(count(s, 'py'), 3), done: count(s, 'py') >= 3, label: `${Math.min(count(s, 'py'), 3)}/3 lessons` }) },
  { id: 'js-explorer', title: 'JavaScript Explorer', description: 'Complete 3 JavaScript lessons.', icon: 'code', xp: 50, check: (s) => ({ progress: ratio(count(s, 'js'), 3), done: count(s, 'js') >= 3, label: `${Math.min(count(s, 'js'), 3)}/3 lessons` }) },
  { id: 'logic-master', title: 'Logic Master', description: 'Finish Introduction to Computer Science.', icon: 'star', xp: 60, check: (s) => ({ progress: ratio(count(s, 'cs1-'), 6), done: questDone(s, 'q-cs1'), label: `${count(s, 'cs1-')}/6 lessons` }) },
  { id: 'algorithm-master', title: 'Algorithm Master', description: 'Finish the Algorithms quest.', icon: 'trophy', xp: 100, check: (s) => ({ progress: ratio(count(s, 'cs3-'), 6), done: questDone(s, 'q-cs3'), label: `${count(s, 'cs3-')}/6 lessons` }) },
  { id: 'perfect-score', title: 'Perfect Score', description: 'Answer a knowledge check perfectly on the first try.', icon: 'crown', xp: 40, check: (s) => { const n = Object.values(s.completedLessons).filter((l) => l.perfect).length; return { progress: ratio(n, 1), done: n >= 1, label: `${Math.min(n, 1)}/1 perfect` } } },
  { id: 'seven-day-streak', title: 'Seven-Day Streak', description: 'Learn seven days in a row.', icon: 'flame', xp: 120, check: (s) => ({ progress: ratio(s.longestStreak, 7), done: s.longestStreak >= 7, label: `${Math.min(s.longestStreak, 7)}/7 days` }) },
  { id: 'boss-slayer', title: 'Boss Slayer', description: 'Defeat any boss challenge.', icon: 'rocket', xp: 150, check: (s) => { const n = ['cs-boss', 'py-boss', 'js-boss'].filter((id) => s.completedLessons[id]).length; return { progress: ratio(n, 1), done: n >= 1, label: `${Math.min(n, 1)}/1 boss` } } },
  { id: 'bug-hunter', title: 'Bug Hunter', description: 'Opens with the Challenge Arena (coming soon).', icon: 'heart', xp: 80, check: () => ({ progress: 0, done: false, label: 'Locked' }) },
  { id: 'first-project', title: 'First Project', description: 'Opens with the Project Workshop (coming soon).', icon: 'handshake', xp: 200, check: () => ({ progress: 0, done: false, label: 'Locked' }) },
]

/** Roadmap topics that already have playable lessons today (everything else is shown as planned). */
export const BUILT_TOPICS: Record<'cs' | 'python' | 'js', string[]> = {
  cs: COURSES[0].roadmap,
  python: COURSES[1].roadmap.slice(0, 12),
  js: [...COURSES[2].roadmap.slice(0, 9), ...COURSES[2].roadmap.slice(11, 16)],
}
