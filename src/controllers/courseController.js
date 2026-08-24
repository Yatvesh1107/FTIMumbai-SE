const Course = require('../models/Course');
const Student = require('../models/Student');
const Admission = require('../models/Admission');

// @desc    Get all courses (with role-based pricing visibility)
// @route   GET /api/courses
// @access  Public / Private
exports.getCourses = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category && category !== 'All') filter.category = category;

    const courses = await Course.find(filter).sort({ createdAt: -1 });

    // Format response: Receptionist/Admin gets floor & max discount; Student/Public gets public standard fee
    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching courses', error: error.message });
  }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public / Private
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new course with Dynamic Floor Pricing (Admin only)
// @route   POST /api/courses
// @access  Private (Admin)
exports.createCourse = async (req, res) => {
  try {
    const {
      name,
      courseCode,
      category,
      description,
      thumbnail,
      duration,
      durationInDays,
      standardFee,
      minFloorFee,
      certificateTemplateKey,
      status
    } = req.body;

    if (!name || !courseCode || standardFee === undefined || minFloorFee === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, courseCode, standardFee (MRP), and minFloorFee (Negotiable Bottom) are required'
      });
    }

    if (Number(minFloorFee) > Number(standardFee)) {
      return res.status(400).json({
        success: false,
        message: 'Minimum Floor Fee cannot be higher than Standard Course Fee (MRP)'
      });
    }

    const courseExists = await Course.findOne({ 
      $or: [{ name: name.trim() }, { courseCode: courseCode.trim().toUpperCase() }] 
    });

    if (courseExists) {
      return res.status(400).json({
        success: false,
        message: 'A course with this name or course code already exists'
      });
    }

    const course = await Course.create({
      name: name.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      category: category || 'General',
      description,
      thumbnail,
      duration: duration || '3 Months',
      durationInDays: Number(durationInDays) || 90,
      standardFee: Number(standardFee),
      minFloorFee: Number(minFloorFee),
      certificateTemplateKey: certificateTemplateKey || 'standard_fti',
      status: status || 'Active'
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update course & pricing floor (Admin only)
// @route   PUT /api/courses/:id
// @access  Private (Admin)
exports.updateCourse = async (req, res) => {
  try {
    const {
      name,
      courseCode,
      category,
      description,
      thumbnail,
      duration,
      durationInDays,
      standardFee,
      minFloorFee,
      certificateTemplateKey,
      status
    } = req.body;

    if (standardFee !== undefined && minFloorFee !== undefined) {
      if (Number(minFloorFee) > Number(standardFee)) {
        return res.status(400).json({
          success: false,
          message: 'Minimum Floor Fee cannot be higher than Standard Course Fee'
        });
      }
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (name) course.name = name.trim();
    if (courseCode) course.courseCode = courseCode.trim().toUpperCase();
    if (category) course.category = category;
    if (description !== undefined) course.description = description;
    if (thumbnail !== undefined) course.thumbnail = thumbnail;
    if (duration) course.duration = duration;
    if (durationInDays) course.durationInDays = Number(durationInDays);
    if (standardFee !== undefined) course.standardFee = Number(standardFee);
    if (minFloorFee !== undefined) course.minFloorFee = Number(minFloorFee);
    if (certificateTemplateKey) course.certificateTemplateKey = certificateTemplateKey;
    if (status) course.status = status;

    await course.save();

    res.json({
      success: true,
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete course (Admin only)
// @route   DELETE /api/courses/:id
// @access  Private (Admin)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const activeAdmissions = await Admission.countDocuments({ courseId: course._id });
    if (activeAdmissions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete course. There are ${activeAdmissions} student admissions enrolled in this course.`
      });
    }

    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
