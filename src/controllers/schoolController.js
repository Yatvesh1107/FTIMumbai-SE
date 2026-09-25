const School = require('../models/School');
const Course = require('../models/Course');

const populateCourses = {
  path: 'courses',
  match: { status: 'Active' },
  options: { sort: { orderInSchool: 1 } }
};

// @desc    Get all schools (public + admin; enabled flag present for filtering)
// @route   GET /api/schools
// @access  Public
exports.getSchools = async (req, res) => {
  try {
    const schools = await School.find().populate(populateCourses).sort({ orderIndex: 1, createdAt: 1 });

    res.json({
      success: true,
      count: schools.length,
      schools
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching schools', error: error.message });
  }
};

// @desc    Get single school by slug
// @route   GET /api/schools/:slug
// @access  Public
exports.getSchoolBySlug = async (req, res) => {
  try {
    const school = await School.findOne({ slug: req.params.slug }).populate(populateCourses);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    res.json({ success: true, school });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new school (Admin only)
// @route   POST /api/schools
// @access  Private (Admin)
exports.createSchool = async (req, res) => {
  try {
    const {
      slug,
      name,
      navLabel,
      enabled,
      poweredBy,
      eyebrow,
      headline,
      description,
      heroImage,
      featureIcon,
      features,
      orderIndex
    } = req.body;

    if (!slug || !name || !navLabel) {
      return res.status(400).json({
        success: false,
        message: 'slug, name, and navLabel are required'
      });
    }

    const normalizedSlug = slug.trim().toLowerCase();
    const slugExists = await School.findOne({ slug: normalizedSlug });
    if (slugExists) {
      return res.status(400).json({
        success: false,
        message: 'A school with this slug already exists'
      });
    }

    const school = await School.create({
      slug: normalizedSlug,
      name: name.trim(),
      navLabel: navLabel.trim(),
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      poweredBy: poweredBy || '',
      eyebrow: eyebrow || '',
      headline: headline || '',
      description: description || '',
      heroImage: heroImage || '',
      featureIcon: featureIcon || 'Code2',
      features: Array.isArray(features) ? features.filter((f) => f && f.title && f.title.trim()) : [],
      orderIndex: Number(orderIndex) || 0
    });

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      school
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update school (Admin only)
// @route   PUT /api/schools/:id
// @access  Private (Admin)
exports.updateSchool = async (req, res) => {
  try {
    const {
      slug,
      name,
      navLabel,
      enabled,
      poweredBy,
      eyebrow,
      headline,
      description,
      heroImage,
      featureIcon,
      features,
      orderIndex
    } = req.body;

    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    if (slug) {
      const normalizedSlug = slug.trim().toLowerCase();
      const slugExists = await School.findOne({ slug: normalizedSlug, _id: { $ne: school._id } });
      if (slugExists) {
        return res.status(400).json({ success: false, message: 'A school with this slug already exists' });
      }
      school.slug = normalizedSlug;
    }
    if (name) school.name = name.trim();
    if (navLabel) school.navLabel = navLabel.trim();
    if (enabled !== undefined) school.enabled = Boolean(enabled);
    if (poweredBy !== undefined) school.poweredBy = poweredBy;
    if (eyebrow !== undefined) school.eyebrow = eyebrow;
    if (headline !== undefined) school.headline = headline;
    if (description !== undefined) school.description = description;
    if (heroImage !== undefined) school.heroImage = heroImage;
    if (featureIcon) school.featureIcon = featureIcon;
    if (features !== undefined) {
      school.features = Array.isArray(features) ? features.filter((f) => f && f.title && f.title.trim()) : [];
    }
    if (orderIndex !== undefined) school.orderIndex = Number(orderIndex) || 0;

    await school.save();

    res.json({
      success: true,
      message: 'School updated successfully',
      school
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete school (Admin only). Courses are unassigned, never deleted.
// @route   DELETE /api/schools/:id
// @access  Private (Admin)
exports.deleteSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    await Course.updateMany({ schoolId: school._id }, { $set: { schoolId: null } });

    await School.findByIdAndDelete(school._id);
    res.json({ success: true, message: 'School deleted successfully. Courses were unassigned (not deleted).' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};