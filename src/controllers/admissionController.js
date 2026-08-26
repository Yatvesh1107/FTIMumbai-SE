const Admission = require('../models/Admission');
const Student = require('../models/Student');
const User = require('../models/User');
const Course = require('../models/Course');
const FeePayment = require('../models/FeePayment');

// Helper to generate unique codes
const generateEnrollmentNo = async () => {
  const count = await Student.countDocuments();
  const year = new Date().getFullYear();
  return `FTI-${year}-${String(count + 1).padStart(4, '0')}`;
};

const generateAdmissionNo = async () => {
  const count = await Admission.countDocuments();
  const year = new Date().getFullYear();
  return `ADM-${year}-${String(count + 1).padStart(4, '0')}`;
};

const generateReceiptNo = async () => {
  const count = await FeePayment.countDocuments();
  const year = new Date().getFullYear();
  return `REC-${year}-${String(count + 1).padStart(4, '0')}`;
};

// @desc    Submit detailed student admission with floor price validation & installment schedule
// @route   POST /api/admissions
// @access  Private (Admin / Receptionist)
exports.createAdmission = async (req, res) => {
  try {
    const {
      // Personal Details
      fullName,
      gender,
      dob,
      bloodGroup,
      profilePhoto,
      
      // Contact Details
      mobile,
      whatsappMobile,
      email,
      currentAddress,
      permanentAddress,
      
      // Guardian Details
      guardianName,
      guardianRelation,
      guardianMobile,
      guardianOccupation,
      
      // Academic Background
      highestQualification,
      schoolOrCollege,
      passingYear,
      
      // Identity Details
      idProofType,
      idProofNumber,
      idProofDocumentUrl,
      
      // Enrollment & Course
      courseId,
      batchId,
      batchTiming,
      joiningDate,
      
      // Fee & Negotiation Details
      agreedTotalFee,
      downPayment,
      paymentType,
      paymentMode,
      transactionRef,
      installmentsList, // array of { amount, dueDate }
      nextDueDate,
      remarks
    } = req.body;

    // 1. Validate required fields
    if (!courseId || agreedTotalFee === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Course and agreed fee are mandatory.'
      });
    }

    // For new students, personal details are mandatory
    if (!req.body.studentId && (!fullName || !mobile || !email)) {
      return res.status(400).json({
        success: false,
        message: 'Full name, mobile, and email are mandatory for new students.'
      });
    }

    // 2. Fetch Course & Validate Negotiation Floor Limit
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Selected course not found.' });
    }

    const agreedFeeNum = Number(agreedTotalFee);
    const minFloorNum = Number(course.minFloorFee);
    const standardFeeNum = Number(course.standardFee);

    // CRITICAL CORE LOGIC: Receptionist cannot enter an amount lower than minFloorFee
    if (agreedFeeNum < minFloorNum) {
      return res.status(400).json({
        success: false,
        message: `Discount limit exceeded! The minimum allowable negotiated fee for '${course.name}' is ₹${minFloorNum.toLocaleString('en-IN')}. (Entered: ₹${agreedFeeNum.toLocaleString('en-IN')}). Super Admin override required for higher discount.`
      });
    }

    const isFullPayment = paymentType === 'full';
    const requestedDown = Number(downPayment || 0);

    if (!isFullPayment && requestedDown > agreedFeeNum) {
      return res.status(400).json({
        success: false,
        message: 'Received amount cannot be greater than the total agreed fee.'
      });
    }

    // Magma-style: full payment locks the received amount to the total fee
    const downPaymentNum = isFullPayment ? agreedFeeNum : requestedDown;
    const discountGiven = Math.max(0, standardFeeNum - agreedFeeNum);
    const totalBalance = Math.max(0, agreedFeeNum - downPaymentNum);

    // 3. Find or Create Student Record
    let student;
    if (req.body.studentId) {
      // Existing student — add another course
      student = await Student.findById(req.body.studentId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found for the provided studentId.' });
      }
    } else {
      student = await Student.findOne({
        $or: [{ email: email.toLowerCase().trim() }, { mobile: mobile.trim() }]
      });

      if (!student) {
        const enrollmentNo = await generateEnrollmentNo();
        student = await Student.create({
          enrollmentNo,
          fullName: fullName.trim(),
          gender: gender || 'Male',
          dob: dob || null,
          bloodGroup: bloodGroup || '',
          profilePhoto: profilePhoto || '',
          mobile: mobile.trim(),
          whatsappMobile: whatsappMobile ? whatsappMobile.trim() : mobile.trim(),
          email: email.toLowerCase().trim(),
          currentAddress: currentAddress || '',
          permanentAddress: permanentAddress || currentAddress || '',
          guardianName: guardianName || '',
          guardianRelation: guardianRelation || 'Parent',
          guardianMobile: guardianMobile || '',
          guardianOccupation: guardianOccupation || '',
          highestQualification: highestQualification || '12th',
          schoolOrCollege: schoolOrCollege || '',
          passingYear: passingYear ? Number(passingYear) : null,
          idProofType: idProofType || 'Aadhar Card',
          idProofNumber: idProofNumber || '',
          idProofDocumentUrl: idProofDocumentUrl || '',
          status: 'active'
        });

        // Also create User Account for Student login
        const defaultPassword = mobile.trim().slice(-6) || 'fti123';
        const user = await User.create({
          name: fullName.trim(),
          email: email.toLowerCase().trim(),
          password: defaultPassword,
          role: 'student',
          mobile: mobile.trim(),
          studentId: student._id
        });
        student.userId = user._id;
        await student.save();
      }
    }

    // 4. Check for duplicate course admission
    const existingAdmission = await Admission.findOne({ studentId: student._id, courseId: course._id });
    if (existingAdmission) {
      return res.status(400).json({
        success: false,
        message: `Student is already enrolled in '${course.name}'. Cannot add duplicate admission.`
      });
    }

    // 5. Create Admission Record
    let finalBatchTiming = batchTiming || 'Morning (10:00 AM - 12:00 PM)';
    if (batchId) {
      const Batch = require('../models/Batch');
      const batchDoc = await Batch.findById(batchId);
      if (batchDoc) {
        finalBatchTiming = `${batchDoc.batchName} (${batchDoc.timing})`;
      }
    }

    const admissionNo = await generateAdmissionNo();
    const admission = await Admission.create({
      studentId: student._id,
      courseId: course._id,
      batchId: batchId || null,
      admissionNo,
      batchTiming: finalBatchTiming,
      admissionDate: new Date(),
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      standardCourseFee: standardFeeNum,
      agreedTotalFee: agreedFeeNum,
      discountGiven,
      paymentType: isFullPayment ? 'full' : 'installment',
      downPayment: downPaymentNum,
      totalPaid: downPaymentNum,
      totalBalance,
      nextDueDate: null, // Set below once installments are resolved
      paymentStatus: totalBalance === 0 ? 'paid' : (downPaymentNum > 0 ? 'partial' : 'pending'),
      remarks: remarks || '',
      registeredBy: req.user ? req.user._id : null
    });

    // 5. Build Installment Schedule in FeePayment
    let formattedInstallments = [];
    if (!isFullPayment && installmentsList && Array.isArray(installmentsList) && installmentsList.length > 0) {
      formattedInstallments = installmentsList.map((inst, index) => ({
        installmentNo: index + 1,
        amount: Number(inst.amount),
        dueDate: new Date(inst.dueDate),
        paidAmount: 0,
        status: 'pending',
        fine: 0
      }));
    } else if (!isFullPayment && totalBalance > 0) {
      // Default fallback: Split remaining into 2 monthly installments
      const half = Math.ceil(totalBalance / 2);
      const now = new Date();
      const month1 = new Date(now.setMonth(now.getMonth() + 1));
      const month2 = new Date(now.setMonth(now.getMonth() + 1));

      formattedInstallments = [
        { installmentNo: 1, amount: half, dueDate: month1, paidAmount: 0, status: 'pending', fine: 0 },
        { installmentNo: 2, amount: totalBalance - half, dueDate: month2, paidAmount: 0, status: 'pending', fine: 0 }
      ];
    }

    // Magma-style Next Due Date: only stored when balance is pending
    let admissionNextDueDate = null;
    if (totalBalance > 0) {
      const firstPending = formattedInstallments.find((i) => i.status === 'pending');
      if (firstPending && !isNaN(new Date(firstPending.dueDate).getTime())) {
        admissionNextDueDate = firstPending.dueDate;
      } else if (nextDueDate && !isNaN(new Date(nextDueDate).getTime())) {
        admissionNextDueDate = new Date(nextDueDate);
      }
    }

    await Admission.findByIdAndUpdate(admission._id, { nextDueDate: admissionNextDueDate });
    admission.nextDueDate = admissionNextDueDate;

    // Transactions list
    const transactions = [];
    if (downPaymentNum > 0) {
      const receiptNo = await generateReceiptNo();
      transactions.push({
        receiptNo,
        amount: downPaymentNum,
        paymentMode: paymentMode || 'Cash',
        transactionRef: transactionRef || 'Down Payment on Admission',
        paymentDate: new Date(),
        collectedBy: req.user ? req.user._id : null,
        remarks: 'Admission Registration / Down Payment'
      });
    }

    const feePayment = await FeePayment.create({
      admissionId: admission._id,
      studentId: student._id,
      courseId: course._id,
      totalFee: agreedFeeNum,
      paidAmount: downPaymentNum,
      remainingAmount: totalBalance,
      nextDueDate: admissionNextDueDate,
      installments: formattedInstallments,
      transactions,
      gracePeriodDays: 3,
      isAppLocked: false
    });

    // 6. Update Course student count
    await Course.findByIdAndUpdate(course._id, { $inc: { totalStudents: 1 } });

    res.status(201).json({
      success: true,
      message: 'Admission successfully registered!',
      admission,
      student,
      feePayment
    });
  } catch (error) {
    console.error('Admission creation error:', error);
    res.status(500).json({ success: false, message: 'Server error creating admission', error: error.message });
  }
};

// @desc    Search students by name/mobile/enrollment with their existing admissions
// @route   GET /api/admissions/student/search?q=query
// @access  Private (Admin / Receptionist)
exports.searchStudentsWithAdmissions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, students: [] });
    }

    const query = q.trim().toLowerCase();
    const students = await Student.find({
      $or: [
        { fullName: { $regex: query, $options: 'i' } },
        { mobile: { $regex: query } },
        { enrollmentNo: { $regex: query, $options: 'i' } }
      ]
    }).limit(20);

    const results = await Promise.all(students.map(async (s) => {
      const admissions = await Admission.find({ studentId: s._id })
        .populate('courseId', 'name courseCode')
        .sort({ createdAt: -1 });
      return {
        ...s.toObject(),
        admissions
      };
    }));

    res.json({ success: true, students: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all admissions with filters & search
// @route   GET /api/admissions
// @access  Private (Admin / Receptionist)
exports.getAdmissions = async (req, res) => {
  try {
    const { search, courseId, paymentStatus } = req.query;
    const filter = {};

    if (courseId) filter.courseId = courseId;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const admissions = await Admission.find(filter)
      .populate('studentId')
      .populate('courseId')
      .populate('batchId')
      .populate('registeredBy', 'name email role')
      .sort({ createdAt: -1 });

    let results = admissions;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = admissions.filter(a => 
        (a.studentId?.fullName && a.studentId.fullName.toLowerCase().includes(q)) ||
        (a.studentId?.mobile && a.studentId.mobile.includes(q)) ||
        (a.studentId?.enrollmentNo && a.studentId.enrollmentNo.toLowerCase().includes(q)) ||
        (a.admissionNo && a.admissionNo.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      count: results.length,
      admissions: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single admission details
// @route   GET /api/admissions/:id
// @access  Private
exports.getAdmissionById = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id)
      .populate('studentId')
      .populate('courseId')
      .populate('registeredBy', 'name email role');

    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission record not found' });
    }

    const feePayment = await FeePayment.findOne({ admissionId: admission._id })
      .populate('transactions.collectedBy', 'name email');

    res.json({
      success: true,
      admission,
      feePayment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
