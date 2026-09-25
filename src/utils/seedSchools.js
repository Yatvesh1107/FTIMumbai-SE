require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const School = require('../models/School');

// Bootstraps the 5 School shells (marketing copy only — NO courses).
// Courses are created by the admin via the admin panel Courses form,
// which assigns them to a schoolId. Idempotent: upserts by slug.
const feAssetsRoot = process.env.FTI_FRONTEND_DIR || path.join(__dirname, '..', '..', '..', 'FTIMumbai');
const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const schoolsDir = path.join(uploadsRoot, 'schools');

const schoolDefs = [
  {
    slug: 'code-data-careers',
    name: 'Code & Data Careers',
    navLabel: 'Code & Data',
    poweredBy: 'Codify',
    eyebrow: 'Code & Data Careers',
    headline: 'From writing code to shipping products people use.',
    description:
      "Thousands of graduates can write code, but very few can ship a working product. Recruiters screen for deployed apps, clean Git histories, testing discipline and the ability to explain design choices — FTI trains you to prove all of it, with live client projects and Codify mentors.",
    heroSource: 'student-hero.jpg',
    featureIcon: 'Code2',
    features: [
      { title: 'Live client projects with Codify mentors' },
      { title: 'Weekly code reviews & mock technical interviews' },
      { title: "Placement drives across Mumbai's IT & services belt" },
    ],
    orderIndex: 1,
  },
  {
    slug: 'enterprise-tech',
    name: 'Enterprise Tech',
    navLabel: 'Enterprise Tech',
    poweredBy: 'Global IoT School',
    eyebrow: 'Enterprise Tech',
    headline: 'The systems every business runs on: its money, its risk and its edge.',
    description:
      "A company's money runs through an ERP like SAP, its risk sits in cybersecurity, and its operations increasingly run on AI and connected devices. Global IoT School practitioners train you hands-on on all three — with placement and internship support.",
    heroSource: 'professional-hero.jpg',
    featureIcon: 'Building2',
    features: [
      { title: 'Trainers who are practising consultants' },
      { title: '100% real business scenarios, labs & SAP system access' },
      { title: 'Placement and internship support' },
    ],
    orderIndex: 2,
  },
  {
    slug: 'deep-tech',
    name: 'Deep Tech',
    navLabel: 'Deep Tech',
    poweredBy: 'PRS Semicon and DeepCoreX Labs',
    eyebrow: 'Deep Tech',
    headline: "Where India's missions in chips, quantum and AI need people most.",
    description:
      'Fewer than 5 in 100 engineering graduates are industry-ready in VLSI, while quantum and agentic AI are barely on the syllabus. Build silicon-proven skills on IP from PRS Semicon and train in quantum and agent labs from DeepCoreX Labs — the highest-value gap in the portfolio.',
    heroSource: 'hero-team.jpg',
    featureIcon: 'Cpu',
    features: [
      { title: 'Silicon-proven IP from a working chip design group' },
      { title: 'Quantum labs on GPU stacks, AWS Braket & real hardware' },
      { title: 'Agent building taught by a deep-tech venture studio' },
    ],
    orderIndex: 3,
  },
  {
    slug: 'engineering-design-drafting',
    name: 'Engineering Design & Drafting',
    navLabel: 'Engineering Design',
    poweredBy: 'Shree Siddhivinayak Institute',
    eyebrow: 'Engineering Design & Drafting',
    headline: 'Every plant, grid and data centre starts as a drawing.',
    description:
      'Diploma, ITI and engineering students learn software buttons — not how a P&ID becomes a hook-up drawing or a load list becomes a cable schedule. FTI teaches the full EPC workflow from practising design engineers, in Mumbai and Dubai.',
    heroSource: 'graduate-hero.jpg',
    featureIcon: 'DraftingCompass',
    features: [
      { title: 'Workflow-first teaching by practising design engineers' },
      { title: 'Real industry project deliverables, checked and corrected' },
      { title: 'Placement support in Mumbai and Dubai design offices' },
    ],
    orderIndex: 4,
  },
  {
    slug: 'ai-supply-chain',
    name: 'AI-led Supply Chain & Procurement',
    navLabel: 'Supply Chain AI',
    poweredBy: 'AAPSCM®',
    eyebrow: 'AI-led Supply Chain & Procurement',
    headline: 'Procurement is where AI saves companies money first.',
    description:
      'Companies are buying AI tools for spend analytics, supplier risk and contract review, but the people running purchasing and logistics were trained for spreadsheets and phone calls. Build AI-ready procurement talent with the globally recognised AAPSCM CAIPS® credential.',
    heroSource: 'hero-boy.png',
    featureIcon: 'Truck',
    features: [
      { title: 'Globally recognised, ISO/IEC 17024-aligned AAPSCM credential' },
      { title: 'Case-based training on real procurement data' },
      { title: 'Placement paths in India and across the Gulf' },
    ],
    orderIndex: 5,
  },
];

const copyHeroImage = (def) => {
  if (!fs.existsSync(schoolsDir)) fs.mkdirSync(schoolsDir, { recursive: true });
  const src = path.join(feAssetsRoot, 'src', 'assets', def.heroSource);
  const ext = path.extname(def.heroSource);
  const dest = path.join(schoolsDir, `${def.slug}${ext}`);
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Skipping hero image for ${def.slug}: source not found at ${src}`);
    return '';
  }
  fs.copyFileSync(src, dest);
  return `/uploads/schools/${def.slug}${ext}`;
};

const seedSchools = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🏫 Connected to MongoDB for school shell seeding...');

    for (const def of schoolDefs) {
      const heroImage = copyHeroImage(def);
      await School.updateOne(
        { slug: def.slug },
        {
          $set: {
            name: def.name,
            navLabel: def.navLabel,
            poweredBy: def.poweredBy,
            eyebrow: def.eyebrow,
            headline: def.headline,
            description: def.description,
            featureIcon: def.featureIcon,
            features: def.features,
            orderIndex: def.orderIndex,
            enabled: true,
            ...(heroImage ? { heroImage } : {}),
          },
        },
        { upsert: true }
      );
      console.log(`✅ Seeded School shell: ${def.slug} ${heroImage ? `(hero ${heroImage})` : ''}`);
    }

    console.log('🎓 School shells seeded. Courses are added by admin via the Courses & Pricing Matrix form.');
    process.exit(0);
  } catch (err) {
    console.error('School shell seeding error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  seedSchools();
}

module.exports = seedSchools;