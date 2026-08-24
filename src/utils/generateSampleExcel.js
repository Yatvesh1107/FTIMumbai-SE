const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const sampleQuestions = [
  {
    'Topic': 'HTML5 & Semantics',
    'Question': 'Which HTML5 element is used to specify a header for a document or section?',
    'Option A': '<top>',
    'Option B': '<header>',
    'Option C': '<head>',
    'Option D': '<section-head>',
    'Correct Answer': 'B',
    'Marks': 1,
    'Explanation': '<header> represents introductory content or a set of navigational links in HTML5.'
  },
  {
    'Topic': 'CSS Flexbox & Layout',
    'Question': 'In CSS Flexbox, which property is used to align items along the main axis?',
    'Option A': 'align-items',
    'Option B': 'align-content',
    'Option C': 'justify-content',
    'Option D': 'flex-direction',
    'Correct Answer': 'C',
    'Marks': 1,
    'Explanation': 'justify-content defines the alignment along the main axis.'
  },
  {
    'Topic': 'JavaScript ES6+',
    'Question': 'Which keyword declares a block-scoped variable that cannot be reassigned?',
    'Option A': 'var',
    'Option B': 'let',
    'Option C': 'const',
    'Option D': 'static',
    'Correct Answer': 'C',
    'Marks': 1,
    'Explanation': 'const creates an immutable block-scoped binding in ES6.'
  },
  {
    'Topic': 'JavaScript Asynchronous',
    'Question': 'What does a JavaScript Promise return when an operation succeeds?',
    'Option A': 'reject',
    'Option B': 'resolve',
    'Option C': 'catch',
    'Option D': 'finally',
    'Correct Answer': 'B',
    'Marks': 1,
    'Explanation': 'A Promise transitions to resolved when calling resolve().'
  },
  {
    'Topic': 'React Fundamentals',
    'Question': 'Which React Hook is used to manage mutable local state inside a functional component?',
    'Option A': 'useEffect',
    'Option B': 'useMemo',
    'Option C': 'useState',
    'Option D': 'useCallback',
    'Correct Answer': 'C',
    'Marks': 1,
    'Explanation': 'useState is the primary hook for component state in React.'
  },
  {
    'Topic': 'React Lifecycle',
    'Question': 'When does the cleanup function of a useEffect hook execute?',
    'Option A': 'Before the component unmounts or before re-running the effect',
    'Option B': 'Only once after initial render',
    'Option C': 'When an error occurs in the child component',
    'Option D': 'Immediately on page reload',
    'Correct Answer': 'A',
    'Marks': 1,
    'Explanation': 'Cleanup runs before the component unmounts or before applying the next effect.'
  },
  {
    'Topic': 'Node.js & Express',
    'Question': 'In Express.js, what does the next() function do inside middleware?',
    'Option A': 'Terminates the HTTP request',
    'Option B': 'Passes control to the next middleware function in the stack',
    'Option C': 'Restarts the Node.js server',
    'Option D': 'Sends a JSON response to the client',
    'Correct Answer': 'B',
    'Marks': 1,
    'Explanation': 'next() yields execution to the next middleware handler in the pipeline.'
  },
  {
    'Topic': 'MongoDB & Mongoose',
    'Question': 'Which MongoDB operator is used to perform a partial text match or regex search?',
    'Option A': '$eq',
    'Option B': '$in',
    'Option C': '$regex',
    'Option D': '$exists',
    'Correct Answer': 'C',
    'Marks': 1,
    'Explanation': '$regex provides regular expression capabilities for pattern matching in MongoDB.'
  },
  {
    'Topic': 'REST API Architecture',
    'Question': 'Which HTTP status code signifies that a resource was successfully created?',
    'Option A': '200 OK',
    'Option B': '201 Created',
    'Option C': '204 No Content',
    'Option D': '301 Moved Permanently',
    'Correct Answer': 'B',
    'Marks': 1,
    'Explanation': '201 Created indicates the request has succeeded and led to resource creation.'
  },
  {
    'Topic': 'Web Security',
    'Question': 'What is JSON Web Token (JWT) primarily used for in modern web apps?',
    'Option A': 'Compressing video streams',
    'Option B': 'Database schema migration',
    'Option C': 'Stateless user authentication and authorization',
    'Option D': 'Formatting CSS styles',
    'Correct Answer': 'C',
    'Marks': 1,
    'Explanation': 'JWT is an open standard (RFC 7519) for transmitting secure claims for authentication.'
  }
];

const ws = XLSX.utils.json_to_sheet(sampleQuestions);

ws['!cols'] = [
  { wch: 25 },
  { wch: 70 },
  { wch: 30 },
  { wch: 30 },
  { wch: 30 },
  { wch: 30 },
  { wch: 15 },
  { wch: 10 },
  { wch: 70 }
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'QuestionBank');

const targetPath1 = path.join(__dirname, '..', '..', '..', 'sample_question_bank_10_mcqs.xlsx');
const publicDir = path.join(__dirname, '..', '..', '..', 'FTIMumbai', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const targetPath2 = path.join(publicDir, 'sample_question_bank.xlsx');

XLSX.writeFile(wb, targetPath1);
XLSX.writeFile(wb, targetPath2);

console.log('Successfully generated sample question bank Excel at:');
console.log('1.', targetPath1);
console.log('2.', targetPath2);
