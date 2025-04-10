import { supabase } from './supabase';
import { getApiUrl } from '../utils/api';

// Use the environment-aware API URL configuration
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://aems.onrender.com/api' 
  : 'http://localhost:5000/api';

// Alternative approach using the getApiUrl function
// This will ensure we use the same base URL as the rest of the application
const getApiEndpoint = (path: string) => getApiUrl(`api/${path}`);

export interface User {
  id: string;  // UUID
  username: string;
}

export interface Exam {
  id: string;  // UUID
  title: string;
  description?: string;
  created_by: string;  // UUID
  created_at: string;
}

export interface Rubric {
  id: string;  // UUID
  exam_id: string;  // UUID
  file_name: string;
  file_type: string;
  file_size: number;
  preview: string;
  content?: string;
  created_at: string;
}

export interface Submission {
  id: string;  // UUID
  exam_id: string;  // UUID
  student_name: string;
  script_file_name: string;
  score: number;
  feedback: string;
  total_points: number;
  extracted_text_script?: string;
  extracted_text_rubric?: string;
  created_by: string;  // UUID
  created_at: string;
}

// Helper function to handle API errors
async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: `HTTP error ${response.status}`
    }));
    throw new Error(errorData.error || 'An unknown error occurred');
  }
  return response.json();
}

// Auth API
export const register = async (username: string, password: string): Promise<User> => {
  try {
    console.log('Registering user:', username);
    const response = await fetch(getApiEndpoint('auth/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include', // Important for cookies
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const login = async (username: string, password: string): Promise<User> => {
  try {
    const response = await fetch(getApiEndpoint('auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include', // Important for cookies
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Exams API
export const getExams = async (userId?: string): Promise<Exam[]> => {
  try {
    const url = userId ? getApiEndpoint(`exams?user_id=${userId}`) : getApiEndpoint('exams');
    const response = await fetch(url, {
      credentials: 'include', // Important for cookies
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Get exams error:', error);
    throw error;
  }
};

export const createExam = async (title: string, description: string, userId: string): Promise<Exam> => {
  try {
    const response = await fetch(getApiEndpoint('exams'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, description, created_by: userId }),
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Create exam error:', error);
    throw error;
  }
};

// Rubrics API
export const uploadRubric = async (examId: string, file: File): Promise<Rubric> => {
  try {
    const formData = new FormData();
    formData.append('exam_id', examId);
    formData.append('file', file);
    
    const response = await fetch(getApiEndpoint('rubrics'), {
      method: 'POST',
      body: formData,
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Upload rubric error:', error);
    throw error;
  }
};

export const getRubric = async (examId: string): Promise<Rubric> => {
  try {
    const response = await fetch(getApiEndpoint(`rubrics/${examId}`));
    
    return handleResponse(response);
  } catch (error) {
    console.error('Get rubric error:', error);
    throw error;
  }
};

// Submissions API
export const createSubmission = async (
  examId: string, 
  studentName: string, 
  file: File, 
  userId: string
): Promise<Submission> => {
  try {
    const formData = new FormData();
    formData.append('exam_id', examId);
    formData.append('student_name', studentName);
    formData.append('created_by', userId);
    formData.append('file', file);
    
    const response = await fetch(getApiEndpoint('submissions'), {
      method: 'POST',
      body: formData,
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Create submission error:', error);
    throw error;
  }
};

export const getSubmissions = async (examId: string): Promise<Submission[]> => {
  try {
    const response = await fetch(getApiEndpoint(`submissions/${examId}`));
    
    return handleResponse(response);
  } catch (error) {
    console.error('Get submissions error:', error);
    throw error;
  }
};

export const updateSubmissionScore = async (
  submissionId: string, 
  score: number, 
  feedback: string
): Promise<void> => {
  try {
    const response = await fetch(getApiEndpoint(`submissions/${submissionId}/score`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ score, feedback }),
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Update submission score error:', error);
    throw error;
  }
}; 