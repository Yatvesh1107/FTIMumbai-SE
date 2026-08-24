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

    // 4. Check if student still has overdue installments past grace period
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

    // 5. Update Admission status
    await Admission.findByIdAndUpdate(admissionId, {
      totalPaid: feeDoc.paidAmount,
      totalBalance: feeDoc.remainingAmount,
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

// @desc    Get all fee ledgers with overdue filters
// @route   GET /api/fees
// @access  Private (Admin / Receptionist)
exports.getAllFees = async (req, res) => {
  try {
    const { status, isLocked } = req.query;
    const filter = {};
    if (isLocked !== undefined) filter.isAppLocked = isLocked === 'true';

    const fees = await FeePayment.find(filter)
      .populate('studentId')
      .populate('courseId')
      .populate('admissionId')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: fees.length, fees });
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
