const loadStudentData = async () => {
  try {
    // Get the student_id from the auth response
    const authResponse = await apiRequest('auth/verify');
    console.log('[Debug] Auth response:', authResponse);
    
    // Use the student_id from the auth response, not the database id
    const studentData = await apiRequest(`students?student_id=${authResponse.student_id}`);
    console.log('[Debug] Student data:', studentData);
    
    if (!studentData) {
      throw new Error('Failed to load student data');
    }
    
    // Transform the data to match expected format
    const transformedData = {
      id: studentData.id,
      name: studentData.name,
      email: studentData.email,
      studentId: studentData.student_id
    };
    
    setStudentData(transformedData);
  } catch (error) {
    console.error('Error loading student data:', error);
    throw new Error('Failed to load student data');
  }
}; 