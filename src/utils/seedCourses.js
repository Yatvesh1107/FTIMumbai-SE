require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const CourseCategory = require('../models/CourseCategory');
const Course = require('../models/Course');

// Bootstraps the public course catalog (previously a static frontend fallback)
// into the backend, assigned to the seeded course categories. Card images are copied from
// the frontend assets into /uploads/courses. After this, ALL course & category data
// on the website comes from this API + admin panel.
//
// Seeds description + syllabus (wywl / skills / content modules) so every seeded
// course has a complete public detail page out of the box. Edit any of it later in
// the admin panel (Courses & Pricing Matrix → step 2).
//
// Idempotent: upserts by unique Course.name. Never overwrites fees, codes, or
// descriptions that an admin may already have set (those fields only fill on create).
// Syllabus fields only fill when currently empty, so re-running never wipes admin edits.
const feAssetsRoot = process.env.FTI_FRONTEND_DIR || path.join(__dirname, '..', '..', '..', 'FTIMumbai');
const coursesImgDir = path.join(__dirname, '..', '..', 'uploads', 'courses');
const cardAssetsDir = path.join(feAssetsRoot, 'src', 'assets', 'courses', 'card');

const courseDefs = [
  // Code & Data Careers
  {
    categorySlug: 'code-data-careers', name: 'Full Stack Web Development', category: 'Full Stack Web Development',
    duration: '6 Months', mode: 'Online + Classroom', image: 'full-stack-web-development.jpg', orderInCategory: 1,
    standardFee: 35000, minFloorFee: 26000,
    description: 'Become a job-ready full stack developer by building and deploying real, production-style web applications from scratch using the modern JavaScript ecosystem.',
    wywl: [
      'Build complete, responsive web applications from scratch using HTML5, CSS3 and JavaScript',
      'Develop dynamic server-side applications and REST APIs with Node.js and Express',
      'Manage relational and NoSQL data using MongoDB and SQL databases',
      'Implement secure authentication, authorisation and role-based access control',
      'Write clean, reusable front-end interfaces using React with modern hooks and component patterns',
      'Deploy, version-control and monitor applications using Git, GitHub and cloud hosting',
    ],
    skills: ['HTML5', 'CSS3', 'JavaScript (ES6+)', 'React', 'Node.js', 'Express', 'MongoDB', 'Git & GitHub', 'REST APIs', 'Responsive UI'],
    content: [
      { heading: 'HTML5, CSS3 & Responsive Design', topics: ['Semantic HTML structure and accessibility', 'Flexbox, Grid and modern layout systems', 'Responsive design and mobile-first approach', 'Animations, transitions and CSS variables'] },
      { heading: 'JavaScript Fundamentals', topics: ['Variables, data types and control flow', 'Functions, scope and closures', 'Arrays, objects and destructuring', 'DOM manipulation and event handling', 'ES6+ features: modules, promises and async/await', 'Debugging with browser developer tools'] },
      { heading: 'Version Control with Git & GitHub', topics: ['Repositories, commits and branches', 'Merge, rebase and resolving conflicts', 'Pull requests and code review workflow', 'Hosting projects and portfolio setup'] },
      { heading: 'Front-End Development with React', topics: ['Components, props and state', 'Hooks: useState, useEffect and useContext', 'Routing with React Router', 'Forms, validation and API integration', 'Building reusable UI component libraries'] },
      { heading: 'Back-End Development with Node.js & Express', topics: ['Server setup and routing', 'REST API design and CRUD operations', 'Middleware and error handling', 'File upload and authentication with JWT'] },
      { heading: 'Databases', topics: ['MongoDB with Mongoose modelling', 'SQL fundamentals and relational design', 'CRUD operations and query optimisation', 'Data validation and relationships'] },
      { heading: 'Deployment & DevOps Basics', topics: ['Git-based deployment workflows', 'Hosting on cloud platforms', 'Environment variables and configuration', 'Domain setup, HTTPS and performance basics'] },
      { heading: 'Capstone Projects', topics: ['Full-stack e-commerce application', 'Student management portal with role-based access', 'Live project deployment and documentation', 'Portfolio and resume preparation'] },
    ],
  },
  {
    categorySlug: 'code-data-careers', name: 'Python, Data Science & Machine Learning', category: 'Data Science',
    duration: '6 Months', mode: 'Online + Classroom', image: 'python-data-science-ml.jpg', orderInCategory: 2,
    standardFee: 35000, minFloorFee: 26000,
    description: 'Master Python programming, data analysis and applied machine learning, then work on industry datasets to build models that solve real business problems.',
    wywl: [
      'Write efficient Python code for data loading, cleaning, transformation and analysis',
      'Analyse and visualise data using pandas, NumPy and Matplotlib/Seaborn',
      'Build and evaluate supervised machine learning models with scikit-learn',
      'Apply feature engineering, model tuning and cross-validation techniques',
      'Work with real datasets to extract business insights and present findings clearly',
      'Understand the foundations of deep learning and neural networks',
    ],
    skills: ['Python', 'pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'scikit-learn', 'Statistics', 'Data Cleaning', 'Machine Learning', 'Data Visualisation'],
    content: [
      { heading: 'Python Programming Foundations', topics: ['Variables, data types and operators', 'Control flow, loops and functions', 'Lists, tuples, dictionaries and sets', 'File handling and exception handling', 'Object-oriented programming essentials', 'Working with modules and virtual environments'] },
      { heading: 'Data Handling with Pandas & NumPy', topics: ['Importing CSV, Excel and JSON data', 'DataFrames: selection, filtering and indexing', 'Handling missing values and duplicates', 'Grouping, aggregation and pivot tables', 'Merging and joining datasets', 'NumPy arrays and vectorised computation'] },
      { heading: 'Data Visualisation', topics: ['Matplotlib chart fundamentals', 'Seaborn for statistical plots', 'Choosing the right chart for the question', 'Customising plots for reports and presentations', 'Interactive dashboards basics'] },
      { heading: 'Statistics for Data Science', topics: ['Descriptive statistics and distributions', 'Probability fundamentals', 'Correlation, regression and hypothesis testing', 'Sampling and confidence intervals', 'A/B testing concepts'] },
      { heading: 'Machine Learning Fundamentals', topics: ['Supervised vs unsupervised learning', 'Linear and logistic regression', 'Decision trees and Random Forests', 'K-Nearest Neighbours and Naive Bayes', 'K-Means clustering', 'Support Vector Machines'] },
      { heading: 'Model Evaluation & Feature Engineering', topics: ['Train-test splitting and cross-validation', 'Accuracy, precision, recall and F1 score', 'ROC-AUC and confusion matrix', 'Feature scaling and encoding', 'Hyperparameter tuning with Grid Search'] },
      { heading: 'Applied Projects', topics: ['Exploratory Data Analysis on real datasets', 'End-to-end prediction model building', 'Model deployment fundamentals', 'Presenting insights to non-technical stakeholders'] },
    ],
  },
  {
    categorySlug: 'code-data-careers', name: 'Data Analytics', category: 'Data Analytics',
    duration: '3 Months', mode: 'Online + Classroom', image: 'data-analytics.jpg', orderInCategory: 3,
    standardFee: 22000, minFloorFee: 16000,
    description: 'A fast, practical analytics track covering Excel, SQL and BI tools to turn raw business data into clear dashboards and decision-ready reports.',
    wywl: [
      'Build and analyse complex datasets using advanced Excel functions and pivots',
      'Query relational databases confidently with SQL',
      'Create interactive dashboards and visual reports using Power BI / Tableau',
      'Clean and validate data to ensure reporting accuracy',
      'Translate business questions into metrics, KPIs and data requirements',
      'Present data-driven recommendations to stakeholders with clarity',
    ],
    skills: ['Advanced Excel', 'SQL', 'Power BI', 'Tableau', 'Data Cleaning', 'DAX', 'KPI Reporting', 'Data Storytelling'],
    content: [
      { heading: 'Excel for Analytics', topics: ['Advanced formulas: VLOOKUP, INDEX-MATCH, IFS', 'Pivot tables and pivot analysis', 'Conditional formatting and data validation', 'What-if analysis and scenario modelling', 'Automating reports with macros basics'] },
      { heading: 'SQL for Data Analysis', topics: ['SELECT, WHERE, GROUP BY and ORDER BY', 'Joins: INNER, LEFT, RIGHT and FULL', 'Subqueries and CTEs', 'Window functions: ROW_NUMBER, RANK and LAG', 'Aggregations and HAVING clauses', 'Query optimisation basics'] },
      { heading: 'Data Preparation', topics: ['Data cleaning and deduplication', 'Handling missing and inconsistent values', 'Data validation rules', 'Connecting and refreshing data sources'] },
      { heading: 'Business Intelligence Tools', topics: ['Power BI: data modelling and relationships', 'Creating measures with DAX', 'Interactive reports and drill-downs', 'Tableau fundamentals and dashboards', 'Publishing and sharing reports'] },
      { heading: 'Analytics & Storytelling', topics: ['Defining KPIs and business metrics', 'Analytical frameworks and structured thinking', 'Interpreting data insights correctly', 'Presenting to stakeholders with impact', 'Common analytics pitfalls to avoid'] },
      { heading: 'Capstone Project', topics: ['End-to-end analysis of a business dataset', 'Building a KPI dashboard', 'Documenting findings and recommendations', 'Presenting the project'] },
    ],
  },
  {
    categorySlug: 'code-data-careers', name: 'Software Testing', category: 'Software Testing',
    duration: '3 Months', mode: 'Online + Classroom', image: 'software-testing.jpg', orderInCategory: 4,
    standardFee: 20000, minFloorFee: 15000,
    description: 'Enter the fastest-growing QA career track with manual testing fundamentals, Automation Testing, API testing and interview-focused preparation.',
    wywl: [
      'Write structured test cases, bug reports and test plans using industry-standard practices',
      'Perform manual, functional, regression and usability testing on web and mobile applications',
      'Automate repetitive testing using Selenium and Java / Python',
      'Test REST APIs using Postman and validate responses with assertion frameworks',
      'Work with Agile/Scrum ceremonies and understand the SDLC and STLC',
      'Prepare for QA interviews with real-world scenarios and resume projects',
    ],
    skills: ['Manual Testing', 'Selenium Automation', 'Java', 'Python', 'Postman', 'API Testing', 'JIRA', 'Agile & Scrum', 'Test Planning', 'Bug Reporting'],
    content: [
      { heading: 'Software Testing Fundamentals', topics: ['SDLC and STLC overview', 'Levels of testing: unit, integration, system, acceptance', 'Black box, white box and grey box testing', 'Test case design techniques: BVA and equivalence partitioning', 'Writing effective test cases and test plans'] },
      { heading: 'Bug Reporting & Defect Management', topics: ['Anatomy of a good bug report', 'Severity vs priority classification', 'Bug lifecycle and tracking in JIRA', 'Reproduction steps and evidence collection', 'Re-test and regression practices'] },
      { heading: 'Functional & Manual Testing', topics: ['Web application testing', 'Mobile application testing', 'Cross-browser and cross-device testing', 'Usability and accessibility testing', 'Regression and smoke testing'] },
      { heading: 'Database Testing & SQL for QA', topics: ['Verifying data integrity with SQL queries', 'Writing test queries for joins and aggregations', 'Backend validation through database checks'] },
      { heading: 'API Testing', topics: ['Understanding REST architecture and HTTP methods', 'Writing Postman collections and requests', 'Status codes, headers and response bodies', 'Assertions and schema validation', 'Basic API automation with Newman'] },
      { heading: 'Automation Testing with Selenium', topics: ['Selenium WebDriver setup and architecture', 'Locators and selectors best practices', 'Writing maintainable test scripts in Java / Python', 'Data-driven testing with parameterisation', 'Integrating with CI pipelines'] },
      { heading: 'Agile, Process & Interview Prep', topics: ['Agile methodology and Scrum ceremonies', 'QA in the SDLC: entry and exit criteria', 'Test case challenges and interview questions', 'Resume, portfolio and mock interview practice'] },
    ],
  },
  {
    categorySlug: 'code-data-careers', name: 'Mobile App Development', category: 'Mobile App Development',
    duration: '4 Months', mode: 'Online + Classroom', image: 'mobile-app-development.jpg', orderInCategory: 5,
    standardFee: 28000, minFloorFee: 20000,
    description: 'Build production-ready Android and cross-platform mobile applications with Kotlin, Flutter and React Native, including backend integration and app store deployment.',
    wywl: [
      'Develop native Android applications using Kotlin and Android Studio',
      'Build cross-platform apps for Android and iOS using Flutter',
      'Design responsive mobile interfaces following platform design guidelines',
      'Integrate mobile apps with RESTful backend APIs and local databases',
      'Handle authentication, offline storage and error states in a production-grade way',
      'Publish applications to the Google Play Store with testing and release management',
    ],
    skills: ['Kotlin', 'Android Studio', 'Flutter', 'React Native', 'REST API Integration', 'Firebase', 'App Store Deployment', 'UI/UX for Mobile'],
    content: [
      { heading: 'Mobile Development Fundamentals', topics: ['Mobile architecture: MVC, MVVM and MVC', 'App lifecycle and component behaviour', 'Design principles and platform conventions', 'Setting up the development environment'] },
      { heading: 'Kotlin & Android Core', topics: ['Kotlin syntax and coroutines basics', 'Activities, Fragments and navigation', 'Layouts, RecyclerView and RecyclerView adapters', 'Permissions and device features', 'Reading data from REST APIs'] },
      { heading: 'Flutter Development', topics: ['Dart language fundamentals', 'Widgets, StatelessWidget and StatefulWidget', 'State management patterns', 'Navigation and routing', 'Third-party packages and plugins', 'Networking and JSON parsing'] },
      { heading: 'React Native', topics: ['Components, props and state', 'Navigation with React Navigation', 'API calls with Axios/Fetch', 'Styling and platform-specific UI', 'Native module integration basics'] },
      { heading: 'Backend Integration & Storage', topics: ['REST API integration and error handling', 'Local storage: SharedPreferences and SQLite', 'Firebase Authentication and Firestore', 'Push notifications basics', 'Caching strategies'] },
      { heading: 'UI/UX and Testing', topics: ['Mobile UI design principles', 'Accessibility and responsive layouts', 'Unit and widget testing basics', 'Debugging and profiling apps'] },
      { heading: 'Publishing & Capstone Project', topics: ['Preparing release builds and signing', 'Play Store submission and review process', 'Versioning and staged rollouts', 'Building and publishing a complete portfolio app'] },
    ],
  },

  // Enterprise Tech
  {
    categorySlug: 'enterprise-tech', name: 'Cybersecurity', category: 'Cyber Security',
    duration: '3 Months', mode: 'Online + Classroom', image: 'cybersecurity.jpg', orderInCategory: 1,
    standardFee: 24000, minFloorFee: 18000,
    description: 'Learn offensive and defensive security fundamentals — network attacks, ethical hacking, vulnerability assessment and security operations to protect modern enterprises.',
    wywl: [
      'Understand core security concepts: CIA triad, threats, vulnerabilities and controls',
      'Perform network reconnaissance using Nmap and Wireshark',
      'Conduct vulnerability scanning and exploitation testing ethically',
      'Apply OWASP Top 10 to secure web applications',
      'Handle incident detection, logging and basic forensic analysis',
      'Prepare for industry certifications and security analyst interviews',
    ],
    skills: ['Network Security', 'Ethical Hacking', 'Nmap', 'Wireshark', 'Vulnerability Assessment', 'OWASP Top 10', 'Penetration Testing', 'SIEM Basics', 'Incident Response'],
    content: [
      { heading: 'Security Fundamentals', topics: ['CIA triad and security principles', 'Types of attacks: active vs passive', 'Threats, vulnerabilities and risk management', 'Security policies, standards and compliance basics', 'Zero trust concepts'] },
      { heading: 'Networking for Security', topics: ['OSI and TCP/IP model', 'IP addressing, subnetting and DNS', 'Firewalls, proxies and VPNs', 'Protocols: HTTP/HTTPS, SSH, FTP and SMTP', 'Packet analysis with Wireshark'] },
      { heading: 'Linux & Windows Security', topics: ['Linux CLI for security professionals', 'User accounts, permissions and sudo', 'Process and service management', 'Windows Defender and Event Viewer', 'Hardening techniques'] },
      { heading: 'Network Attacks & Reconnaissance', topics: ['Scanning with Nmap and Nikto', 'DNS enumeration and OSINT basics', 'Password attacks and brute-force prevention', 'Man-in-the-middle concepts', 'Attack surface assessment'] },
      { heading: 'Web Application Security', topics: ['OWASP Top 10 in depth', 'SQL injection and XSS prevention', 'CSRF, SSRF and insecure configurations', 'Secure authentication and session management', 'Using Burp Suite for testing'] },
      { heading: 'Vulnerability Assessment & Penetration Testing', topics: ['Vulnerability scanning with Nessus/Burp', 'Exploit basics and proof-of-concept attacks', 'Reporting vulnerabilities responsibly', 'Ethical hacking code of conduct and scope'] },
      { heading: 'Security Operations & Incident Response', topics: ['Security monitoring and SIEM basics', 'Log analysis and detection rules', 'Incident response lifecycle', 'Digital forensics fundamentals', 'Preparing for security certifications'] },
    ],
  },
  {
    categorySlug: 'enterprise-tech', name: 'Applied AI & Business Analytics', category: 'Data Science',
    duration: '1.5–3 Months', mode: 'Online + Classroom', image: 'applied-ai-business-analytics.jpg', orderInCategory: 2,
    standardFee: 30000, minFloorFee: 22000,
    description: 'Bridge the gap between AI capability and business value by applying Generative AI, prompt engineering and analytics frameworks to real organisational problems.',
    wywl: [
      'Understand core AI and machine learning concepts without heavy mathematics',
      'Apply Generative AI and prompt engineering to real business workflows',
      'Build practical AI solutions using no-code and low-code tools',
      'Analyse business data to identify opportunities and quantify impact',
      'Evaluate AI output for accuracy, bias and reliability',
      'Design and present an AI adoption roadmap for an organisation',
    ],
    skills: ['Artificial Intelligence', 'Generative AI', 'Prompt Engineering', 'Business Analytics', 'AI Workflow Design', 'Data-Driven Decision Making', 'AI Ethics', 'Stakeholder Communication'],
    content: [
      { heading: 'AI Foundations for Business', topics: ['Narrow vs general AI concepts', 'Machine learning vs deep learning', 'How LLMs and Generative AI work', 'AI in business: use cases and value', 'Building an AI-ready mindset'] },
      { heading: 'Generative AI & Prompt Engineering', topics: ['How generative models produce output', 'Prompt structure: role, context, task, format', 'Zero-shot vs few-shot prompting', 'Iterative prompt refinement techniques', 'Handling hallucinations and fact-checking', 'Responsible AI usage and data privacy'] },
      { heading: 'Applied AI Tools & Workflows', topics: ['AI assistants for content and research', 'AI for document summarisation and extraction', 'AI-assisted coding and debugging', 'Building AI workflows with no-code tools', 'Evaluating and comparing AI tools'] },
      { heading: 'Business Analytics Integration', topics: ['Framing business problems for analysis', 'KPI frameworks and measurement', 'Data sources and readiness assessment', 'Quantifying ROI of AI initiatives', 'Process mapping and automation opportunities'] },
      { heading: 'AI Ethics, Risk & Governance', topics: ['Bias, fairness and explainability', 'Data privacy and compliance considerations', 'AI risk assessment', 'Human-in-the-loop design', 'Governance policies for AI adoption'] },
      { heading: 'Capstone: AI Adoption Blueprint', topics: ['Selecting a high-impact use case', 'Building and testing a prototype workflow', 'Measuring results and impact', 'Presenting an AI roadmap to leadership'] },
    ],
  },
  {
    categorySlug: 'enterprise-tech', name: 'Internet of Things (IoT)', category: 'DevOps',
    duration: '3 Months', mode: 'Online + Classroom', image: 'internet-of-things.jpg', orderInCategory: 3,
    standardFee: 25000, minFloorFee: 18000,
    description: 'Design and build connected devices and sensor systems using Arduino, Raspberry Pi, MQTT and cloud dashboards, then connect them to real-world automation projects.',
    wywl: [
      'Understand IoT architecture: sensors, connectivity, cloud and analytics layers',
      'Program microcontrollers such as Arduino and ESP8266/ESP32',
      'Build sensor-based projects that collect and process real-world data',
      'Connect devices to the cloud using MQTT and REST APIs',
      'Visualise live device data on dashboards and trigger automated actions',
      'Understand IoT security fundamentals and device authentication',
    ],
    skills: ['Arduino', 'Raspberry Pi', 'ESP32/ESP8266', 'C/C++ Embedded', 'MQTT', 'Cloud IoT Platforms', 'Sensors & Actuators', 'Dashboard Visualisation', 'Embedded Networking'],
    content: [
      { heading: 'IoT Fundamentals & Architecture', topics: ['What is IoT and why it matters', 'IoT architecture layers and reference models', 'Sensors, actuators and embedded boards', 'Connectivity options: Wi-Fi, Bluetooth, LoRa, Zigbee', 'Data flow from device to cloud'] },
      { heading: 'Microcontrollers & Embedded Programming', topics: ['Arduino board overview and IDE', 'Digital and analog I/O, PWM basics', 'Common sensors: DHT, IR, ultrasonic, PIR', 'Actuators: relays, servos and motors', 'Reading sensor data reliably'] },
      { heading: 'Networking & Connectivity', topics: ['Wi-Fi and network configuration', 'MQTT protocol: publish/subscribe model', 'Setting up MQTT broker', 'HTTP/REST for device data', 'Device addressing and authentication'] },
      { heading: 'Raspberry Pi & Linux for IoT', topics: ['Raspberry Pi setup and OS basics', 'Python for IoT scripting', 'GPIO control and camera modules', 'Running services on Pi', 'SD card and remote access'] },
      { heading: 'Cloud IoT & Dashboards', topics: ['Cloud IoT platforms overview', 'Device provisioning and twin concepts', 'Storing and visualising time-series data', 'Live dashboards with charts and gauges', 'Alerts and automated actions'] },
      { heading: 'IoT Security', topics: ['Device authentication and encryption', 'Secure boot and firmware updates', 'Network segmentation for IoT', 'Common IoT attack vectors', 'Best practices for secure deployments'] },
      { heading: 'Capstone IoT Projects', topics: ['Smart home automation system', 'Industrial sensor monitoring dashboard', 'Weather/environment monitoring station', 'Documenting and presenting the project'] },
    ],
  },
  {
    categorySlug: 'enterprise-tech', name: 'SAP Career Track', category: 'Full Stack Web Development',
    duration: '3 Months', mode: 'Online + Classroom', image: 'sap-career-track.jpg', orderInCategory: 4,
    standardFee: 32000, minFloorFee: 24000,
    description: 'Get trained on SAP functional areas with live system practice, configuration basics and end-to-end project exposure aligned to entry-level SAP consultant roles.',
    wywl: [
      'Understand SAP business processes across modules such as MM, SD, FI and HCM',
      'Navigate the SAP GUI / SAP Fiori interface confidently',
      'Perform end-to-end transactions: Purchase to Pay and Order to Cash',
      'Apply basic configuration concepts and organisational structure understanding',
      'Gain practical experience through guided live-system exercises',
      'Prepare for SAP certification and entry-level consultant interviews',
    ],
    skills: ['SAP Fundamentals', 'SAP GUI', 'SAP MM', 'SAP SD', 'SAP FI', 'SAP HCM', 'Business Process Mapping', 'SAP Fiori', 'Enterprise Systems'],
    content: [
      { heading: 'SAP Fundamentals & Landscape', topics: ['What is SAP and why enterprises use it', 'ERP concepts and business processes', 'SAP client/server architecture', 'GUI, Fiori and navigation basics', 'Transaction codes and SAP Help', 'Organisational structure in SAP'] },
      { heading: 'Core Financial Accounting (FI/CO)', topics: ['General Ledger and chart of accounts', 'Document types, posting keys and journal entries', 'Cost centres and profit centres', 'Basic cost centre accounting', 'Reporting and balance sheet basics'] },
      { heading: 'Materials Management (MM)', topics: ['Purchase Requisition and Purchase Order', 'Goods Receipt and Invoice Verification (3-way match)', 'Inventory management and stock overview', 'Vendor master and material master', 'Purchase to Pay end-to-end flow'] },
      { heading: 'Sales & Distribution (SD)', topics: ['Sales Order and Delivery', 'Billing and Invoicing', 'Order to Cash end-to-end flow', 'Pricing conditions basics', 'Output determination'] },
      { heading: 'HCM & Reporting', topics: ['Employee master data basics', 'Organisational structure and positions', 'Time and attendance concepts', 'Basic SAP queries and reporting', 'Fiori apps for approvals and dashboards'] },
      { heading: 'Project, Practice & Preparation', topics: ['Guided live-system exercises', 'Mini end-to-end project', 'Common configuration terminology', 'Certification exam preparation strategy', 'Resume and interview practice for SAP roles'] },
    ],
  },
  {
    categorySlug: 'enterprise-tech', name: 'SAP Fast-Track', category: 'Data Analytics',
    duration: '1.5 Months', mode: 'Online + Classroom', image: 'sap-fast-track.jpg', orderInCategory: 5,
    standardFee: 18000, minFloorFee: 13000,
    description: 'A condensed, intensive SAP orientation for busy professionals and freshers who need working knowledge of SAP processes and navigation quickly.',
    wywl: [
      'Navigate the SAP system and find the right transaction for common tasks',
      'Understand the core business processes SAP supports end to end',
      'Explain the difference between key SAP modules in simple terms',
      'Read and create standard SAP reports and documents',
      'Prepare confidently for SAP-focused interview rounds',
    ],
    skills: ['SAP Navigation', 'SAP Transaction Codes', 'Business Processes', 'SAP Reporting', 'Module Overview', 'Interview Preparation'],
    content: [
      { heading: 'SAP Orientation', topics: ['SAP ecosystem and terminology', 'GUI vs Fiori interfaces', 'System navigation and transaction codes', 'Client and user basics'] },
      { heading: 'Core Processes', topics: ['Purchase to Pay overview', 'Order to Cash overview', 'Record to Report overview', 'Integration points between modules'] },
      { heading: 'Module Touchpoints', topics: ['FI and MM: financial documents', 'SD and delivery cycle', 'HCM and organisational data', 'Choosing the right module for the business need'] },
      { heading: 'Reporting & Documentation', topics: ['Standard SAP report usage', 'Basic query concepts', 'Documenting process flows', 'Common user support scenarios'] },
      { heading: 'Interview Sprint', topics: ['Common SAP interview questions', 'Explaining your SAP learning journey', 'Resume tips for SAP entry roles', 'Mock interview practice'] },
    ],
  },

  // Deep Tech
  {
    categorySlug: 'deep-tech', name: 'Semiconductor Awareness Workshop', category: 'Data Science',
    duration: '1 Day', mode: 'Free · Live Demo', image: 'semiconductor-workshop.jpg', orderInCategory: 1,
    standardFee: 0, minFloorFee: 0,
    description: 'A free, one-day industry workshop that demystifies the semiconductor value chain — chip design, fabrication and packaging — through live demos and leader insights.',
    wywl: [
      'Understand what a semiconductor is and how a chip is designed',
      'Follow the full value chain from wafer fabrication to packaging and testing',
      'See a live demonstration of how semiconductor processes work',
      'Learn about India\'s semiconductor mission and career opportunities',
      'Understand the skills the semiconductor industry is hiring for',
      'Network with industry leaders and fellow participants',
    ],
    skills: ['Semiconductor Fundamentals', 'Chip Design', 'VLSI Overview', 'Fabrication Processes', 'Industry Awareness', 'Career Insights'],
    content: [
      { heading: 'Industry Overview', topics: ['What is the semiconductor industry and why it matters', 'Global and India semiconductor landscape', 'Key players across design, fabs and OSAT', 'Government initiatives and investment'] },
      { heading: 'Chip Design Basics', topics: ['From idea to tape-out', 'Digital and analog design fundamentals', 'EDA tools and the design flow', 'Verification and sign-off concepts'] },
      { heading: 'Fabrication & Packaging', topics: ['Wafer fabrication process steps', 'Photolithography and patterning', 'Packaging types and testing', 'Yield and cost considerations'] },
      { heading: 'Live Demonstrations', topics: ['Live chip teardown', 'Live demo of common processes', 'Q&A with industry practitioners', 'Reference resources and further learning'] },
    ],
  },
  {
    categorySlug: 'deep-tech', name: 'Industry Certification Course', category: 'DevOps',
    duration: '30 Hours', mode: 'Online + Classroom', image: 'industry-certification.jpg', orderInCategory: 2,
    standardFee: 15000, minFloorFee: 10000,
    description: 'Get certification-ready across the most in-demand IT skills with structured, exam-focused preparation modules and practice tests.',
    wywl: [
      'Choose and prepare for high-demand IT certifications',
      'Understand exam objectives and question formats',
      'Practice with timed mock exams and analyse results',
      'Build a study plan that fits a working schedule',
      'Validate your skills with a recognised certificate',
    ],
    skills: ['Certification Prep', 'Exam Strategy', 'IT Fundamentals', 'Networking Basics', 'Security Fundamentals', 'Cloud Basics'],
    content: [
      { heading: 'Certification Pathways', topics: ['Overview of in-demand certifications', 'Choosing the right certification for your career path', 'Exam eligibility and registration process', 'Cost, validity and renewal planning'] },
      { heading: 'Core Knowledge Modules', topics: ['IT infrastructure and networking basics', 'Operating systems and endpoint security', 'Cloud computing fundamentals', 'Data and database basics', 'Scripting and automation awareness'] },
      { heading: 'Exam Preparation', topics: ['Understanding the exam blueprint', 'Key concepts and objective mapping', 'Practical labs and hands-on exercises', 'Time management during the exam'] },
      { heading: 'Practice & Mock Tests', topics: ['Full-length practice exams', 'Reviewing mistakes and weak areas', 'Time-bound revision sprints', 'Exam-day strategy and confidence building'] },
    ],
  },
  {
    categorySlug: 'deep-tech', name: 'Skill & Project Course', category: '3D Software Architect',
    duration: '1 Month', mode: 'Classroom', image: 'skill-project-course.jpg', orderInCategory: 3,
    standardFee: 12000, minFloorFee: 8000,
    description: 'A fast, hands-on programme where you learn one job-ready skill and finish with a portfolio-grade project you can show to employers.',
    wywl: [
      'Learn a focused, job-ready skill with hands-on practice from day one',
      'Build a complete project that demonstrates real capability',
      'Get step-by-step guidance and code review on your work',
      'Create a portfolio piece with proper documentation',
      'Present your project confidently in interviews',
    ],
    skills: ['Hands-on Project Work', 'Portfolio Building', 'Problem Solving', 'Code Review', 'Project Documentation', 'Presentation Skills'],
    content: [
      { heading: 'Skill Selection & Foundations', topics: ['Choosing a high-demand skill path', 'Tooling and environment setup', 'Fundamentals refresher for the chosen skill', 'Guided practice exercises'] },
      { heading: 'Project Kickoff & Planning', topics: ['Defining project scope and requirements', 'Breaking work into milestones', 'Setting up version control and structure', 'Building the core feature set'] },
      { heading: 'Build, Test & Refine', topics: ['Implementing core features', 'Testing and debugging your build', 'Code review and best practices', 'Polishing the user experience'] },
      { heading: 'Portfolio & Presentation', topics: ['Documenting the project (README and demo)', 'Recording a walkthrough video', 'Writing a project summary for your resume', 'Mock presentation and feedback'] },
    ],
  },
  {
    categorySlug: 'deep-tech', name: 'Project-Based Competency Programme', category: 'Full Stack Web Development',
    duration: '3 Months', mode: 'Classroom', image: 'project-based-competency.jpg', orderInCategory: 4,
    standardFee: 20000, minFloorFee: 15000,
    description: 'Learn by building — deliver three industry-grade projects end to end with mentor guidance, code reviews and deployment, building a strong portfolio as you go.',
    wywl: [
      'Learn core concepts by immediately applying them to real projects',
      'Deliver multiple end-to-end projects with mentor code reviews',
      'Plan, estimate and track project work like a professional developer',
      'Deploy and host projects so they are live and demonstrable',
      'Build problem-solving and debugging skills through real challenges',
      'Graduate with a portfolio of 3+ live, deployed projects',
    ],
    skills: ['Project Execution', 'Full Stack Development', 'Debugging', 'Code Review', 'Deployment', 'Agile Project Workflow', 'Portfolio Building'],
    content: [
      { heading: 'Project Methodology', topics: ['Defining requirements and user stories', 'Breaking projects into sprints and tasks', 'Estimation and prioritisation', 'Agile project workflow in practice'] },
      { heading: 'Project One: Core Web Application', topics: ['Planning and data modelling', 'Building authentication and core CRUD', 'UI implementation and responsiveness', 'Testing and deployment', 'Mentor review and iteration'] },
      { heading: 'Project Two: Data-Driven Application', topics: ['Integrating external APIs', 'Working with third-party data sources', 'Advanced search, filter and reporting', 'Error handling and edge cases', 'Mentor review and iteration'] },
      { heading: 'Project Three: Capstone', topics: ['Ideation and proposal of your own project', 'Architecture and technology selection', 'Full implementation and integration', 'Deployment and documentation', 'Final demo and feedback'] },
      { heading: 'Professional Practice', topics: ['Git workflow and team collaboration', 'Code quality standards and reviews', 'Debugging under pressure', 'Portfolio presentation and resume building'] },
    ],
  },
  {
    categorySlug: 'deep-tech', name: 'Competency Building Programme', category: 'Cyber Security',
    duration: '52 Weeks', mode: 'Classroom', image: 'competency-building.jpg', orderInCategory: 5,
    standardFee: 60000, minFloorFee: 45000,
    description: 'A full-year, comprehensive programme building deep, employer-ready competency across development fundamentals, specialisation tracks and continuous mentor guidance.',
    wywl: [
      'Build a strong, structured foundation in programming and computer science concepts',
      'Progress through a year-long curriculum with weekly mentor guidance',
      'Complete multiple specialisation projects across the year',
      'Develop professional workplace skills: code review, documentation and teamwork',
      'Build consistent study habits and accountability through a full-year cohort',
      'Complete with a portfolio and a clear specialisation to talk about in interviews',
    ],
    skills: ['Deep Programming Fundamentals', 'Specialisation Track', 'Long-term Project Work', 'Mentorship', 'Professional Communication', 'Interview Mastery'],
    content: [
      { heading: 'Foundation Phase (Months 1–3)', topics: ['Programming fundamentals and problem solving', 'Data structures and algorithms basics', 'Web fundamentals: HTML, CSS, JavaScript', 'Version control and development workflow', 'Foundational mini-projects'] },
      { heading: 'Core Phase (Months 4–7)', topics: ['Full-stack application development', 'Database design and SQL/NoSQL', 'APIs, authentication and security basics', 'Testing and debugging discipline', 'Team project development'] },
      { heading: 'Specialisation Phase (Months 8–11)', topics: ['Choosing a specialisation track', 'Advanced concepts in the chosen track', 'Industry-standard tooling and workflows', 'Mentor-led code reviews', 'Capstone project development'] },
      { heading: 'Professional & Career Phase (Months 12)', topics: ['System design and architecture basics', 'Interview preparation intensive', 'Portfolio and resume finalisation', 'Mock interviews and feedback', 'Career counselling and placement support'] },
    ],
  },

  // Engineering Design & Drafting
  {
    categorySlug: 'engineering-design-drafting', name: 'Instrumentation Design & Drafting', category: '3D Software Architect',
    duration: '6 Months', mode: 'Online + Offline', image: 'instrumentation-design.jpg', orderInCategory: 1,
    standardFee: 30000, minFloorFee: 22000,
    description: 'Train as an instrumentation designer — read P&IDs, size instruments, design control loops and produce accurate instrumentation drawings and datasheets for process plants.',
    wywl: [
      'Read and interpret P&IDs, instrument index and loop diagrams',
      'Select and size instruments: pressure, temperature, flow, level and control valves',
      'Design control loops and specify instrument ranges and materials',
      'Prepare instrument datasheets, hook-ups and installation details',
      'Work confidently with AutoCAD and Excel for engineering documentation',
      'Understand process control fundamentals: PID, control loops and tuning basics',
    ],
    skills: ['P&ID Interpretation', 'Instrument Selection', 'Process Control', 'PID Loops', 'AutoCAD', 'Instrument Datasheets', 'ISA Standards', 'Loop Diagrams'],
    content: [
      { heading: 'Engineering Drawing & CAD Basics', topics: ['Drawing standards and conventions', 'Lines, symbols and dimensioning', 'Isometric and orthographic projections', 'AutoCAD 2D drafting commands', 'Layering and file management'] },
      { heading: 'Process Fundamentals', topics: ['Process flow diagrams (PFD)', 'Introduction to process equipment', 'Utilities and basic plant systems', 'Operating conditions: pressure, temperature, flow', 'P&ID symbol library and ISA conventions'] },
      { heading: 'Instrumentation Principles', topics: ['Measurement fundamentals: pressure, temperature, flow, level', 'Signal types: pneumatic, electric, digital', 'Instrument tags and numbering', 'Control loop components', 'DCS, PLC and field instrumentation overview'] },
      { heading: 'Instrument Selection & Sizing', topics: ['Pressure instruments: range, accuracy and materials', 'Temperature elements: RTD, thermocouple and thermistor', 'Flow instruments: orifice, vortex, magnetic and turbine', 'Level instruments: DP, float and ultrasonic', 'Control valves: CV, sizing and selection'] },
      { heading: 'Control Systems & PID', topics: ['Open vs closed loop control', 'P, I, D action explained', 'PID controller tuning basics', 'Control strategies: cascade, split-range', 'Alarm and interlock concepts'] },
      { heading: 'Documentation & Deliverables', topics: ['Instrument datasheets preparation', 'Instrument index and loop diagrams', 'Hook-up and installation drawings', 'Cable and JB schedules', 'As-built documentation and QA/QC basics'] },
      { heading: 'Software Tools', topics: ['AutoCAD for instrumentation drawings', 'Excel for datasheets and calculations', 'Tagging and naming conventions', 'Document control and revision tracking'] },
      { heading: 'Project Work', topics: ['Case study: complete instrumentation design for a process unit', 'Loop diagram and datasheet preparation', 'Review and presentation of deliverables', 'Industry documentation standards'] },
    ],
  },
  {
    categorySlug: 'engineering-design-drafting', name: 'Electrical Design & Drafting', category: '3D Software Architect',
    duration: '6 Months', mode: 'Online + Offline', image: 'electrical-design.jpg', orderInCategory: 2,
    standardFee: 30000, minFloorFee: 22000,
    description: 'Become an electrical design draftsman — design power and control systems, single-line diagrams and panel layouts, and prepare compliant electrical drawings for industry.',
    wywl: [
      'Understand electrical engineering fundamentals: circuits, AC/DC and power systems',
      'Draw single-line diagrams and control schematics accurately',
      'Design power distribution: load calculation, cable sizing and protection',
      'Prepare panel layouts, wiring diagrams and equipment schedules',
      'Work with AutoCAD Electrical and produce industry-standard documentation',
      'Apply Indian electrical standards and safety regulations to designs',
    ],
    skills: ['Electrical Design', 'AutoCAD Electrical', 'Single-Line Diagrams', 'Control Schematics', 'Cable Sizing', 'Load Calculation', 'Panel Layouts', 'IE Code / IS Standards'],
    content: [
      { heading: 'Electrical Engineering Fundamentals', topics: ['Basic concepts: V, I, R, power and energy', 'DC and AC circuits, single and three-phase', 'AC fundamentals: frequency, power factor and harmonics', 'Electrical symbols and notation standards', 'Safety and electrical regulations basics'] },
      { heading: 'Power System Design', topics: ['Power distribution architecture: LT/HT', 'Load calculation and demand factor', 'Transformer selection basics', 'Cable sizing and derating factors', 'Protection devices: MCB, MCCB, fuses and relays', 'Power factor correction and energy efficiency'] },
      { heading: 'Drawings & Schematics', topics: ['Single-line diagrams (SLD)', 'Control schematics and ladder logic basics', 'Wiring diagrams and terminal drawings', 'Earthing and lightning protection details', 'Cable routing and layout drawings'] },
      { heading: 'Equipment & Panels', topics: ['Switchgear: contactors, breakers and starters', 'Motor starters: DOL, star-delta and VFD', 'Transformer and capacitor panel basics', 'Panel layout and arrangement', 'Equipment schedules and bill of quantities'] },
      { heading: 'AutoCAD Electrical', topics: ['Project setup and drawing standards', 'Symbol libraries and tool palettes', 'Component tagging and cross-referencing', 'Panel design and report generation', 'Drawing management and revisions'] },
      { heading: 'Estimation & Documentation', topics: ['Material estimation and BOQ preparation', 'Cable schedules and JB/DB schedules', 'Technical specifications writing', 'Documentation standards and QA'] },
      { heading: 'Project Work', topics: ['Complete electrical design for a sample industrial building', 'Single-line and control schematic preparation', 'Load calculation and cable sizing worked example', 'Panel layout and documentation deliverables'] },
    ],
  },

  // AI-led Supply Chain & Procurement
  {
    categorySlug: 'ai-supply-chain', name: 'Chartered AI Procurement Strategist (CAIPS)®', category: 'Data Analytics',
    duration: '4 Days', mode: 'Instructor-led + Exam', image: 'caips-certification.jpg', orderInCategory: 1,
    standardFee: 25000, minFloorFee: 20000,
    description: 'A focused, instructor-led certification program equipping procurement professionals with AI-driven sourcing, negotiation, contract and supplier analytics skills, culminating in an exam.',
    wywl: [
      'Apply AI tools to sourcing, RFQ/RFP processes and supplier evaluation',
      'Use data analytics to drive cost savings and supply resilience decisions',
      'Negotiate contracts using spend analytics and market intelligence',
      'Identify supply chain risks and build mitigation strategies',
      'Understand sustainable and ethical procurement practices',
      'Earn a certification by passing the CAIPS assessment',
    ],
    skills: ['AI in Procurement', 'Sourcing & RFQ/RFP', 'Supplier Evaluation', 'Contract Negotiation', 'Spend Analytics', 'Supply Risk Management', 'Sustainable Procurement', 'CAIPS Certification'],
    content: [
      { heading: 'Procurement Foundations', topics: ['Procurement cycle and strategic sourcing', 'Demand forecasting and category management', 'Supplier relationship management', 'Cost breakdown and should-cost analysis', 'Procurement KPIs and spend visibility'] },
      { heading: 'AI in the Procurement Function', topics: ['AI/ML fundamentals for procurement', 'AI for supplier discovery and risk scoring', 'Automating RFx generation and analysis', 'AI-driven contract review and clause extraction', 'Responsible AI in procurement', 'Building the business case for AI adoption'] },
      { heading: 'Analytics & Decision Support', topics: ['Spend cube analysis and segmentation', 'Supplier scorecards and performance dashboards', 'Demand and inventory analytics', 'Scenario planning and what-if analysis', 'Data quality and governance for procurement data'] },
      { heading: 'Negotiation & Contracting', topics: ['Preparation and BATNA strategy', 'Value-based negotiation techniques', 'Contract terms: SLAs, penalties and exit clauses', 'Contract lifecycle management basics', 'Dispute resolution and escalation'] },
      { heading: 'Risk, Sustainability & Compliance', topics: ['Single/dual sourcing strategies', 'Geopolitical and supply disruption risk', 'ESG and sustainable sourcing', 'Ethical sourcing and compliance', 'Building resilient supply networks'] },
      { heading: 'Capstone & Certification Exam', topics: ['Case study: AI-enabled sourcing transformation', 'Presenting an AI procurement roadmap', 'Guided revision and practice questions', 'CAIPS certification assessment'] },
    ],
  },
  {
    categorySlug: 'ai-supply-chain', name: 'AI in Supply Chain Career Programme', category: 'Data Science',
    duration: '12 Weeks', mode: 'Online + Classroom', image: 'ai-supply-chain.jpg', orderInCategory: 2,
    standardFee: 28000, minFloorFee: 20000,
    description: 'Learn to apply AI and analytics across planning, procurement, warehousing and logistics, building the portfolio of a supply chain analytics specialist.',
    wywl: [
      'Understand end-to-end supply chain processes and the data they generate',
      'Forecast demand accurately using time-series and ML methods',
      'Optimise inventory levels, safety stock and replenishment policies',
      'Apply optimisation techniques for routing, scheduling and allocation',
      'Use AI for supplier selection, anomaly detection and risk alerts',
      'Build supply chain dashboards and present data-driven recommendations',
    ],
    skills: ['Supply Chain Analytics', 'Demand Forecasting', 'Inventory Optimisation', 'Logistics Planning', 'Python for Analytics', 'Supplier Analytics', 'Supply Chain Dashboarding'],
    content: [
      { heading: 'Supply Chain Fundamentals', topics: ['Demand, supply, planning and execution', 'SCOR model overview', 'Order-to-cash and procure-to-pay flows', 'Warehousing and distribution basics', 'Key KPIs: OTIF, fill rate, inventory turns'] },
      { heading: 'Data & Analytics Foundations', topics: ['Supply chain data sources and systems (ERP/WMS/TMS)', 'Data cleaning and exploratory analysis', 'SQL and Python for supply chain data', 'KPI dashboards and reporting'] },
      { heading: 'Demand Forecasting', topics: ['Time-series basics: trend, seasonality and cycles', 'Moving averages and exponential smoothing', 'ARIMA and SARIMA models', 'Machine learning regression for forecasting', 'Forecast accuracy metrics and intervals', 'Collaborative forecasting and S&OP process'] },
      { heading: 'Inventory & Planning Optimisation', topics: ['Safety stock and reorder point calculations', 'Service level trade-offs', 'EOQ and dynamic replenishment', 'Bullwhip effect and decoupling', 'Inventory segmentation (ABC/XYZ)'] },
      { heading: 'Logistics & Network Optimisation', topics: ['Routing and vehicle routing problems', 'Network design and facility location', 'Scheduling and allocation optimisation', 'Linear and integer programming with Python', 'Scenario and sensitivity analysis'] },
      { heading: 'AI Applications & Risk', topics: ['Supplier selection with ML scoring', 'Anomaly and disruption detection', 'Predictive maintenance in logistics', 'AI ethics, explainability and data privacy'] },
      { heading: 'Capstone Project', topics: ['End-to-end supply chain analytics project', 'Building a forecasting and inventory dashboard', 'Presenting recommendations to stakeholders', 'Portfolio documentation'] },
    ],
  },
];

function makeCode(name) {
  return name.replace(/[^a-zA-Z0-9]+/g, '').toUpperCase();
}

function parseDurationDays(duration) {
  if (!duration) return 90;
  const match = String(duration).match(/(\d+(?:\.\d+)?)\s*(Months?|Weeks?|Days?|Hours?)/i);
  if (!match) return 90;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith('month')) return Math.round(num * 30);
  if (unit.startsWith('week')) return Math.round(num * 7);
  if (unit.startsWith('day')) return Math.round(num);
  return Math.max(1, Math.round(num / 24));
}

// Only fills a field when it is currently empty, so re-running the seed never
// overwrites syllabus copy an admin has since edited in the panel.
const isEmpty = (value) =>
  Array.isArray(value) ? value.length === 0 : !value || !String(value).trim();

const buildSyllabusFields = (def, existing) => {
  const fields = {};
  if (isEmpty(existing?.description) && def.description) fields.description = def.description;
  if (isEmpty(existing?.wywl) && def.wywl) fields.wywl = def.wywl;
  if (isEmpty(existing?.skills) && def.skills) fields.skills = def.skills;
  if (isEmpty(existing?.content) && def.content) fields.content = def.content;
  return fields;
};

const copyCourseImage = (fileName) => {
  if (!fs.existsSync(coursesImgDir)) fs.mkdirSync(coursesImgDir, { recursive: true });
  const src = path.join(cardAssetsDir, fileName);
  if (!fs.existsSync(src)) {
    console.warn(`\u26a0\ufe0f  Skipping image for ${fileName}: source not found at ${src}`);
    return '';
  }
  fs.copyFileSync(src, path.join(coursesImgDir, fileName));
  return `/uploads/courses/${fileName}`;
};

const seedCourses = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📚 Connected to MongoDB for course catalog seeding...');

    let created = 0;
    let updated = 0;
    let syllabusFilled = 0;

    for (const def of courseDefs) {
      const category = await CourseCategory.findOne({ slug: def.categorySlug });
      if (!category) {
        console.warn(`\u26a0\ufe0f  Skipping "${def.name}": category slug "${def.categorySlug}" not found. Run seed:categories first.`);
        continue;
      }

      const image = copyCourseImage(def.image);
      const existing = await Course.findOne({ name: def.name });

      if (existing) {
        const syllabus = buildSyllabusFields(def, existing);
        const filledCount = Object.keys(syllabus).length;
        if (filledCount > 0) syllabusFilled++;

        await Course.updateOne(
          { _id: existing._id },
          {
            $set: {
              category: def.category,
              duration: def.duration,
              durationInDays: parseDurationDays(def.duration),
              mode: def.mode,
              provider: 'FTI Mumbai',
              courseCategoryId: category._id,
              orderInCategory: def.orderInCategory,
              status: 'Active',
              ...(image ? { image } : {}),
              ...syllabus,
            },
          }
        );
        updated++;
        console.log(
          `Updated: ${def.name} (${def.categorySlug})${filledCount > 0 ? ` — filled ${filledCount} empty syllabus field(s)` : ' — syllabus left untouched'}`
        );
      } else {
        await Course.create({
          name: def.name,
          courseCode: makeCode(def.name),
          category: def.category,
          description: def.description || '',
          duration: def.duration,
          durationInDays: parseDurationDays(def.duration),
          mode: def.mode,
          provider: 'FTI Mumbai',
          courseCategoryId: category._id,
          orderInCategory: def.orderInCategory,
          image,
          standardFee: def.standardFee ?? 0,
          minFloorFee: def.minFloorFee ?? 0,
          certificateTemplateKey: 'standard_fti',
          status: 'Active',
          totalStudents: 0,
          wywl: def.wywl || [],
          skills: def.skills || [],
          content: def.content || [],
        });
        created++;
        const modules = (def.content || []).length;
        console.log(
          `Created: ${def.name} (${def.categorySlug}) — ₹${def.standardFee ?? 0} / floor ₹${def.minFloorFee ?? 0} · ${modules} syllabus modules`
        );
      }
    }

    console.log(`\nDone. Created ${created}, updated ${updated}, syllabus topped up on ${syllabusFilled}.`);
    console.log('NOTE: fees are default suggestions set in this seed. Adjust them anytime in the admin panel (Courses & Pricing Matrix) before accepting admissions.');
    console.log('NOTE: syllabus is only filled when empty, so admin edits are never overwritten. Re-run after clearing content if you want the defaults back.');
    process.exit(0);
  } catch (err) {
    console.error('Course catalog seeding error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  seedCourses();
}

module.exports = seedCourses;