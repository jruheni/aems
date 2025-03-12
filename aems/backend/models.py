from datetime import datetime

class ExamSheet:
    def __init__(self, id, student_id, course_code, exam_date, image_path):
        self.id = id
        self.student_id = student_id
        self.course_code = course_code
        self.exam_date = exam_date
        self.image_path = image_path
        self.created_at = datetime.utcnow()

class GradingResult:
    def __init__(self, id, exam_sheet_id, score, feedback, graded_by):
        self.id = id
        self.exam_sheet_id = exam_sheet_id
        self.score = score
        self.feedback = feedback
        self.graded_by = graded_by
        self.graded_at = datetime.utcnow() 