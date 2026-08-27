require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Question = require('../models/Question');
const VideoLecture = require('../models/VideoLecture');
const StudyNote = require('../models/StudyNote');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🌱 Connected to MongoDB for content seeding...');

    // NOTE: The Super Admin is seeded separately via `seedAdmin.js`.
    // Receptionists & staff are added by the admin from the admin panel (not seeded).

    // Seed Standard FTI Courses with Pricing Floors & LMS Content by Admin
    const coursesData = [
      {
        name: 'Master in Web Designing & Development',
        courseCode: 'FTI-MWDD',
        category: 'Web Development',
        description: 'Comprehensive practical training covering HTML5, CSS3, JavaScript, React.js, Node.js, Express, MongoDB, and Git.',
        duration: '6 Months',
        durationInDays: 180,
        standardFee: 35000, // MRP
        minFloorFee: 26000, // Minimum negotiable bottom price
        certificateTemplateKey: 'web_dev',
        status: 'Active'
      },
      {
        name: 'Full Stack Web Development (MERN Stack)',
        courseCode: 'FTI-MERN',
        category: 'Software Development',
        description: 'Master frontend & backend architecture with React, Redux, Node.js, Express, REST APIs, and Cloud Deployment.',
        duration: '4 Months',
        durationInDays: 120,
        standardFee: 28000,
        minFloorFee: 22000,
        certificateTemplateKey: 'full_stack',
        status: 'Active'
      },
      {
        name: 'Professional Graphic Designing & UI/UX',
        courseCode: 'FTI-GDUX',
        category: 'Design & Multimedia',
        description: 'Industry standard training on Photoshop, Illustrator, CorelDRAW, Figma, UI/UX Wireframing, and Branding.',
        duration: '3 Months',
        durationInDays: 90,
        standardFee: 22000,
        minFloorFee: 16000,
        certificateTemplateKey: 'graphic_design',
        status: 'Active'
      },
      {
        name: 'Digital Marketing & Social Media Strategist',
        courseCode: 'FTI-DMKT',
        category: 'Digital Marketing',
        description: 'SEO, SEM, Google Ads, Meta Ads, Performance Marketing, Analytics, and Content Strategy with live campaigns.',
        duration: '3 Months',
        durationInDays: 90,
        standardFee: 20000,
        minFloorFee: 15000,
        certificateTemplateKey: 'digital_marketing',
        status: 'Active'
      },
      {
        name: 'Python Programming & Data Science',
        courseCode: 'FTI-PYDS',
        category: 'Data Science',
        description: 'Python core, OOPs, NumPy, Pandas, Matplotlib, Seaborn, Machine Learning algorithms, and data visualization.',
        duration: '4 Months',
        durationInDays: 120,
        standardFee: 30000,
        minFloorFee: 24000,
        certificateTemplateKey: 'python_ds',
        status: 'Active'
      }
    ];

    for (let c of coursesData) {
      const existing = await Course.findOne({ courseCode: c.courseCode });
      if (!existing) {
        const newCourse = await Course.create(c);
        console.log(`✅ Seeded Course: ${c.name} (MRP: ₹${c.standardFee} | Floor: ₹${c.minFloorFee})`);

        // Add sample admin lectures
        await VideoLecture.create({
          courseId: newCourse._id,
          moduleTitle: 'Module 1: Foundations & Architecture',
          title: `Introduction to ${c.name}`,
          description: 'Overview of syllabus, tools setup, environment configuration, and roadmap.',
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
          durationInSeconds: 600,
          orderIndex: 1,
          resources: [{ title: 'Lecture Notes PDF', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }]
        });

        // Add sample admin study note
        await StudyNote.create({
          courseId: newCourse._id,
          chapterTitle: 'Chapter 1: Getting Started Guide',
          title: 'Complete Course Syllabus & Reference Sheet',
          description: 'Official downloadable PDF containing full module details, best practices, and cheat-sheet.',
          fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileSize: '1.2 MB PDF',
          orderIndex: 1
        });

        // Add sample MCQ Questions
        await Question.create({
          courseId: newCourse._id,
          topic: 'Fundamentals',
          questionText: `Which of the following is the primary prerequisite for mastering ${c.name}?`,
          options: [
            { optionText: 'Consistent daily practical practice', isCorrect: true },
            { optionText: 'Only memorizing theory notes', isCorrect: false },
            { optionText: 'Skipping basics and jumping to advance directly', isCorrect: false },
            { optionText: 'None of the above', isCorrect: false }
          ],
          marks: 1,
          explanation: 'Hands-on practicals and real-world project builds are the key to mastery.'
        });
      }
    }

    console.log('🎉 Content seeding completed (Courses, LMS, Questions). Admin & staff are managed via the panel.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDB();
}

module.exports = seedDB;
