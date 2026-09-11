const Enquiry = require('../models/Enquiry');

// @desc    Create new enquiry (public website + admin desk)
// @route   POST /api/enquiries
// @access  Public (website) / Private (admin/receptionist)
exports.createEnquiry = async (req, res) => {
  try {
    const { name, mobile, email, courseInterest, source, remarks, assignedTo } = req.body;

    if (!name?.trim() || !mobile?.trim() || !email?.trim() || !courseInterest?.trim()) {
      return res.status(400).json({ success: false, message: 'Name, mobile, email, and course interest are required.' });
    }

    const enquiry = await Enquiry.create({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.toLowerCase().trim(),
      courseInterest: courseInterest.trim(),
      source: source || 'website',
      remarks: remarks || '',
      assignedTo: assignedTo || (req.user ? req.user._id : null),
      status: 'new',
      followUps: []
    });

    res.status(201).json({ success: true, message: 'Enquiry submitted successfully!', enquiry });
  } catch (error) {
    console.error('Create enquiry error:', error);
    res.status(500).json({ success: false, message: 'Server error creating enquiry' });
  }
};

// @desc    Get all enquiries with filters & search
// @route   GET /api/enquiries
// @access  Private (Admin / Receptionist)
exports.getEnquiries = async (req, res) => {
  try {
    const { status, search, source } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (source) filter.source = source;

    let enquiries = await Enquiry.find(filter)
      .populate('assignedTo', 'name email')
      .populate('convertedStudentId', 'enrollmentNo fullName')
      .sort({ createdAt: -1 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enquiries = enquiries.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.mobile.includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.courseInterest.toLowerCase().includes(q)
      );
    }

    const counts = await Enquiry.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusCounts = { new: 0, contacted: 0, follow_up: 0, converted: 0, lost: 0 };
    counts.forEach(c => { statusCounts[c._id] = c.count; });

    res.json({ success: true, count: enquiries.length, enquiries, statusCounts });
  } catch (error) {
    console.error('Get enquiries error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single enquiry by ID
// @route   GET /api/enquiries/:id
// @access  Private (Admin / Receptionist)
exports.getEnquiryById = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('followUps.conductedBy', 'name email')
      .populate('convertedStudentId', 'enrollmentNo fullName mobile');

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    res.json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update an enquiry (full edit)
// @route   PUT /api/enquiries/:id
// @access  Private (Admin / Receptionist)
exports.updateEnquiry = async (req, res) => {
  try {
    const { name, mobile, email, courseInterest, source, remarks } = req.body;

    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (name !== undefined) enquiry.name = name.trim() || enquiry.name;
    if (mobile !== undefined) enquiry.mobile = mobile.trim() || enquiry.mobile;
    if (email !== undefined) enquiry.email = email.toLowerCase().trim() || enquiry.email;
    if (courseInterest !== undefined) enquiry.courseInterest = courseInterest.trim() || enquiry.courseInterest;
    if (source !== undefined) enquiry.source = source;
    if (remarks !== undefined) enquiry.remarks = remarks;

    await enquiry.save();

    res.json({ success: true, message: 'Enquiry updated.', enquiry });
  } catch (error) {
    console.error('Update enquiry error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update enquiry status
// @route   PUT /api/enquiries/:id/status
// @access  Private (Admin / Receptionist)
exports.updateEnquiryStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const validStatuses = ['new', 'contacted', 'follow_up', 'converted', 'lost'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { status, remarks: remarks !== undefined ? remarks : undefined },
      { new: true }
    );

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    res.json({ success: true, message: 'Status updated.', enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a follow-up entry to an enquiry
// @route   POST /api/enquiries/:id/followup
// @access  Private (Admin / Receptionist)
exports.addFollowUp = async (req, res) => {
  try {
    const { type, notes, nextFollowUpDate } = req.body;

    if (!type || !notes?.trim()) {
      return res.status(400).json({ success: false, message: 'Follow-up type and notes are required.' });
    }

    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    const followUp = {
      type,
      notes: notes.trim(),
      conductedBy: req.user ? req.user._id : null,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
      date: new Date()
    };

    enquiry.followUps.push(followUp);
    enquiry.followUpCount = enquiry.followUps.length;
    enquiry.lastFollowUpDate = new Date();
    enquiry.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : enquiry.nextFollowUpDate;

    if (enquiry.status === 'new') {
      enquiry.status = 'contacted';
    } else if (enquiry.status !== 'converted' && enquiry.status !== 'lost') {
      enquiry.status = 'follow_up';
    }

    await enquiry.save();

    res.json({ success: true, message: 'Follow-up added.', enquiry });
  } catch (error) {
    console.error('Add follow-up error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark enquiry as converted (with studentId + admissionId)
// @route   PUT /api/enquiries/:id/convert
// @access  Private (Admin / Receptionist)
exports.convertEnquiry = async (req, res) => {
  try {
    const { studentId, admissionId } = req.body;

    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      {
        status: 'converted',
        convertedStudentId: studentId || undefined,
        convertedAdmissionId: admissionId || undefined
      },
      { new: true }
    );

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    res.json({ success: true, message: 'Enquiry marked as converted.', enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete an enquiry
// @route   DELETE /api/enquiries/:id
// @access  Private (Admin only)
exports.deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }
    res.json({ success: true, message: 'Enquiry deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
