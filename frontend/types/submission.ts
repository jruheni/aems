export interface Submission {
  id: string;
  student_name: string;
  student_id?: string;
  script_file_url: string;
  script_file_name: string;
  created_at: string;
  score: number | null;
  total_points: number | null;
  extracted_text_script?: string;
  image_url?: string;
  feedback?: string;
  // Add any other properties used in your application
} 