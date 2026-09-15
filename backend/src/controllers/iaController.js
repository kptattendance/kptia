import IAMarks from "../models/IAMarks.js";


// CREATE / UPDATE IA MARKS
export const saveIAMarks = async (req, res) => {
  try {
    const {
      department,
      semester,
      subjectId,
      academicYear,
      students,
    } = req.body;

    if (
      !department ||
      !semester ||
      !subjectId ||
      !academicYear ||
      !Array.isArray(students)
    ) {
      return res.status(400).json({
        success: false,
        message: "Required IA data is missing.",
      });
    }

    // Validate marks
    for (const student of students) {
      if (!Array.isArray(student.tests)) {
        return res.status(400).json({
          success: false,
          message: "Invalid test data.",
        });
      }

      for (const test of student.tests) {
        if (test.marks < 0 || test.marks > test.maxMarks) {
          return res.status(400).json({
            success: false,
            message:
              `Marks for ${test.testName} must be between 0 and ${test.maxMarks}.`,
          });
        }
      }
    }

    const iaMarks = await IAMarks.findOneAndUpdate(
      {
        department,
        semester,
        subjectId,
        academicYear,
      },
      {
        department,
        semester,
        subjectId,
        academicYear,
        students,
        enteredBy: req.user.id,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "IA marks saved successfully.",
      data: iaMarks,
    });
  } catch (error) {
    console.error("Save IA Marks Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save IA marks.",
    });
  }
};


// GET IA MARKS
export const getIAMarks = async (req, res) => {
  try {
    const {
      department,
      semester,
      subjectId,
      academicYear,
    } = req.query;

    const iaMarks = await IAMarks.findOne({
      department,
      semester,
      subjectId,
      academicYear,
    }).populate(
      "students.studentId",
      "registerNumber name email"
    );

    return res.status(200).json({
      success: true,
      data: iaMarks,
    });
  } catch (error) {
    console.error("Get IA Marks Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch IA marks.",
    });
  }
};