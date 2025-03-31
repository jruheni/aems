export interface Exam {
  id: string;
  title: string;
  description: string;
  created_at: string;
  user_id: string;
  total_marks?: number;
}

export interface Submission {
  id: string;
  exam_id: string;
  student_name: string;
  student_id: string;
  score: number | null;
  feedback: string | null;
  created_at: string;
  exams: Exam;
}

export interface ExamPerformance {
  examName: string;
  score: number;
  totalMarks: number;
  percentage: number;
}

export interface ScoreDistribution {
  range: string;
  count: number;
}

export interface ImprovementTrend {
  examNumber: number;
  examName: string;
  date: string;
  percentage: number;
}

export interface SkillAssessment {
  name: string;
  score: number;
}

export interface Analytics {
  totalExams: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  examPerformance: ExamPerformance[];
  scoreDistribution: ScoreDistribution[];
  improvementTrend: ImprovementTrend[];
  strengthsWeaknesses: SkillAssessment[];
} 