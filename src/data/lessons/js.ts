import { lesson, q } from './kit'

const j1 = lesson('q-js1')
const j2 = lesson('q-js2')
const j3 = lesson('q-js3')
const boss = lesson('q-js-boss')

export const jsLessons = [
  /* ───── Quest: Hello, JavaScript ───── */
  j1(
    'js1-1', 'JavaScript Introduction', 8,
    'The language that brings the web to life.',
    [
      ['What it does', 'JavaScript is the programming language of the browser: it reacts to clicks, updates the page and talks to servers. With Node.js it also runs on servers and your own computer.'],
      ['Running your first line', 'Open any browser, press F12, choose Console and type console.log("Hello"). You are now running JavaScript. In a real project you load it with a script tag or run it with node file.js.'],
    ],
    'HTML is the skeleton of a page, CSS is its clothing and JavaScript is the muscles that make it move.',
    ['Browser console', 'console.log', 'Script tag', 'Node.js'],
    ['Print a greeting and the result of 6 * 7 in the console.', ['Open the console (F12).', 'Use console.log twice.'], ['console.log accepts several values.']],
    [q('JavaScript primarily runs in...', ['Only on servers', 'Browsers (and Node.js)', 'Only on phones', 'Only in Excel'], 1, 'It started in browsers and now runs in Node too.'),
     q('Which prints to the console?', ['print("x")', 'echo "x"', 'console.log("x")', 'say("x")'], 2, 'console.log is the standard.')],
    { code: ['javascript', 'hello.js', '// Your first JavaScript\nconsole.log("Hello, Forked Learn!");\nconsole.log(6 * 7);'] },
  ),
  j1(
    'js1-2', 'The JavaScript Runtime', 9,
    'Where your code actually runs.',
    [
      ['Engine and host', 'A JavaScript engine (V8 in Chrome and Node) parses and executes code. The host environment adds extras: a browser provides the DOM and fetch, Node provides files and networking.'],
      ['One thread, one thing at a time', 'JavaScript runs on a single main thread, executing one piece of code at a time. Long loops freeze the page, which is why waiting work (timers, network) is handed off and returned later. You will learn exactly how in the async quests.'],
    ],
    'A single chef in a kitchen: only one dish is actively cooked at once, but the oven and the timers work in the background.',
    ['Engine (V8)', 'Host environment', 'Single thread', 'Blocking'],
    ['List three things only a browser can do and three things only Node can do.', ['Think about the page, the screen, files and servers.'], ['The DOM is a browser-only API.']],
    [q('V8 is...', ['A framework', 'A JavaScript engine', 'A database', 'A CSS tool'], 1, 'It powers Chrome and Node.'),
     q('JavaScript\'s main thread executes...', ['Many tasks truly at once', 'One task at a time', 'Only async code', 'Nothing'], 1, 'There is one call stack.')],
  ),
  j1(
    'js1-3', 'Variables', 9,
    'let, const and the ghost of var.',
    [
      ['Declaring variables', 'Use const for values that never get reassigned and let for ones that do. Avoid var in new code: it has confusing scoping. Prefer const by default; switch to let when you need to change it.'],
      ['Naming', 'Use camelCase (playerScore). Names are case-sensitive and cannot start with a digit.'],
    ],
    'const is a label glued to a box; let is a label you can move to another box.',
    ['const', 'let', 'camelCase', 'Reassignment'],
    ['Declare a constant for your name and a variable for a score you update twice.', ['Use const and let appropriately.', 'Log the final score.'], ['Trying to reassign a const throws an error.']],
    [q('Which keyword prevents reassignment?', ['let', 'var', 'const', 'set'], 2, 'const bindings cannot be reassigned.'),
     q('Which is the idiomatic JavaScript variable name style?', ['player_score', 'PlayerScore', 'playerScore', 'player-score'], 2, 'camelCase.')],
    { code: ['javascript', 'variables.js', 'const player = "Nour";\nlet score = 10;\nscore = score + 5;\nconsole.log(player, score);'] },
  ),
  j1(
    'js1-4', 'Data Types', 10,
    'Seven primitives and objects.',
    [
      ['Primitives', 'number (integers and decimals alike), string, boolean, undefined (declared but unassigned), null (intentionally empty), bigint and symbol. Everything else, such as arrays and functions, is an object. Check with typeof.'],
      ['Gotchas', 'typeof null is "object" (a historic bug). 0.1 + 0.2 is not exactly 0.3 because of floating-point math. NaN means "not a number" and is the only value not equal to itself.'],
    ],
    'Primitives are single coins; objects are wallets that hold many things.',
    ['typeof', 'null vs undefined', 'NaN', 'Floating point'],
    ['Predict then check: typeof 42, typeof "42", typeof null, typeof undefined.', ['Write your predictions first.', 'Run them in the console.'], ['One answer will surprise you.']],
    [q('typeof "hello" is...', ['"text"', '"string"', '"char"', '"word"'], 1, 'Strings are a primitive type.'),
     q('0.1 + 0.2 === 0.3 is...', ['true', 'false', 'error', 'undefined'], 1, 'Binary floating point is inexact.')],
    { code: ['javascript', 'types.js', 'console.log(typeof 42);        // number\nconsole.log(typeof "42");      // string\nconsole.log(typeof null);      // object (historic quirk)\nconsole.log(0.1 + 0.2);        // 0.30000000000000004'] },
  ),

  /* ───── Quest: Logic & Functions ───── */
  j2(
    'js2-1', 'Operators and Type Conversion', 10,
    'Why "5" + 1 is not 6.',
    [
      ['Operators', 'Arithmetic (+ - * / % **), comparison and logic (&&, ||, !) behave as you expect. Always compare with === (strict equality) which never converts types; == silently coerces and causes surprises.'],
      ['Conversion', '+ with a string concatenates: "5" + 1 is "51". Other math operators convert strings to numbers: "5" - 1 is 4. Convert explicitly with Number(), String() and Boolean() to stay in control.'],
    ],
    'Coercion is an over-helpful waiter who changes your order "to be helpful". Strict equality says: serve exactly what I asked for.',
    ['=== vs ==', 'Coercion', 'Number()', 'Truthy/falsy'],
    ['Predict "5" + 1, "5" - 1 and "5" === 5.', ['Write your guesses.', 'Check in the console.'], ['+ prefers strings.']],
    [q('"5" + 1 evaluates to...', ['6', '"51"', 'NaN', 'Error'], 1, '+ concatenates when one side is a string.'),
     q('Prefer which equality check?', ['==', '===', '=', '!'], 1, 'Strict equality avoids coercion surprises.')],
    { code: ['javascript', 'coercion.js', 'console.log("5" + 1);   // "51"\nconsole.log("5" - 1);   // 4\nconsole.log(5 === "5"); // false\nconsole.log(Number("42") + 1); // 43'] },
  ),
  j2(
    'js2-2', 'Conditions', 8,
    'Decide what runs.',
    [
      ['if / else / switch', 'if, else if and else work as in most languages, with parentheses around the condition and braces around the block. switch compares one value against many cases and needs a break in each.'],
      ['Ternary and short-circuit', 'condition ? a : b picks one of two values. a && b and a || b return one of their operands, which is handy for defaults: const name = input || "Guest".'],
    ],
    'Traffic lights: green, yellow or red decides what every car does next.',
    ['Truthiness', 'Ternary', 'switch', 'Short-circuit'],
    ['Write a function-free snippet that logs "adult" or "minor" for an age variable using a ternary.', ['Set age.', 'Use ? and :.'], ['console.log(age >= 18 ? "adult" : "minor")']],
    [q('Which is falsy in JavaScript?', ['"0"', '[]', '0', '{}'], 2, 'Only 0, "", null, undefined, NaN and false are falsy.'),
     q('condition ? a : b is called...', ['A ternary operator', 'A switch', 'A loop', 'A closure'], 0, 'It has three operands.')],
    { code: ['javascript', 'conditions.js', 'const age = 20;\nconsole.log(age >= 18 ? "adult" : "minor");\n\nconst username = "" || "Guest";\nconsole.log(username); // Guest'] },
  ),
  j2(
    'js2-3', 'Loops', 9,
    'for, while and for...of.',
    [
      ['Classic loops', 'for (let i = 0; i < 5; i++) is the counting loop. while repeats while a condition holds, and do...while always runs at least once.'],
      ['for...of', 'for (const item of list) walks through the values of an array or string without index bookkeeping. Use it whenever you do not need the index.'],
    ],
    'A loop is a treadmill with a counter: it keeps going until the display shows the target.',
    ['for', 'while', 'for...of', 'break/continue'],
    ['Log the numbers 1 to 10 that are divisible by 3.', ['Loop 1..10.', 'Check i % 3 === 0.'], ['Use continue to skip non-matches.']],
    [q('for (let i = 0; i < 3; i++) runs how many times?', ['2', '3', '4', 'Forever'], 1, 'i is 0, 1 and 2.'),
     q('for...of iterates over...', ['Object keys only', 'Values of an iterable', 'Nothing', 'Functions'], 1, 'Arrays, strings, sets and more.')],
    { code: ['javascript', 'loops.js', 'for (let i = 1; i <= 10; i++) {\n  if (i % 3 === 0) console.log(i);\n}\n\nfor (const letter of "FORK") console.log(letter);'] },
  ),
  j2(
    'js2-4', 'Functions', 11,
    'Reusable, named blocks of work.',
    [
      ['Declaring', 'A function takes parameters and returns a value. function add(a, b) { return a + b } or the shorter arrow form const add = (a, b) => a + b. Without return, a function gives back undefined.'],
      ['Functions are values', 'In JavaScript you can store functions in variables, pass them to other functions and return them. This is the foundation of callbacks, array methods and almost all modern JavaScript.'],
    ],
    'A function is a vending machine: put in coins (arguments), receive a snack (return value), and never think about the mechanism.',
    ['Parameters / arguments', 'return', 'Arrow functions', 'First-class functions'],
    ['Write a function square(n) and use it to log the squares of 1 to 5.', ['Define the function.', 'Call it in a loop.'], ['An arrow function can be one line: const square = n => n * n.']],
    [q('A function with no return statement returns...', ['null', '0', 'undefined', 'An error'], 2, 'undefined by default.'),
     q('Which is an arrow function?', ['function f() {}', 'const f = () => 1', 'f => function', 'def f(): 1'], 1, 'The => syntax.')],
    { code: ['javascript', 'functions.js', 'const square = (n) => n * n;\nfor (let i = 1; i <= 5; i++) {\n  console.log(square(i));\n}'] },
  ),

  /* ───── Quest: Data Structures I ───── */
  j3(
    'js3-1', 'Arrays and Array Methods', 11,
    'Lists with superpowers.',
    [
      ['Arrays', 'An array holds ordered values: const xs = [3, 1, 2]. Access by index, check xs.length, add with push, remove with pop. Arrays are objects, so const only stops reassignment, not changes inside.'],
      ['Transform with methods', 'map transforms every item, filter keeps matches, reduce folds everything into one value, find returns the first match and sort orders items. Chain them to describe what you want instead of how to loop.'],
    ],
    'An assembly line: map paints every item, filter removes defects, reduce packs them into one box.',
    ['push / pop', 'map', 'filter', 'reduce', 'sort'],
    ['From [1, 2, 3, 4, 5, 6], get the sum of the squares of the even numbers.', ['filter the even numbers.', 'map to squares.', 'reduce to a sum.'], ['The answer is 4 + 16 + 36 = 56.']],
    [q('Which method returns a new array with only matching items?', ['map', 'filter', 'reduce', 'push'], 1, 'filter keeps items passing the test.'),
     q('[1, 2, 3].map(x => x * 2) returns...', ['[2, 4, 6]', '12', '[1, 2, 3]', 'undefined'], 0, 'map transforms each element.')],
    { code: ['javascript', 'arrays.js', 'const nums = [1, 2, 3, 4, 5, 6];\nconst total = nums\n  .filter((n) => n % 2 === 0)\n  .map((n) => n * n)\n  .reduce((sum, n) => sum + n, 0);\nconsole.log(total); // 56'] },
  ),
  j3(
    'js3-2', 'Objects', 10,
    'Group related data under names.',
    [
      ['Creating objects', 'An object stores key–value pairs: const user = { name: "Nour", xp: 120 }. Read with user.name or user["xp"], add or change by assignment, and delete with delete.'],
      ['Methods and iteration', 'A property can hold a function, making it a method. Object.keys, Object.values and Object.entries turn an object into arrays you can loop over.'],
    ],
    'An ID card: labeled fields (name, number, expiry) rather than a pile of unlabeled facts.',
    ['Properties', 'Dot vs bracket access', 'Object.entries', 'Methods'],
    ['Model a book with title, author and pages, then log a sentence about it.', ['Create the object.', 'Combine properties in one string.'], ['Template strings use backticks, or just use + between strings.']],
    [q('How do you read the xp property of user?', ['user.xp', 'user->xp', 'user:xp', 'xp(user)'], 0, 'Dot notation.'),
     q('Object.keys({ a: 1, b: 2 }) returns...', ['[1, 2]', '["a", "b"]', '2', '{}'], 1, 'An array of the key names.')],
    { code: ['javascript', 'objects.js', 'const user = { name: "Nour", xp: 120 };\nuser.xp += 30;\nfor (const [key, value] of Object.entries(user)) {\n  console.log(key, value);\n}'] },
  ),
  j3(
    'js3-3', 'Destructuring, Spread and Rest', 10,
    'Concise syntax for pulling data apart and putting it together.',
    [
      ['Destructuring', 'const { name, xp } = user pulls properties into variables, and const [first, second] = list does the same for arrays. You can rename and give defaults too.'],
      ['Spread and rest', 'The three dots do two jobs. Spread expands: [...a, ...b] copies and merges, { ...user, xp: 200 } copies with a change. Rest collects: function sum(...nums) receives all arguments as an array.'],
    ],
    'Destructuring is unpacking a suitcase; spread is dumping its contents into another; rest is packing all the leftovers into a bag.',
    ['Destructuring', 'Spread', 'Rest parameters', 'Shallow copy'],
    ['Write sum(...nums) that adds any number of arguments.', ['Use rest parameters.', 'Use reduce.'], ['sum(1, 2, 3) should be 6.']],
    [q('{ ...user, xp: 200 } creates...', ['A reference to user', 'A shallow copy with xp changed', 'A deep clone', 'An error'], 1, 'Spread makes a new object.'),
     q('function f(...args) collects arguments into...', ['A string', 'An object', 'An array', 'A set'], 2, 'Rest parameters form an array.')],
    { code: ['javascript', 'spread.js', 'const user = { name: "Nour", xp: 120 };\nconst upgraded = { ...user, xp: 200 };\nconst { name, xp } = upgraded;\nconsole.log(name, xp);\n\nconst sum = (...nums) => nums.reduce((a, b) => a + b, 0);\nconsole.log(sum(1, 2, 3)); // 6'] },
  ),

  boss(
    'js-boss', 'Boss Challenge: The Inventory', 12,
    'Combine variables, functions, arrays and objects.',
    [['The rules', 'Three questions that mix everything from World 03 so far.']],
    'Real programs are made of small ideas working together. This is your first taste of that.',
    ['Arrays + objects', 'Functions', 'Equality'],
    ['Plan an inventory as an array of objects and describe how to find items under 10 dollars.', ['Sketch two items.', 'Describe the filter callback.'], ['items.filter((i) => i.price < 10).']],
    [q('Which best models a list of products with names and prices?', ['A single string', 'An array of objects', 'A number', 'A boolean'], 1, 'Each item is an object; the list is an array.'),
     q('["a", "b"].length is...', ['1', '2', '3', 'undefined'], 1, 'Two elements.'),
     q('"2" === 2 is...', ['true', 'false', 'error', 'NaN'], 1, 'Strict equality compares types too.')],
    { boss: true },
  ),
]
