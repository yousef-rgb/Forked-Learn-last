import { lesson, q } from './kit'

const p1 = lesson('q-py1')
const p2 = lesson('q-py2')
const p3 = lesson('q-py3')
const boss = lesson('q-py-boss')

export const pyLessons = [
  /* ───── Quest: First Spell (Introduction, Setup, Variables, Types) ───── */
  p1(
    'py1-1', 'Introduction to Python, Installation and Execution', 9,
    'Meet Python and run your first program.',
    [
      ['Why Python?', 'Python is a readable, general-purpose language used for web backends, data science, automation and AI. Its syntax is close to plain English, which makes it the favorite first language at many universities.'],
      ['Installing and running', 'Install Python from python.org, then run a file with python hello.py in a terminal, or experiment line by line in the interactive prompt (REPL) by typing python. Python is interpreted: it reads and runs your code top to bottom.'],
    ],
    'Python is like talking to a patient assistant: you give one instruction at a time and see the result right away.',
    ['Interpreter', 'REPL', 'print()', 'Script file'],
    ['Write a program that prints your name and your goal for this course.', ['Create a file called hello.py.', 'Use two print() calls.', 'Run it from the terminal.'], ['Text goes inside quotes.', 'Each print() starts a new line.']],
    [q('How do you run a file named app.py?', ['run app.py', 'python app.py', 'start python', 'open app'], 1, 'The interpreter is called with the file name.'),
     q('Python code is executed...', ['All at once in random order', 'Top to bottom by the interpreter', 'Only after compiling to a .exe', 'By the browser'], 1, 'The interpreter reads statements in order.')],
    { code: ['python', 'hello.py', '# Your first Python program\nprint("Hello, Forked Learn!")\nprint("Let\'s begin.")'] },
  ),
  p1(
    'py1-2', 'Variables', 9,
    'Give names to values so you can reuse them.',
    [
      ['Naming a value', 'A variable is a name that refers to a value. Assign with =, as in score = 10. You can reassign later, and Python figures out the type itself.'],
      ['Good names', 'Use lowercase words with underscores (player_name). Names cannot start with a digit or contain spaces, and good names say what the value means, so total_price is better than x.'],
    ],
    'A variable is a labeled box. You can open the box, look inside and swap its contents; the label stays.',
    ['Assignment', 'Reassignment', 'snake_case', 'Readable names'],
    ['Store a price and a quantity in variables and print the total.', ['Create price and quantity.', 'Create total = price * quantity.', 'Print the total.'], ['Multiplication uses *.']],
    [q('Which is a valid variable name?', ['2score', 'my score', 'my_score', 'my-score'], 2, 'Underscores are allowed; spaces and hyphens are not.'),
     q('After x = 3 then x = x + 1, x is...', ['3', '4', '31', 'Error'], 1, 'The new value replaces the old one.')],
    { code: ['python', 'variables.py', 'player_name = "Nour"\nscore = 10\nscore = score + 5\nprint(player_name, "has", score, "points")'] },
  ),
  p1(
    'py1-3', 'Data Types', 10,
    'Numbers, text and truth values behave differently.',
    [
      ['The core types', 'int is a whole number (7), float a decimal (3.14), str is text ("hi"), bool is True or False, and None means "nothing yet". Use type(value) to check what you have.'],
      ['Converting types', 'input() always returns text, so convert it with int() or float() before doing math. Mixing types without converting is a classic beginner error.'],
    ],
    'Types are the shapes of Lego bricks. A round brick will not click into a square hole until you convert it.',
    ['int, float, str, bool', 'type()', 'Type conversion', 'None'],
    ['Ask for two numbers and print their sum.', ['Use input() twice.', 'Convert both with int().', 'Print the sum.'], ['"2" + "3" gives "23" because they are text.']],
    [q('type(3.0) is...', ['int', 'float', 'str', 'bool'], 1, 'A decimal point makes it a float.'),
     q('"5" + "5" evaluates to...', ['10', '"55"', 'Error', '25'], 1, 'Strings are concatenated.')],
    { code: ['python', 'types.py', 'age = int(input("Age: "))\nprint(type(age))      # <class \'int\'>\nprint(age + 1)'] },
  ),
  p1(
    'py1-4', 'Operators', 9,
    'Arithmetic, comparison and logic.',
    [
      ['Arithmetic and comparison', '+, -, *, / (always float), // (floor division), % (remainder) and ** (power) do math. Comparisons such as ==, !=, <, >, <=, >= produce True or False. Remember: = assigns, == compares.'],
      ['Logical operators', 'and, or, not combine booleans. Python evaluates left to right and stops as soon as the result is known (short-circuiting).'],
    ],
    'Operators are the verbs of expressions: they take values and return a new one, just as a calculator does.',
    ['// and %', '== vs =', 'and / or / not', 'Precedence'],
    ['Check whether a number is divisible by 3 and by 5.', ['Use % to test divisibility.', 'Combine both tests with and.'], ['n % 3 == 0 is True for multiples of 3.']],
    [q('7 // 2 equals...', ['3.5', '3', '4', '1'], 1, 'Floor division drops the fraction.'),
     q('7 % 2 equals...', ['3', '1', '0', '2'], 1, 'The remainder of 7 ÷ 2 is 1.')],
    { code: ['python', 'operators.py', 'n = 15\nprint(n % 3 == 0 and n % 5 == 0)  # True\nprint(2 ** 8)                      # 256'] },
  ),

  /* ───── Quest: Choices & Loops ───── */
  p2(
    'py2-1', 'Strings', 9,
    'Work with text.',
    [
      ['Creating and slicing', 'Strings can use single or double quotes. Index with text[0] (the first character) and slice with text[1:4]. Strings are immutable: operations return new strings.'],
      ['Useful tools', 'f-strings embed values: f"Hello {name}". Methods include .upper(), .lower(), .strip(), .split(), .replace() and len(text) gives the length.'],
    ],
    'A string is a necklace of characters, each bead numbered from zero.',
    ['Indexing from 0', 'Slicing', 'f-strings', 'Immutability'],
    ['Print the first and last letters of a word.', ['Read a word with input().', 'Use index 0 and -1.'], ['Negative indexes count from the end.']],
    [q('"python"[0] is...', ['"p"', '"y"', '"n"', 'Error'], 0, 'Indexes start at zero.'),
     q('Which creates a formatted string?', ['f"Hi {name}"', 'format name', '"Hi" + name + 1', 'Hi {name}'], 0, 'f-strings are the modern approach.')],
    { code: ['python', 'strings.py', 'word = "quest"\nprint(word[0], word[-1])      # q t\nprint(word.upper(), len(word)) # QUEST 5\nprint(f"Welcome to {word}!")'] },
  ),
  p2(
    'py2-2', 'Conditions', 9,
    'Make your program choose.',
    [
      ['if, elif, else', 'An if statement runs its block only when the condition is True. Add elif for more options and else for everything else. Python uses indentation, not braces, to show which lines belong together.'],
      ['Truthiness', 'Empty strings, zero, empty lists and None count as False; most other values count as True. That lets you write if items: instead of if len(items) > 0.'],
    ],
    'A fork in the road with signs: the first sign that matches decides your path; "else" is the default road.',
    ['Indentation', 'Boolean expressions', 'Truthy/falsy'],
    ['Write a grade calculator: 90+ A, 80+ B, 70+ C, otherwise Try again.', ['Read a score as an int.', 'Use if / elif / else in the right order.'], ['Check the highest threshold first.']],
    [q('How does Python group the lines of an if-block?', ['Curly braces', 'Indentation', 'BEGIN/END', 'Semicolons'], 1, 'Whitespace is syntax.'),
     q('Which value is falsy?', ['"0"', '[0]', '0', '"False"'], 2, 'Numeric zero is falsy; non-empty strings are truthy.')],
    { code: ['python', 'grade.py', 'score = 84\nif score >= 90:\n    print("A")\nelif score >= 80:\n    print("B")\nelse:\n    print("Keep going")'] },
  ),
  p2(
    'py2-3', 'Loops', 10,
    'Repeat work without repeating code.',
    [
      ['for loops', 'for repeats once per item in a sequence: for letter in "abc". Use range(n) to count from 0 to n−1, or range(start, stop, step).'],
      ['while loops', 'while repeats as long as a condition stays true, so something inside must eventually change it or you get an infinite loop. break exits early and continue skips to the next round.'],
    ],
    'A for loop is walking down a row of mailboxes; a while loop is knocking until someone answers.',
    ['for / range', 'while', 'break / continue', 'Infinite loop'],
    ['Print the multiplication table of 7 from 1 to 10.', ['Use for i in range(1, 11).', 'Print i * 7 on each round.'], ['range(1, 11) stops before 11.']],
    [q('range(3) produces...', ['1, 2, 3', '0, 1, 2', '0, 1, 2, 3', '3'], 1, 'Counts from 0 to n−1.'),
     q('A while loop with a condition that never becomes False...', ['Ends immediately', 'Runs forever', 'Raises a syntax error', 'Runs once'], 1, 'That is an infinite loop.')],
    { code: ['python', 'loops.py', 'for i in range(1, 6):\n    print(i * i)\n\ncount = 3\nwhile count > 0:\n    print(count)\n    count -= 1'] },
  ),

  /* ───── Quest: Collections ───── */
  p3(
    'py3-1', 'Lists', 10,
    'An ordered, changeable collection.',
    [
      ['Working with lists', 'A list holds items in order: scores = [90, 72, 85]. Access with scores[0], add with .append(), remove with .remove() or .pop(), and loop over it with for. Lists are mutable: you can change them in place.'],
      ['Handy operations', 'len(), sum(), min(), max(), sorted() and slicing (scores[1:]) cover most daily needs.'],
    ],
    'A numbered shopping list where you can add, cross out and reorder items.',
    ['Mutable', 'append / pop', 'Slicing', 'Iterating'],
    ['Compute the average of a list of scores.', ['Create the list.', 'Use sum() and len().'], ['Average = sum ÷ count.']],
    [q('scores.append(5) does what?', ['Removes 5', 'Adds 5 at the end', 'Sorts the list', 'Creates a copy'], 1, 'append adds to the end.'),
     q('len([4, 5, 6]) is...', ['2', '3', '4', '15'], 1, 'Three items.')],
    { code: ['python', 'lists.py', 'scores = [90, 72, 85]\nscores.append(100)\nprint(sum(scores) / len(scores))\nprint(sorted(scores, reverse=True))'] },
  ),
  p3(
    'py3-2', 'Tuples and Sets', 9,
    'Fixed sequences and unique collections.',
    [
      ['Tuples', 'A tuple is like a list that cannot change: point = (3, 4). Use tuples for data that belongs together and should stay constant, and unpack them with x, y = point.'],
      ['Sets', 'A set stores unique items with no order: {1, 2, 3}. Adding a duplicate does nothing. Sets support union (|), intersection (&) and fast membership tests with in.'],
    ],
    'A tuple is a sealed envelope; a set is a guest list with no duplicates.',
    ['Immutability', 'Unpacking', 'Uniqueness', 'Set math'],
    ['Remove duplicates from [1, 2, 2, 3, 3, 3].', ['Convert the list to a set.', 'Convert back to a list.'], ['set([...]) discards repeats.']],
    [q('Tuples are...', ['Mutable', 'Immutable', 'Unordered', 'Always empty'], 1, 'They cannot be changed after creation.'),
     q('len({1, 1, 2}) is...', ['3', '2', '1', '0'], 1, 'Duplicates collapse.')],
    { code: ['python', 'tuples_sets.py', 'point = (3, 4)\nx, y = point\nprint(x + y)\n\ntags = {"python", "code", "python"}\nprint(len(tags))  # 2'] },
  ),
  p3(
    'py3-3', 'Dictionaries', 10,
    'Look things up by key.',
    [
      ['Key–value pairs', 'A dict maps keys to values: user = {"name": "Nour", "xp": 120}. Read with user["name"] or the safer user.get("level", 1). Assign to add or change a key.'],
      ['Looping', 'for key, value in user.items() visits every pair. Dictionaries are the backbone of JSON-like data, counting and lookups, which they do in constant time.'],
    ],
    'A real dictionary: you jump straight to the word (key) instead of reading every page.',
    ['Keys and values', '.get()', '.items()', 'Counting with dicts'],
    ['Count how often each letter appears in "banana".', ['Create an empty dict.', 'Loop over the letters.', 'Increase the count with .get(letter, 0) + 1.'], ['counts[ch] = counts.get(ch, 0) + 1.']],
    [q('How do you read a value safely with a default?', ['d.get(key, default)', 'd[key, default]', 'd.read(key)', 'd(key)'], 0, '.get never raises KeyError.'),
     q('Dictionary keys must be...', ['Unique', 'Numbers only', 'Lists', 'Sorted'], 0, 'Each key appears once.')],
    { code: ['python', 'dicts.py', 'counts = {}\nfor ch in "banana":\n    counts[ch] = counts.get(ch, 0) + 1\nprint(counts)  # {\'b\': 1, \'a\': 3, \'n\': 2}'] },
  ),

  boss(
    'py-boss', 'Boss Challenge: The Grade Book', 12,
    'Combine variables, conditions, loops and collections.',
    [['The rules', 'Three questions that mix everything from World 02 so far.']],
    'A boss is a project in disguise: small pieces you already know, combined under pressure.',
    ['Loops + lists', 'Dictionaries', 'Conditions'],
    ['Plan (on paper) a grade book that stores names and scores and prints the best student.', ['Choose a data structure.', 'Describe the loop that finds the maximum.'], ['A dict of name → score is a natural fit.']],
    [q('Which structure best maps student names to scores?', ['List', 'Tuple', 'Dictionary', 'String'], 2, 'Key–value lookup.'),
     q('What does sum([2, 4, 6]) / len([2, 4, 6]) return?', ['12', '4.0', '6', '3'], 1, '12 / 3 = 4.0 (true division gives a float).'),
     q('Which keyword exits a loop early?', ['stop', 'exit', 'break', 'return loop'], 2, 'break leaves the loop immediately.')],
    { boss: true },
  ),
]
