const FeePayment = require('../models/FeePayment');
const Admission = require('../models/Admission');
const Student = require('../models/Student');
const Course = require('../models/Course');

const generateReceiptNo = async () => {
  const count = await FeePayment.aggregate([
    { $unwind: "$transactions" },
    { $count: "total" }
  ]);
  const total = (count[0] && count[0].total) ? count[0].total : 0;
  const year = new Date().getFullYear();
  return `REC-${year}-${String(total + 1).padStart(5, '0')}`;
};

// @desc    Collect Fee / Installment Payment
// @route   POST /api/fees/collect
// @access  Private (Admin / Receptionist)
exports.collectFee = async (req, res) => {
  try {
    const {
      admissionId,
      amount,
      paymentMode,
      transactionRef,
      remarks,
      installmentNo
    } = req.body;

    if (!admissionId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid admission ID and payment amount are required.' });
    }

    const feeDoc = await FeePayment.findOne({ admissionId });
    if (!feeDoc) {
      return res.status(404).json({ success: false, message: 'Fee record not found for this admission.' });
    }

    const payAmount = Number(amount);
    if (payAmount > feeDoc.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${payAmount}) exceeds remaining balance of ₹${feeDoc.remainingAmount}.`
      });
    }

    const receiptNo = await generateReceiptNo();

    // 1. Add Transaction
    feeDoc.transactions.push({
      receiptNo,
      amount: payAmount,
      paymentMode: paymentMode || 'Cash',
      transactionRef: transactionRef || '',
      paymentDate: new Date(),
      collectedBy: req.user ? req.user._id : null,
      remarks: remarks || 'Fee Installment Collection'
    });

    // 2. Update totals
    feeDoc.paidAmount += payAmount;
    feeDoc.remainingAmount = Math.max(0, feeDoc.totalFee - feeDoc.paidAmount);

    // 3. Update Installments status if installmentNo provided or sequentially
    let unallocated = payAmount;
    for (let inst of feeDoc.installments) {
      if (inst.status !== 'paid') {
        const needed = inst.amount - (inst.paidAmount || 0);
        if (unallocated >= needed) {
          inst.paidAmount = inst.amount;
          inst.status = 'paid';
          inst.paidDate = new Date();
          unallocated -= needed;
        } else if (unallocated > 0) {
          inst.paidAmount = (inst.paidAmount || 0) + unallocated;
          inst.status = 'partially_paid';
          unallocated = 0;
          break;
        }
      }
    }

    // 4. Refresh Next Due Date: move to the next pending installment, clear when fully paid
    const nextPending = feeDoc.installments.find((inst) => inst.status !== 'paid');
    feeDoc.nextDueDate = feeDoc.remainingAmount > 0 && nextPending ? nextPending.dueDate : null;

    // 5. Check if student still has overdue installments past grace period
    const now = new Date();
    let hasOverdue = false;
    for (let inst of feeDoc.installments) {
      if (inst.status !== 'paid') {
        const graceEnd = new Date(inst.dueDate);
        graceEnd.setDate(graceEnd.getDate() + (feeDoc.gracePeriodDays || 3));
        if (now > graceEnd) {
          hasOverdue = true;
          inst.status = 'overdue';
        }
      }
    }

    // If all clear or no overdue, unlock app
    if (!hasOverdue) {
      feeDoc.isAppLocked = false;
      await Student.findByIdAndUpdate(feeDoc.studentId, {
        status: 'active',
        lockReason: ''
      });
    }

    await feeDoc.save();

    // 6. Update Admission status
    await Admission.findByIdAndUpdate(admissionId, {
      totalPaid: feeDoc.paidAmount,
      totalBalance: feeDoc.remainingAmount,
      nextDueDate: feeDoc.nextDueDate,
      paymentStatus: feeDoc.remainingAmount === 0 ? 'paid' : 'partial'
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully!',
      receiptNo,
      paidAmount: feeDoc.paidAmount,
      remainingAmount: feeDoc.remainingAmount,
      isAppLocked: feeDoc.isAppLocked,
      feePayment: feeDoc
    });
  } catch (error) {
    console.error('Collect fee error:', error);
    res.status(500).json({ success: false, message: 'Server error collecting fee', error: error.message });
  }
};

// @desc    Get Student fee details & installment ledger
// @route   GET /api/fees/student/:studentId
// @access  Private
exports.getStudentFees = async (req, res) => {
  try {
    const feeDoc = await FeePayment.findOne({ studentId: req.params.studentId })
      .populate('courseId', 'name courseCode standardFee')
      .populate('studentId', 'fullName enrollmentNo mobile email status lockReason')
      .populate('transactions.collectedBy', 'name email');

    if (!feeDoc) {
      return res.status(404).json({ success: false, message: 'Fee record not found.' });
    }

    res.json({ success: true, feePayment: feeDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all fee ledgers with search, lock filter & pagination (grouped by student)
// @route   GET /api/fees?search=&lock=&page=&limit=
// @access  Private (Admin / Receptionist)
exports.getAllFees = async (req, res) => {
  try {
    const { search, lock, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // 1. Find matching student IDs if search query provided
    let studentIds = undefined;
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      const matchingStudents = await Student.find({
        $or: [
          { fullName: regex },
          { mobile: { $regex: q } },
          { enrollmentNo: regex }
        ]
      }).select('_id');
      studentIds = matchingStudents.map((s) => s._id);

      if (studentIds.length === 0) {
        return res.json({ success: true, students: [], totalStudents: 0, page: pageNum, totalPages: 0 });
      }
    }

    // 2. Build fee filter
    const feeFilter = {};
    if (studentIds) feeFilter.studentId = { $in: studentIds };
    if (lock === 'locked') feeFilter.isAppLocked = true;
    else if (lock === 'active') feeFilter.isAppLocked = false;

    // 3. Get all matching fee records (populated)
    const allFees = await FeePayment.find(feeFilter)
      .populate('studentId')
      .populate('courseId')
      .populate('admissionId')
      .sort({ updatedAt: -1 });

    // 4. Group by student on server
    const groupedMap = {};
    allFees.forEach((f) => {
      const sid = f.studentId?._id?.toString() || f.studentId?.toString();
      if (!sid) return;
      if (!groupedMap[sid]) {
        groupedMap[sid] = {
          student: f.studentId,
          fees: [],
          totalFee: 0,
          totalPaid: 0,
          totalRemaining: 0,
          isLocked: false
        };
      }
      groupedMap[sid].fees.push(f);
      groupedMap[sid].totalFee += f.totalFee || 0;
      groupedMap[sid].totalPaid += f.paidAmount || 0;
      groupedMap[sid].totalRemaining += f.remainingAmount || 0;
      if (f.isAppLocked || f.studentId?.status === 'locked') {
        groupedMap[sid].isLocked = true;
      }
    });

    // 5. Paginate the grouped results
    const allGroups = Object.values(groupedMap);
    const totalStudents = allGroups.length;
    const totalPages = Math.ceil(totalStudents / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paged = allGroups.slice(start, start + limitNum);

    res.json({
      success: true,
      students: paged,
      totalStudents,
      page: pageNum,
      totalPages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Run Automated Overdue Check & App Lock Routine
// @route   POST /api/fees/check-overdue-lock
// @access  Private (Admin / System)
exports.checkOverdueAndLock = async (req, res) => {
  try {
    const fees = await FeePayment.find({ remainingAmount: { $gt: 0 } });
    const now = new Date();
    let lockedCount = 0;

    for (let fee of fees) {
      let isOverduePastGrace = false;
      let overdueAmount = 0;

      for (let inst of fee.installments) {
        if (inst.status !== 'paid') {
          const graceEnd = new Date(inst.dueDate);
          graceEnd.setDate(graceEnd.getDate() + (fee.gracePeriodDays || 3));

          if (now > graceEnd) {
            inst.status = 'overdue';
            isOverduePastGrace = true;
            overdueAmount += (inst.amount - (inst.paidAmount || 0));
          }
        }
      }

      if (isOverduePastGrace && !fee.isAppLocked) {
        fee.isAppLocked = true;
        fee.lockDate = now;
        await fee.save();

        await Student.findByIdAndUpdate(fee.studentId, {
          status: 'locked',
          lockReason: `Fee installment of ₹${overdueAmount.toLocaleString('en-IN')} is overdue past grace period. Please clear payment to restore portal access.`
        });
        lockedCount++;
      } else if (!isOverduePastGrace && fee.isAppLocked) {
        fee.isAppLocked = false;
        await fee.save();
        await Student.findByIdAndUpdate(fee.studentId, {
          status: 'active',
          lockReason: ''
        });
      } else {
        await fee.save();
      }
    }

    res.json({
      success: true,
      message: `Overdue check complete. ${lockedCount} accounts locked.`,
      lockedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin manual unlock override
// @route   POST /api/fees/unlock-override/:studentId
// @access  Private (Admin)
exports.unlockOverride = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    student.status = 'active';
    student.lockReason = '';
    await student.save();

    await FeePayment.findOneAndUpdate(
      { studentId: student._id },
      { isAppLocked: false }
    );

    res.json({ success: true, message: 'Student account unlocked successfully by Admin override.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Receipt details for printable view
// @route   GET /api/fees/receipt/:receiptNo
// @access  Private
exports.getReceiptByNo = async (req, res) => {
  try {
    const fee = await FeePayment.findOne({ "transactions.receiptNo": req.params.receiptNo })
      .populate('studentId')
      .populate('courseId')
      .populate('admissionId')
      .populate('transactions.collectedBy', 'name email role');

    if (!fee) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    const transaction = fee.transactions.find(t => t.receiptNo === req.params.receiptNo);

    res.json({
      success: true,
      receipt: {
        receiptNo: transaction.receiptNo,
        amount: transaction.amount,
        paymentMode: transaction.paymentMode,
        transactionRef: transaction.transactionRef,
        paymentDate: transaction.paymentDate,
        collectedBy: transaction.collectedBy,
        remarks: transaction.remarks,
        student: fee.studentId,
        course: fee.courseId,
        admission: fee.admissionId,
        totalFee: fee.totalFee,
        paidAmount: fee.paidAmount,
        remainingAmount: fee.remainingAmount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
