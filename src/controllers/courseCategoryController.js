const CourseCategory = require('../models/CourseCategory');
const Course = require('../models/Course');

const populateCourses = {
  path: 'courses',
  match: { status: 'Active' },
  options: { sort: { orderInCategory: 1 } }
};

// @desc    Get all course categories (public + admin; enabled flag present for filtering)
// @route   GET /api/categories
// @access  Public
exports.getCourseCategories = async (req, res) => {
  try {
    const categories = await CourseCategory.find().populate(populateCourses).sort({ orderIndex: 1, createdAt: 1 });

    res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching course categories', error: error.message });
  }
};

// @desc    Get single course category by slug
// @route   GET /api/categories/:slug
// @access  Public
exports.getCourseCategoryBySlug = async (req, res) => {
  try {
    const category = await CourseCategory.findOne({ slug: req.params.slug }).populate(populateCourses);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Course category not found' });
    }
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new course category (Admin only)
// @route   POST /api/categories
// @access  Private (Admin)
exports.createCourseCategory = async (req, res) => {
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
    const slugExists = await CourseCategory.findOne({ slug: normalizedSlug });
    if (slugExists) {
      return res.status(400).json({
        success: false,
        message: 'A course category with this slug already exists'
      });
    }

    const category = await CourseCategory.create({
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
      message: 'Course category created successfully',
      category
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update course category (Admin only)
// @route   PUT /api/categories/:id
// @access  Private (Admin)
exports.updateCourseCategory = async (req, res) => {
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

    const category = await CourseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Course category not found' });
    }

    if (slug) {
      const normalizedSlug = slug.trim().toLowerCase();
      const slugExists = await CourseCategory.findOne({ slug: normalizedSlug, _id: { $ne: category._id } });
      if (slugExists) {
        return res.status(400).json({ success: false, message: 'A course category with this slug already exists' });
      }
      category.slug = normalizedSlug;
    }
    if (name) category.name = name.trim();
    if (navLabel) category.navLabel = navLabel.trim();
    if (enabled !== undefined) category.enabled = Boolean(enabled);
    if (poweredBy !== undefined) category.poweredBy = poweredBy;
    if (eyebrow !== undefined) category.eyebrow = eyebrow;
    if (headline !== undefined) category.headline = headline;
    if (description !== undefined) category.description = description;
    if (heroImage !== undefined) category.heroImage = heroImage;
    if (featureIcon) category.featureIcon = featureIcon;
    if (features !== undefined) {
      category.features = Array.isArray(features) ? features.filter((f) => f && f.title && f.title.trim()) : [];
    }
    if (orderIndex !== undefined) category.orderIndex = Number(orderIndex) || 0;

    await category.save();

    res.json({
      success: true,
      message: 'Course category updated successfully',
      category
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete course category (Admin only). Courses are unassigned, never deleted.
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
exports.deleteCourseCategory = async (req, res) => {
  try {
    const category = await CourseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Course category not found' });
    }

    await Course.updateMany({ courseCategoryId: category._id }, { $set: { courseCategoryId: null } });

    await CourseCategory.findByIdAndDelete(category._id);
    res.json({ success: true, message: 'Course category deleted successfully. Courses were unassigned (not deleted).' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};