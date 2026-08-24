const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Admission = require('../models/Admission');

// @desc    Get All Batches (or by Course)
// @route   GET /api/batches
// @access  Private
exports.getBatches = async (req, res) => {
  try {
    const { courseId, status } = req.query;
    let filter = {};

    if (courseId && courseId !== 'All') {
      filter.courseId = courseId;
    }
    if (status) {
      filter.status = status;
    }

    const batches = await Batch.find(filter)
      .populate('courseId', 'name courseCode')
      .sort({ createdAt: -1 });

    // Calculate enrolled student count per batch
    const batchesWithCounts = await Promise.all(
      batches.map(async (b) => {
        const studentCount = await Admission.countDocuments({ batchId: b._id });
        return {
          ...b.toObject(),
          enrolledCount: studentCount
        };
      })
    );

    res.json({ success: true, count: batchesWithCounts.length, batches: batchesWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Batches for a specific course
// @route   GET /api/batches/course/:courseId
// @access  Private
exports.getBatchesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const batches = await Batch.find({ courseId, status: 'Active' })
      .populate('courseId', 'name courseCode')
      .sort({ createdAt: 1 });

    const batchesWithCounts = await Promise.all(
      batches.map(async (b) => {
        const studentCount = await Admission.countDocuments({ batchId: b._id });
        return {
          ...b.toObject(),
          enrolledCount: studentCount
        };
      })
    );

    res.json({ success: true, count: batchesWithCounts.length, batches: batchesWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Batch (Admin)
// @route   POST /api/batches
// @access  Private (Admin)
exports.createBatch = async (req, res) => {
  try {
    const {
      courseId,
      batchName,
      batchCode,
      timing,
      days,
      startDate,
      maxCapacity = 30
    } = req.body;

    if (!courseId || !batchName || !batchCode || !timing) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, Batch Name, Batch Code, and Timing are required'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const existing = await Batch.findOne({ batchCode: batchCode.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Batch Code already in use. Please choose a unique code.' });
    }

    const batch = await Batch.create({
      courseId,
      batchName: batchName.trim(),
      batchCode: batchCode.trim().toUpperCase(),
      timing: timing.trim(),
      days: days ? days.trim() : 'Mon - Fri',
      startDate: startDate ? new Date(startDate) : new Date(),
      maxCapacity: Number(maxCapacity) || 30,
      createdBy: req.user._id,
      status: 'Active'
    });

    res.status(201).json({
      success: true,
      message: `Batch "${batch.batchName}" created successfully!`,
      batch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Batch Status or Details
// @route   PUT /api/batches/:id
// @access  Private (Admin)
exports.updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    res.json({ success: true, message: 'Batch updated successfully', batch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Batch
// @route   DELETE /api/batches/:id
// @access  Private (Admin)
exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    res.json({ success: true, message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
