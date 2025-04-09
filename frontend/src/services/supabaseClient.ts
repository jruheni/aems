import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huomcpulnpatjyvrnlju.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1b21jcHVsbnBhdGp5dnJubGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTcyOTUsImV4cCI6MjA1ODgzMzI5NX0.u-2TyALnnmw1PCBe0gUh9iUXYnhwxWE242sN1rktKNE';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);

// Types
export interface RubricResponse {
  id: string;
  exam_id: string | null;
  file_name: string | null;
  content: string | null;
  preview: string | null;
  created_at: string | null;
  file_url?: string;
  image_url?: string;
  file_type?: string;
  file_size?: number;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  created_at?: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  created_at?: string;
  language?: string;
}

export interface Rubric {
  id: string;
  exam_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string | null;
  created_by: string | null;
  file_name: string | null;
}

export interface Submission {
  id: string;
  exam_id: string;
  student_name: string;
  script_file_name: string;
  script_file_url: string | null;
  extracted_text_script: string | null;
  image_url: string | null;
  created_at: string;
  created_by?: string | null;
  score: number | null;
  feedback: string | null;
  total_points: number | null;
  extracted_text_rubric?: string | null;
}

// Auth functions
export async function registerUser(username: string, password: string): Promise<User> {
  console.log('Registering user:', username);
  
  // Check if username exists
  const { data: existingUsers, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .limit(1);
  
  if (checkError) {
    console.error('Error checking existing user:', checkError);
    throw new Error(checkError.message);
  }
  
  if (existingUsers && existingUsers.length > 0) {
    throw new Error('Username already exists');
  }
  
  // Insert new user
  const { data, error } = await supabase
    .from('users')
    .insert([
      { username, password }
    ])
    .select();
  
  if (error) {
    console.error('Registration error:', error);
    throw new Error(error.message);
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create user');
  }
  
  const user = data[0];
  delete user.password; // Don't return password
  
  return user;
}

export async function loginUser(username: string, password: string): Promise<User> {
  // Get user by username
  const { data, error } = await supabase
    .from('users')
    .select('id, username, password')
    .eq('username', username)
    .limit(1);
  
  if (error) {
    console.error('Login error:', error);
    throw new Error(error.message);
  }
  
  if (!data || data.length === 0) {
    throw new Error('Invalid username or password');
  }
  
  const user = data[0];
  
  // Check password
  if (user.password !== password) {
    throw new Error('Invalid username or password');
  }
  
  delete user.password; // Don't return password
  
  return user;
}

// Exam functions
export async function getExams(userId: string): Promise<Exam[]> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Get exams error:', error);
    throw new Error(error.message);
  }
  
  return data || [];
}

export async function createExam(
  title: string,
  description: string,
  userId: string
): Promise<Exam> {
  const { data, error } = await supabase
    .from('exams')
    .insert([
      { title, description, created_by: userId }
    ])
    .select();
  
  if (error) {
    console.error('Create exam error:', error);
    throw new Error(error.message);
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create exam');
  }
  
  return data[0];
}

// Rubric functions
export async function uploadRubric(examId: string, file: File): Promise<Rubric> {
  try {
    console.log('[Debug] Starting rubric upload for exam:', examId);

    // First check if a rubric already exists for this exam
    const { data: existingRubric, error: fetchError } = await supabase
      .from('rubrics')
      .select('*')
      .eq('exam_id', examId)
      .single();

    // If there's an existing rubric, delete it from storage and database
    if (existingRubric) {
      console.log('[Debug] Found existing rubric, deleting it:', existingRubric);

      // Delete the old file from storage if it exists
      if (existingRubric.file_name) {
        const oldFilePath = `rubrics/${examId}/${existingRubric.file_name}`;
        const { error: deleteStorageError } = await supabase.storage
          .from('rubrics')
          .remove([oldFilePath]);

        if (deleteStorageError) {
          console.warn('[Debug] Error deleting old file from storage:', deleteStorageError);
          // Continue with upload even if old file deletion fails
        }
      }

      // Delete the old rubric record from the database
      const { error: deleteDbError } = await supabase
        .from('rubrics')
        .delete()
        .eq('id', existingRubric.id);

      if (deleteDbError) {
        console.error('[Debug] Error deleting old rubric from database:', deleteDbError);
        throw new Error('Failed to delete existing rubric');
      }
    }

    // Upload new file to storage
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `rubrics/${examId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('rubrics')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(uploadError.message);
    }

    // Get public URL
    const { data: urlData } = await supabase.storage
      .from('rubrics')
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // Send the file for OCR processing
    const formData = new FormData();
    formData.append('file', file);

    console.log('[Debug] Sending file for OCR processing');
    const ocrResponse = await fetch('http://localhost:5000/api/ocr/extract-text', {
      method: 'POST',
      body: formData,
    });

    if (!ocrResponse.ok) {
      throw new Error('Failed to process OCR');
    }

    const ocrResult = await ocrResponse.json();
    const extractedText = ocrResult.text;
    console.log('[Debug] OCR extracted text:', extractedText?.substring(0, 100) + '...');

    if (!extractedText) {
      throw new Error('No text could be extracted from the rubric');
    }

    // Create new rubric record
    const rubricData = {
      file_name: fileName,
      file_type: file.type,
      file_size: file.size,
      image_url: imageUrl,
      exam_id: examId,
      content: extractedText
    };

    console.log('[Debug] Creating new rubric record:', rubricData);

    const { data, error } = await supabase
      .from('rubrics')
      .insert([rubricData])
      .select()
      .single();

    if (error) {
      console.error('Create rubric error:', error);
      throw new Error(error.message);
    }

    console.log('[Debug] Rubric upload successful:', data);
    return data;

  } catch (error) {
    console.error('Error in uploadRubric:', error);
    throw error;
  }
}

export async function getRubric(examId: string): Promise<RubricResponse | null> {
  try {
    console.log('[Debug] Getting rubric for exam_id:', examId);
    
    const { data, error } = await supabase
      .from('rubrics')
      .select(`
        id,
        exam_id,
        file_name,
        file_type,
        file_size,
        content,
        preview,
        created_at,
        image_url
      `)
      .eq('exam_id', examId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[Debug] No rubric found for exam_id:', examId);
        return null;
      }
      throw error;
    }

    console.log('[Debug] Found rubric:', data);

    // Ensure we're returning all necessary fields
    return {
      id: data.id,
      exam_id: data.exam_id,
      file_name: data.file_name,
      content: data.content,
      preview: data.preview,
      created_at: data.created_at,
      file_url: data.image_url,
      image_url: data.image_url,
      file_type: data.file_type,
      file_size: data.file_size
    };
  } catch (error) {
    console.error('[Debug] Error getting rubric:', error);
    throw error;
  }
}

// Submission functions
export async function createSubmission(
  examId: string,
  studentName: string,
  file: File,
  userId: string
): Promise<Submission> {
  try {
    console.log('Creating submission:', { examId, studentName, fileName: file.name });

    // First get the rubric content
    const { data: rubric, error: rubricError } = await supabase
      .from('rubrics')
      .select('content')
      .eq('exam_id', examId)
      .single();

    if (rubricError) {
      console.error('Error fetching rubric:', rubricError);
      throw new Error('Failed to fetch rubric');
    }

    if (!rubric?.content) {
      throw new Error('No rubric content found for this exam');
    }

    // Upload the submission file to storage
    const uniqueFileName = `submissions/${examId}/${Date.now()}_${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(uniqueFileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw new Error('Failed to upload file');
    }

    // Get public URL
    const { data: urlData } = await supabase.storage
      .from('submissions')
      .getPublicUrl(uniqueFileName);

    const fileUrl = urlData.publicUrl;

    // Process submission with OCR
    const formData = new FormData();
    formData.append('file', file);

    const ocrResponse = await fetch('http://localhost:5000/api/ocr/extract-text', {
      method: 'POST',
      body: formData,
    });

    if (!ocrResponse.ok) {
      throw new Error('Failed to process OCR');
    }

    const ocrResult = await ocrResponse.json();
    const extractedText = ocrResult.text;

    // Create submission record
    const { data, error } = await supabase
      .from('submissions')
      .insert([{
        exam_id: examId,
        student_name: studentName,
        script_file_name: file.name,
        script_file_url: fileUrl,
        created_by: userId,
        extracted_text_script: extractedText,
        extracted_text_rubric: rubric.content,  // Use the rubric content from the database
        total_points: 10 // Default value
      }])
      .select();

    if (error) {
      throw new Error('Failed to create submission');
    }

    return data[0];
  } catch (error) {
    console.error('Error in createSubmission:', error);
    throw error;
  }
}

export async function getSubmissions(examId: string): Promise<Submission[]> {
  try {
    console.log('Getting submissions for exam:', examId);
    
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get submissions error:', error);
      throw new Error(error.message);
    }
    
    console.log(`Retrieved ${data.length} submissions`);
    return data || [];
  } catch (error) {
    console.error('Error in getSubmissions:', error);
    throw error;
  }
}

export async function updateSubmissionScore(
  submissionId: string,
  score: number,
  feedback: string
): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .update({ score, feedback })
    .eq('id', submissionId);
  
  if (error) {
    console.error('Update submission score error:', error);
    throw new Error(error.message);
  }
}

// Grading function
export async function gradeSubmission(
  submissionId: string,
  answerText: string,
  rubricText: string,
  strictnessLevel: number = 2
): Promise<{score: number, feedback: string, total_points: number}> {
  try {
    console.log('Grading submission:', {
      submissionId,
      answerTextLength: answerText.length,
      rubricTextLength: rubricText.length,
      strictnessLevel
    });
    
    // Define the API base URL - try both localhost and the server IP
    const apiUrls = [
      'http://localhost:5000',
      'http://127.0.0.1:5000'
    ];
    
    let apiBaseUrl = '';
    let testSuccess = false;
    
    // Try each URL until one works
    for (const url of apiUrls) {
      try {
        console.log(`Testing API connection to ${url}...`);
        const testResponse = await fetch(`${url}/api/test`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (testResponse.ok) {
          console.log(`API test successful for ${url}`);
          apiBaseUrl = url;
          testSuccess = true;
          break;
        }
      } catch (testError) {
        console.warn(`API test failed for ${url}:`, testError);
        // Continue to the next URL
      }
    }
    
    if (!testSuccess) {
      console.error('All API connection attempts failed');
      throw new Error('Cannot connect to grading API. Please make sure the backend server is running on port 5000.');
    }
    
    // Call the backend API for grading
    console.log(`Calling grading API at ${apiBaseUrl}/api/grade...`);
    
    // Prepare the request payload
    const payload = {
      submission_id: submissionId,
      answer_text: answerText,
      rubric_text: rubricText,
      strictness_level: strictnessLevel,
    };
    
    console.log('Request payload:', {
      submissionId: payload.submission_id,
      answerTextLength: payload.answer_text.length,
      rubricTextLength: payload.rubric_text.length,
      strictnessLevel: payload.strictness_level
    });
    
    const response = await fetch(`${apiBaseUrl}/api/grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000)
    });
    
    // Check if response is OK
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      } else {
        const errorText = await response.text();
        console.error('Non-JSON error response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
    }
    
    // Parse JSON response
    const result = await response.json();
    console.log('Grading result from API:', result);
    
    if (!result.score && result.score !== 0) {
      throw new Error('Invalid response from grading API: missing score');
    }
    
    // Update the submission with the grading result
    const { data, error } = await supabase
      .from('submissions')
      .update({
        score: result.score,
        feedback: result.feedback || '',
        total_points: result.total_points || 10
      })
      .eq('id', submissionId)
      .select();
    
    if (error) {
      console.error('Error updating submission with grade:', error);
      throw new Error(`Failed to update submission: ${error.message}`);
    }
    
    console.log('Updated submission in database:', data);
    
    return {
      score: result.score,
      feedback: result.feedback || '',
      total_points: result.total_points || 10
    };
  } catch (error) {
    console.error('Grading error:', error);
    throw error;
  }
}

// Add the deleteSubmission function to supabaseClient.ts

export async function deleteSubmission(submissionId: string): Promise<void> {
  try {
    console.log('Deleting submission:', submissionId);
    
    // First, check if the submission has an associated file in storage
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('script_file_url')
      .eq('id', submissionId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching submission for deletion:', fetchError);
      throw new Error(fetchError.message);
    }
    
    // If there's a file URL, extract the path and delete from storage
    if (submission?.script_file_url) {
      try {
        // Extract the path from the URL
        // The URL format is typically like: https://xxx.supabase.co/storage/v1/object/public/submissions/path/to/file
        const urlParts = submission.script_file_url.split('/');
        const bucketIndex = urlParts.indexOf('submissions');
        
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/');
          
          console.log('Deleting file from storage:', filePath);
          
          const { error: storageError } = await supabase
            .storage
            .from('submissions')
            .remove([filePath]);
          
          if (storageError) {
            console.warn('Error deleting file from storage:', storageError);
            // Continue with deletion even if file removal fails
          }
        }
      } catch (storageError) {
        console.warn('Error processing file deletion:', storageError);
        // Continue with deletion even if file removal fails
      }
    }
    
    // Delete the submission record
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submissionId);
    
    if (error) {
      console.error('Delete submission error:', error);
      throw new Error(error.message);
    }
    
    console.log('Submission deleted successfully');
  } catch (error) {
    console.error('Error in deleteSubmission:', error);
    throw error;
  }
} 