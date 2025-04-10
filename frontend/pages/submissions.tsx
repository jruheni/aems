import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box, Button, Container, Flex, FormControl, FormLabel, Heading, Input, Text, VStack,
  useToast, Link, useColorModeValue, Progress, Alert, AlertIcon, AlertDescription,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, ModalCloseButton, useDisclosure, Image, IconButton,
  Spinner, SimpleGrid, CircularProgress, CircularProgressLabel, Tooltip,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, HStack, Divider,
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow, StatGroup,
  Tabs, TabList, TabPanels, Tab, TabPanel, Icon, Card, CardHeader, CardBody, CardFooter,
  FormHelperText
} from '@chakra-ui/react';
import { DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import { 
  createSubmission, 
  getSubmissions, 
  gradeSubmission,
  deleteSubmission,
  Submission,
  getRubric,
  supabase,
  uploadRubric,
  Rubric as SupabaseRubric
} from '../src/services/supabaseClient';
import { extractTextFromImage } from '../src/services/ocrService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { FaChartBar, FaChartPie, FaUserGraduate, FaCheck, FaTimes, FaExclamationTriangle, FaUpload, FaEdit, FaFileAlt, FaTrash, FaArrowLeft } from 'react-icons/fa';
import Header from '../components/Header';
import { customColors, getGradients } from '../src/theme/colors';
import { apiRequest, getApiUrl } from '../src/utils/api';
import path from 'path';
// import { Submission } from '../types/submission';

interface SubmissionData {
  id: string;
  student_name: string;
  student_id?: string;
  script_file_url: string;
  script_file_name: string;
  created_at: string;
  score: number | null;
  total_points: number | null;
  extracted_text_script?: string;
  extracted_text_rubric?: string;
  image_url?: string;
  feedback?: string;
  // other properties...
}

interface RubricResponse {
  id: string;
  exam_id: string | null;
  file_name: string | null;
  content: string | null;
  preview: string | null;
  created_at: string | null;
  file_url?: string;
  file_type?: string;
  file_size?: number;
}

interface Rubric {
  id: string;
  exam_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  preview?: string;
  created_at?: string;
  content?: string;
  image_url: string;
}

const SubmissionsPage: React.FC = () => {
  const router = useRouter();
  const { examId, examName } = router.query;
  const [file, setFile] = useState<File | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionData | null>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<SubmissionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rubricContent, setRubricContent] = useState<string | null>(null);
  const [rubricImageUrl, setRubricImageUrl] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isScoreOpen,
    onOpen: onScoreOpen,
    onClose: onScoreClose
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose
  } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const [analyticsData, setAnalyticsData] = useState<{
    totalSubmissions: number;
    gradedSubmissions: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    scoreDistribution: { range: string; count: number; color: string }[];
    passingRate: number;
  }>({
    totalSubmissions: 0,
    gradedSubmissions: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 10,
    scoreDistribution: [],
    passingRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen: isRubricOpen, onOpen: onRubricOpen, onClose: onRubricClose } = useDisclosure();
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [isUploadingRubric, setIsUploadingRubric] = useState(false);
  const [rubricUploadProgress, setRubricUploadProgress] = useState(0);
  const [rubricError, setRubricError] = useState('');
  const [isUpdatingRubric, setIsUpdatingRubric] = useState(false);
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Simple analytics
  const analytics = {
    totalSubmissions: submissions.length,
    gradedSubmissions: submissions.filter(s => s.score !== null && s.score !== undefined).length,
    averageScore: submissions.length > 0 
      ? submissions
          .filter(s => s.score !== null && s.score !== undefined)
          .reduce((sum, s) => sum + (s.score || 0), 0) / 
            (submissions.filter(s => s.score !== null && s.score !== undefined).length || 1)
      : 0,
    scoreDistribution: {
      excellent: submissions.filter(s => {
        const score = s.score || 0;
        const totalPoints = s.total_points || 10;
        return (score / totalPoints) * 100 >= 90;
      }).length,
      good: submissions.filter(s => {
        const score = s.score || 0;
        const totalPoints = s.total_points || 10;
        const percentage = (score / totalPoints) * 100;
        return percentage >= 80 && percentage < 90;
      }).length,
      average: submissions.filter(s => {
        const score = s.score || 0;
        const totalPoints = s.total_points || 10;
        const percentage = (score / totalPoints) * 100;
        return percentage >= 70 && percentage < 80;
      }).length,
      belowAverage: submissions.filter(s => {
        const score = s.score || 0;
        const totalPoints = s.total_points || 10;
        const percentage = (score / totalPoints) * 100;
        return percentage >= 60 && percentage < 70;
      }).length,
      poor: submissions.filter(s => {
        const score = s.score || 0;
        const totalPoints = s.total_points || 10;
        return (score / totalPoints) * 100 < 60;
      }).length
    }
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUsername = localStorage.getItem('username');
    
    if (!storedUserId || !storedUsername) {
      router.replace('/login');
      return;
    }
    
    // Add an auth check using the cookie
    apiRequest('auth/verify')
      .then((userData: { id: string; username: string; user_type: string }) => {
        console.log('[Debug] Auth verification successful:', userData);
        // If we have examId in the query, load the submissions
        if (router.query.examId) {
          loadSubmissions(router.query.examId as string);
        }
      })
      .catch((error: Error) => {
        console.log('[Debug] Auth verification error:', error);
        // Only redirect to login for authentication errors
        if (error.message === 'Authentication required') {
          console.log('[Debug] Authentication required, redirecting to login');
          router.replace('/login');
        } else {
          // For other errors, just show a toast and continue
          toast({
            title: 'Error',
            description: error.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          // Still try to load submissions if we have an examId
          if (router.query.examId) {
            loadSubmissions(router.query.examId as string);
          }
        }
      });
  }, [router.query.examId]); // Add router.query.examId as a dependency

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUsername(localStorage.getItem('username') || '');
    }
  }, []);

  // Add useEffect to load rubric when page loads or exam ID changes
  useEffect(() => {
    const loadInitialData = async () => {
      if (router.query.examId) {
        try {
          // Load submissions
          await loadSubmissions(router.query.examId as string);
          
          // Load rubric
          const rubricData = await loadRubric(router.query.examId as string);
          if (rubricData) {
            console.log('[Debug] Loaded initial rubric:', rubricData);
            setRubricImageUrl(rubricData.file_url || null);
            setRubricContent(rubricData.content || null);
          }
        } catch (error) {
          console.error('[Debug] Error loading initial data:', error);
          toast({
            title: 'Error',
            description: 'Failed to load exam data',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      }
    };

    loadInitialData();
  }, [router.query.examId]); // Dependency on examId ensures reload when exam changes

  const loadSubmissions = async (examId: string) => {
    setIsLoading(true);
    try {
      console.log('[Debug] Loading submissions for exam:', examId);
      const data = await apiRequest(`submissions?exam_id=${examId}`);
      console.log('[Debug] Submissions loaded successfully:', data);
      
      // Transform the data if needed to match your SubmissionData interface
      const transformedSubmissions = data.map((submission: any) => ({
        id: submission.id,
        student_name: submission.student_name,
        student_id: submission.student_id,
        script_file_url: submission.script_file_url,
        script_file_name: submission.script_file_name,
        created_at: submission.created_at,
        score: submission.score,
        total_points: submission.total_points,
        extracted_text_script: submission.extracted_text_script,
        image_url: submission.image_url,
        feedback: submission.feedback
      }));
      
      setSubmissions(transformedSubmissions);
      
      // Calculate analytics after loading submissions
      calculateAnalytics(transformedSubmissions);
    } catch (error) {
      console.error('[Debug] Error loading submissions:', error);
      // Don't redirect, just show error toast
        toast({
          title: 'Error loading submissions',
        description: error instanceof Error ? error.message : 'Failed to load submissions',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRubric = async (examId: string): Promise<RubricResponse | null> => {
    try {
      console.log('[Debug] Loading rubric for exam:', examId);
      const rubricData = await getRubric(examId);
      
      if (rubricData) {
        console.log('[Debug] Rubric data received:', rubricData);
        // Transform the data to match our Rubric interface
        const transformedRubric: Rubric = {
          id: rubricData.id,
          file_name: rubricData.file_name || '',
          file_type: rubricData.file_type || '',
          image_url: rubricData.file_url || '', // Use file_url instead of image_url
          exam_id: examId,
          content: rubricData.content || undefined,
          preview: rubricData.preview || undefined,
          created_at: rubricData.created_at || undefined,
          file_size: rubricData.file_size || 0
        };
        
        setRubric(transformedRubric);
        setRubricImageUrl(rubricData.file_url || null);
        setRubricContent(rubricData.content || null);
        
        return rubricData; // Return the full rubricData object
      }
      console.log('[Debug] No rubric found for exam:', examId);
      
      // Clear rubric state if none found
      setRubric(null);
      setRubricImageUrl(null);
      setRubricContent(null);
      
      return null;
    } catch (error) {
      console.error('[Debug] Error loading rubric:', error);
      setError(error instanceof Error ? error.message : 'Failed to load rubric');
      return null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[Debug] File selected:', file);
      setFile(file);
    }
  };

  const handleRubricUpload = async () => {
    try {
      if (!file) {
        toast({
          title: 'Error',
          description: 'Please select a file to upload',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const examId = router.query.examId as string;
      console.log('[Debug] Uploading rubric for exam_id:', examId);

      // First upload to Supabase Storage
      const fileName = `${Date.now()}_rubric${path.extname(file.name)}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('rubrics')
        .upload(`rubrics/${fileName}`, file);

      if (storageError) {
        console.error('[Debug] Storage upload error:', storageError);
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      console.log('[Debug] File uploaded to storage:', storageData);

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('rubrics')
        .getPublicUrl(`rubrics/${fileName}`);

      const imageUrl = publicUrlData.publicUrl;
      console.log('[Debug] Generated public URL:', imageUrl);

      // Process OCR
      const ocrFormData = new FormData();
      ocrFormData.append('file', file);

      console.log('[Debug] Processing OCR...');
      const ocrResponse = await fetch(getApiUrl('api/ocr/extract-text'), {
        method: 'POST',
        body: ocrFormData,
      });

      if (!ocrResponse.ok) {
        throw new Error('Failed to process OCR');
      }

      const ocrResult = await ocrResponse.json();
      const extractedText = ocrResult.text;
      console.log('[Debug] OCR text extracted:', extractedText?.substring(0, 100) + '...');

      // Create the rubric metadata
      const rubricMetadata = {
        file_name: fileName,
        file_type: file.type,
        file_size: file.size,
        image_url: imageUrl,
        exam_id: examId,
        content: extractedText
      };

      console.log('[Debug] Sending rubric metadata:', rubricMetadata);

      // Make the API request
      const response = await apiRequest('api/rubrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rubricMetadata),
      });

      console.log('[Debug] API response:', response);

      toast({
        title: 'Success',
        description: 'Rubric uploaded successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Refresh the rubric display
      if (router.query.examId) {
        loadRubric(router.query.examId as string);
      }

      // Clear the file input
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Close the modal
      onRubricClose();

    } catch (error) {
      console.error('Error uploading rubric:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload rubric',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSubmissionUpload = async () => {
    if (!file || !studentName.trim() || !studentId) {
      toast({
        title: 'Missing required fields',
        description: 'Please select a file and enter student name and ID',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress(0); // Reset progress
    
    try {
      // Get the current user's ID from localStorage
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // --- Step 1: Call OCR Endpoint --- 
      console.log('[Debug] Step 1: Uploading file for OCR extraction...');
      const ocrFormData = new FormData();
      ocrFormData.append('file', file);

      const ocrResponse = await fetch(getApiUrl('api/ocr/extract-text'), {
        method: 'POST',
        body: ocrFormData,
        // Add any necessary headers if required by your API, e.g., for authentication
      });

      setUploadProgress(50); // Indicate progress after OCR call attempt

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.json();
        console.error('[Debug] OCR API Error:', errorData);
        throw new Error(errorData.error || 'Failed to extract text from file');
      }

      const ocrResult = await ocrResponse.json();
      const extractedTextScript = ocrResult.text;

      if (!extractedTextScript) {
        console.error('[Debug] OCR Result:', ocrResult);
        throw new Error('OCR process did not return any text.');
      }
      console.log('[Debug] Step 1 complete: Text extracted successfully.');

      // --- Step 2: Call Create Submission Endpoint --- 
      console.log('[Debug] Step 2: Creating submission entry...');
      const submissionPayload = {
        exam_id: examId,
        student_name: studentName,
        student_id: studentId,
        created_by: userId,
        script_file_name: file.name, // Send original filename
        extracted_text_script: extractedTextScript // Send extracted text
      };
      
      const createSubmissionResponse = await apiRequest('api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload),
      });
      
      setUploadProgress(100); // Indicate completion
      console.log('[Debug] Step 2 complete: Submission created.', createSubmissionResponse);

      toast({
        title: 'Upload successful',
        description: `${studentName}'s submission has been processed and saved.`, // Updated message
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reload submissions
      await loadSubmissions(examId as string);
      
      // Close the modal
      onClose();
      
      // Reset state
      setFile(null);
      setStudentName('');
      setStudentId('');
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear file input
      }
      
    } catch (error) {
      console.error('[Debug] Error during submission process:', error);
      setError(error instanceof Error ? error.message : 'Failed to process submission');
      toast({ // Add toast for errors as well
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0); // Reset progress on finish/error
    }
  };

  const handleViewSubmission = async (submission: SubmissionData) => {
    console.log('Viewing submission:', submission);
    setSelectedSubmission(submission);
    onScoreOpen();
    
    // Check if the submission needs grading
    if (submission.score === null || submission.score === undefined) {
      console.log('Submission needs grading, starting automated grading process');
      setIsGrading(true);
      
      try {
        // Make sure we have the exam ID
        if (!examId) {
          console.error('No exam ID available');
          toast({
            title: 'Cannot grade submission',
            description: 'Missing exam information',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          setIsGrading(false);
          return;
        }

        // Call the grading API with the submission ID
        const result = await gradeSubmission(
          submission.id,  // Pass the submission ID here
          submission.extracted_text_script || '',
          submission.extracted_text_rubric || '',  // Use the stored rubric text
          2 // Default strictness level
        );
        
        // Update the local state with the grading result
        setSelectedSubmission({
          ...submission,
          score: result.score,
          feedback: result.feedback,
          total_points: result.total_points,
          extracted_text_script: submission.extracted_text_script // Ensure we keep the extracted text
        });
        
        // Refresh the submissions list to show updated scores
        if (examId) {
          await loadSubmissions(examId as string);
        }
        
        toast({
          title: 'Grading complete',
          description: `Score: ${result.score}/${result.total_points || 10}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Grading error:', error);
        toast({
          title: 'Grading failed',
          description: error instanceof Error ? error.message : 'Failed to grade submission',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsGrading(false);
      }
    } else {
      console.log('Submission already graded:', submission);
    }
  };

  const handleDeleteClick = (submission: SubmissionData) => {
    setSubmissionToDelete(submission);
    onDeleteOpen();
  };

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    
    setIsDeleting(true);
    
    try {
      await deleteSubmission(submissionToDelete.id);
      
      // Refresh submissions list
      if (examId) {
        await loadSubmissions(examId as string);
      }
      
      toast({
        title: 'Submission deleted',
        description: `${submissionToDelete.student_name}'s submission has been deleted`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onDeleteClose();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete submission',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
      setSubmissionToDelete(null);
    }
  };

  const calculateAnalytics = (submissions: SubmissionData[]) => {
    if (!submissions || submissions.length === 0) {
      return;
    }
    
    const gradedSubmissions = submissions.filter(s => s.score !== null && s.score !== undefined);
    const scores = gradedSubmissions.map(s => s.score as number);
    
    // Calculate basic statistics
    const totalSubmissions = submissions.length;
    const totalGraded = gradedSubmissions.length;
    const avgScore = totalGraded > 0 ? scores.reduce((a, b) => a + b, 0) / totalGraded : 0;
    const highestScore = totalGraded > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalGraded > 0 ? Math.min(...scores) : 0;
    
    // Calculate passing rate (score >= 6)
    const passingSubmissions = gradedSubmissions.filter(s => (s.score as number) >= 6).length;
    const passingRate = totalGraded > 0 ? (passingSubmissions / totalGraded) * 100 : 0;
    
    // Calculate score distribution
    const ranges = [
      { range: '0-2', min: 0, max: 2, color: '#FF5252' },
      { range: '3-5', min: 3, max: 5, color: '#FFA726' },
      { range: '6-8', min: 6, max: 8, color: '#66BB6A' },
      { range: '9-10', min: 9, max: 10, color: '#2196F3' }
    ];
    
    const distribution = ranges.map(range => {
      const count = gradedSubmissions.filter(
        s => (s.score as number) >= range.min && (s.score as number) <= range.max
      ).length;
      return { ...range, count };
    });
    
    setAnalyticsData({
      totalSubmissions,
      gradedSubmissions: totalGraded,
      averageScore: parseFloat(avgScore.toFixed(2)),
      highestScore,
      lowestScore,
      scoreDistribution: distribution,
      passingRate: parseFloat(passingRate.toFixed(2))
    });
  };

  const AnalyticsSection = () => {
    const cardBg = useColorModeValue('white', 'gray.700');
    const statCardBg = useColorModeValue('gray.50', 'gray.800');
    const textColor = useColorModeValue('gray.800', 'white');
    const subTextColor = useColorModeValue('gray.600', 'gray.300');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const chartColors = {
      failing: useColorModeValue('#FF5252', '#FF7373'),
      poor: useColorModeValue('#FFA726', '#FFB74D'),
      good: useColorModeValue('#66BB6A', '#81C784'),
      excellent: useColorModeValue('#2196F3', '#64B5F6'),
      grid: useColorModeValue('#E0E0E0', '#4A5568'),
      text: useColorModeValue('#333333', '#E2E8F0')
    };

    return (
      <Box mb={8}>
        <Card bg={cardBg} borderRadius="lg" boxShadow="md" mb={6} borderWidth="1px" borderColor={borderColor}>
          <CardHeader pb={0}>
            <Heading size="md" color={textColor}>Submission Analytics</Heading>
            <Text color={subTextColor} fontSize="sm" mt={1}>
              Overview of all submissions for this exam
            </Text>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4} mb={6}>
              <Stat bg={statCardBg} p={4} borderRadius="md" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
                <StatLabel color={subTextColor}>Total Submissions</StatLabel>
                <Flex align="center">
                  <StatNumber color={textColor}>{analyticsData.totalSubmissions}</StatNumber>
                  <Icon as={FaUserGraduate} ml={2} color="blue.400" />
                </Flex>
                <StatHelpText mb={0} color={subTextColor}>
                  {analyticsData.totalSubmissions > 0 ? `${analyticsData.gradedSubmissions} graded` : 'No submissions yet'}
                </StatHelpText>
              </Stat>
              
              <Stat bg={statCardBg} p={4} borderRadius="md" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
                <StatLabel color={subTextColor}>Average Score</StatLabel>
                <Flex align="center">
                  <StatNumber color={textColor}>
                    {analyticsData.averageScore.toFixed(1)}
                  </StatNumber>
                  <Text ml={1} fontSize="lg" color={subTextColor}>/10</Text>
                </Flex>
                <StatHelpText mb={0}>
                  <StatArrow 
                    type={analyticsData.averageScore >= 7 ? 'increase' : 'decrease'} 
                    color={analyticsData.averageScore >= 7 ? 'green.400' : 'red.400'}
                  />
                  {analyticsData.averageScore >= 7 ? 'Above target' : 'Below target'}
                </StatHelpText>
              </Stat>
              
              <Stat bg={statCardBg} p={4} borderRadius="md" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
                <StatLabel color={subTextColor}>Highest Score</StatLabel>
                <Flex align="center">
                  <StatNumber color={textColor}>{analyticsData.highestScore}</StatNumber>
                  <Text ml={1} fontSize="lg" color={subTextColor}>/10</Text>
                </Flex>
                <StatHelpText mb={0} color={subTextColor}>
                  <Icon as={FaCheck} color="green.400" mr={1} />
                  Top performance
                </StatHelpText>
              </Stat>
              
              <Stat bg={statCardBg} p={4} borderRadius="md" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
                <StatLabel color={subTextColor}>Passing Rate</StatLabel>
                <Flex align="center">
                  <StatNumber color={textColor}>{analyticsData.passingRate}%</StatNumber>
                  <Icon 
                    as={analyticsData.passingRate >= 70 ? FaCheck : FaExclamationTriangle} 
                    ml={2} 
                    color={analyticsData.passingRate >= 70 ? 'green.400' : 'yellow.400'} 
                  />
                </Flex>
                <StatHelpText mb={0}>
                  <StatArrow 
                    type={analyticsData.passingRate >= 70 ? 'increase' : 'decrease'} 
                    color={analyticsData.passingRate >= 70 ? 'green.400' : 'red.400'}
                  />
                  {analyticsData.passingRate >= 70 ? 'Good' : 'Needs improvement'}
                </StatHelpText>
              </Stat>
            </SimpleGrid>
            
            <Tabs variant="soft-rounded" colorScheme="blue">
              <TabList>
                <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
                  <Icon as={FaChartBar} mr={2} /> Score Distribution
                </Tab>
                <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
                  <Icon as={FaChartPie} mr={2} /> Pass/Fail Ratio
                </Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel px={0}>
                  <Card bg={cardBg} borderRadius="md" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
                    <CardBody>
                      <Box height="300px">
                        {analyticsData.gradedSubmissions > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={analyticsData.scoreDistribution}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                              <XAxis 
                                dataKey="range" 
                                tick={{ fill: chartColors.text }}
                                axisLine={{ stroke: chartColors.grid }}
                              />
                              <YAxis 
                                tick={{ fill: chartColors.text }}
                                axisLine={{ stroke: chartColors.grid }}
                              />
                              <RechartsTooltip 
                                formatter={(value: number, name: string) => [`${value} submissions`, 'Count']}
                                labelFormatter={(label: string) => `Score range: ${label}`}
                                contentStyle={{ 
                                  backgroundColor: cardBg, 
                                  borderColor: borderColor,
                                  color: textColor
                                }}
                              />
                              <Legend 
                                formatter={(value) => <span style={{ color: chartColors.text }}>{value}</span>}
                              />
                              <Bar 
                                dataKey="count" 
                                name="Submissions" 
                                radius={[4, 4, 0, 0]}
                              >
                                {analyticsData.scoreDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <Flex height="100%" alignItems="center" justifyContent="center">
                            <Text color={subTextColor}>No graded submissions yet</Text>
                          </Flex>
                        )}
                      </Box>
                    </CardBody>
                  </Card>
                </TabPanel>
                
                <TabPanel px={0}>
                  <Card bg={cardBg} borderRadius="md" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
                    <CardBody>
                      <Box height="300px">
                        {analyticsData.gradedSubmissions > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Passing', value: analyticsData.passingRate, color: chartColors.good },
                                  { name: 'Failing', value: 100 - analyticsData.passingRate, color: chartColors.failing }
                                ]}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }: { name: string; percent: number }) => 
                                  `${name}: ${(percent * 100).toFixed(0)}%`
                                }
                              >
                                {[
                                  { name: 'Passing', value: analyticsData.passingRate, color: chartColors.good },
                                  { name: 'Failing', value: 100 - analyticsData.passingRate, color: chartColors.failing }
                                ].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip 
                                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']}
                                contentStyle={{ 
                                  backgroundColor: cardBg, 
                                  borderColor: borderColor,
                                  color: textColor
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <Flex height="100%" alignItems="center" justifyContent="center">
                            <Text color={subTextColor}>No graded submissions yet</Text>
                          </Flex>
                        )}
                      </Box>
                    </CardBody>
                  </Card>
                </TabPanel>
              </TabPanels>
            </Tabs>
            
            {/* Additional Analytics */}
            {analyticsData.gradedSubmissions > 0 && (
              <Box mt={6}>
                <Heading size="sm" mb={3} color={textColor}>Score Distribution</Heading>
                <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                  {analyticsData.scoreDistribution.map((range, index) => (
                    <Box 
                      key={index} 
                      p={3} 
                      borderRadius="md" 
                      bg={statCardBg}
                      borderWidth="1px"
                      borderColor={borderColor}
                    >
                      <Flex justify="space-between" align="center" mb={2}>
                        <Text fontWeight="medium" color={textColor}>Range {range.range}</Text>
                        <Badge 
                          colorScheme={
                            range.range === '0-2' ? 'red' : 
                            range.range === '3-5' ? 'orange' : 
                            range.range === '6-8' ? 'green' : 'blue'
                          }
                          borderRadius="full"
                        >
                          {range.count} students
                        </Badge>
                      </Flex>
                      <Progress 
                        value={(range.count / analyticsData.totalSubmissions) * 100} 
                        size="sm" 
                        colorScheme={
                          range.range === '0-2' ? 'red' : 
                          range.range === '3-5' ? 'orange' : 
                          range.range === '6-8' ? 'green' : 'blue'
                        }
                        borderRadius="full"
                      />
                      <Text fontSize="xs" mt={1} color={subTextColor}>
                        {((range.count / analyticsData.totalSubmissions) * 100).toFixed(1)}% of total
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            )}
          </CardBody>
        </Card>
      </Box>
    );
  };

  const RubricSection = () => {
    const cardBg = useColorModeValue('white', 'gray.700');
    const textColor = useColorModeValue('gray.800', 'white');
    const subTextColor = useColorModeValue('gray.600', 'gray.300');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const previewBg = useColorModeValue('gray.50', 'gray.800');

    return (
      <Card bg={cardBg} borderRadius="lg" boxShadow="md" mb={6}>
        <CardHeader>
          <Flex justify="space-between" align="center">
            <Box>
              <Heading size="md" color={textColor}>Exam Rubric</Heading>
              <Text color={subTextColor} fontSize="sm" mt={1}>
                Grading criteria for this exam
              </Text>
            </Box>
          </Flex>
        </CardHeader>
        <CardBody>
          {rubric ? (
            <Box>
              <Text fontWeight="medium" mb={2} color={textColor}>
                Rubric: {rubric.file_name || 'Unnamed rubric'}
              </Text>
              
              <Box borderWidth="1px" borderRadius="md" borderColor={borderColor} overflow="hidden">
                {rubric.image_url ? (
                  <Box textAlign="center" p={4}>
                    <Image 
                      src={rubric.image_url} 
                      alt="Rubric" 
                      maxH="400px" 
                      mx="auto"
                    />
                  </Box>
                ) : (
                  <Box 
                    p={4} 
                    textAlign="center"
                    color={textColor}
                  >
                    {rubric.content || 'No preview available'}
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            <Flex 
              direction="column" 
              align="center" 
              justify="center" 
              p={8} 
              borderWidth="2px" 
              borderRadius="md" 
              borderStyle="dashed"
              borderColor={borderColor}
            >
              <Icon as={FaFileAlt} boxSize={12} color="blue.400" mb={4} />
              <Text color={textColor} mb={2}>No rubric uploaded yet</Text>
              <Text color={subTextColor} fontSize="sm" mb={4} textAlign="center">
                Upload a rubric to help with grading submissions
              </Text>
              <Button 
                leftIcon={<FaUpload />} 
                colorScheme="blue"
                onClick={onRubricOpen}
              >
                Upload Rubric
              </Button>
            </Flex>
          )}
        </CardBody>
      </Card>
    );
  };

  return (
    <Box p={5}>
      <Header 
        currentPage="submissions" 
        username={username}
        userRole="teacher"
      />
      <Container maxW="container.xl" mt="16">
        <Box mb={6}>
          <Flex justify="space-between" align="center" mb={4}>
            <HStack spacing={4}>
              <Button 
                leftIcon={<FaArrowLeft />} 
                variant="outline" 
                onClick={() => router.push('/dashboard')}
                size="sm"
              >
                Back to Dashboard
              </Button>
              <Heading size="lg">{examName}</Heading>
            </HStack>
            <HStack spacing={2}>
              <Button 
                colorScheme="blue" 
                onClick={onRubricOpen}
                leftIcon={<FaUpload />}
                size="sm"
              >
                {rubric ? 'Update Rubric' : 'Upload Rubric'}
              </Button>
              <Button
                colorScheme="green"
                onClick={onOpen}
                leftIcon={<FaUpload />}
                size="sm"
              >
                Upload Submission
              </Button>
            </HStack>
          </Flex>
          <Text color="gray.500" mb={4}>
            {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'} • 
            {analyticsData.gradedSubmissions} graded • 
            {submissions.length - analyticsData.gradedSubmissions} pending
          </Text>
        </Box>
        
        {!isLoading && (
          <>
            <RubricSection />
            {submissions.length > 0 && <AnalyticsSection />}
          </>
        )}
        
        {/* Submissions Table */}
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Student</Th>
                <Th>Student ID</Th>
                <Th>File</Th>
                <Th>Submitted</Th>
                <Th>Score</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {submissions.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={4}>
                    No submissions yet
                  </Td>
                </Tr>
              ) : (
                submissions.map(submission => (
                  <Tr key={submission.id}>
                    <Td>{submission.student_name}</Td>
                    <Td>{submission.student_id || 'N/A'}</Td>
                    <Td>{submission.script_file_name}</Td>
                    <Td>{submission.created_at ? new Date(submission.created_at).toLocaleString() : 'N/A'}</Td>
                    <Td>
                      {submission.score !== null && submission.score !== undefined ? (
                        <Badge colorScheme={
                          submission.score >= 7 ? 'green' : 
                          submission.score >= 5 ? 'yellow' : 'red'
                        }>
                          {submission.score} / {submission.total_points || 10}
                        </Badge>
                      ) : (
                        <Badge colorScheme="gray">Not graded</Badge>
                      )}
                    </Td>
                    <Td>
                      <Flex>
                        <Tooltip label="View/Grade">
                          <IconButton
                            aria-label="View submission"
                            icon={<ViewIcon />}
                            size="sm"
                            mr={2}
                            onClick={() => handleViewSubmission(submission)}
                          />
                        </Tooltip>
                        <Tooltip label="Delete">
                          <IconButton
                            aria-label="Delete submission"
                            icon={<DeleteIcon />}
                            size="sm"
                            colorScheme="red"
                            onClick={() => handleDeleteClick(submission)}
                          />
                        </Tooltip>
                      </Flex>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      </Container>
      
      {/* Upload Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Upload Submission</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Student Name</FormLabel>
                <Input 
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student name"
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Student ID</FormLabel>
                <Input 
                  type="text" 
                  placeholder="Enter 6-digit student ID" 
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  maxLength={6}
                  pattern="[0-9]{6}"
                />
                <FormHelperText>
                  Enter the 6-digit student ID associated with this exam script
                </FormHelperText>
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Submission File</FormLabel>
                <Input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  display="none"
                  ref={fileInputRef}
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Accepted formats: .txt, .pdf, .doc, .docx, .jpg, .jpeg, .png
                </Text>
              </FormControl>
              
              {error && (
                <Alert status="error">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {isUploading && (
                <Box w="100%">
                  <Text mb={2}>Uploading: {uploadProgress}%</Text>
                  <Progress value={uploadProgress} size="sm" colorScheme="blue" />
                </Box>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSubmissionUpload}
              isLoading={isUploading}
              loadingText="Uploading"
              isDisabled={!file || !studentName.trim() || !studentId || isUploading}
            >
              Upload
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* View/Grade Modal */}
      <Modal isOpen={isScoreOpen} onClose={onScoreClose} size="xl">
        <ModalOverlay />
        <ModalContent maxW="900px">
          <ModalHeader>
            {selectedSubmission?.student_name}'s Submission
            {isGrading && <Spinner size="sm" ml={2} />}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <Flex direction={{ base: 'column', lg: 'row' }} gap={6}>
                {/* Left side - Submission */}
                <Box flex="1" borderWidth={1} borderRadius="md" p={4}>
                  <Heading size="md" mb={4}>Student Submission</Heading>
                  
                  {selectedSubmission?.script_file_url ? (
                    <Box textAlign="center">
                      <Image 
                        src={selectedSubmission.script_file_url} 
                        alt="Submission" 
                        maxH="500px" 
                        mx="auto"
                        borderRadius="md"
                      />
                    </Box>
                  ) : (
                    <Box 
                      p={4} 
                      borderWidth={1} 
                      borderRadius="md" 
                      bg={useColorModeValue('gray.50', 'gray.800')}
                      maxH="500px"
                      overflowY="auto"
                      whiteSpace="pre-wrap"
                      fontFamily="monospace"
                      fontSize="sm"
                    >
                      {selectedSubmission?.extracted_text_script || 'No content available'}
                    </Box>
                  )}
                </Box>
                
                {/* Right side - Rubric */}
                <Box flex="1" borderWidth={1} borderRadius="md" p={4}>
                  <Heading size="md" mb={4}>Rubric</Heading>
                  
                  {rubricImageUrl ? (
                    <Box textAlign="center">
                      <Image 
                        src={rubricImageUrl} 
                        alt="Rubric" 
                        maxH="500px" 
                        mx="auto"
                        borderRadius="md"
                      />
                    </Box>
                  ) : (
                    <Box 
                      p={4} 
                      borderWidth={1} 
                      borderRadius="md" 
                      bg={useColorModeValue('gray.50', 'gray.800')}
                      maxH="500px"
                      overflowY="auto"
                      whiteSpace="pre-wrap"
                      fontFamily="monospace"
                      fontSize="sm"
                    >
                      {rubricContent || 'No rubric content available'}
                    </Box>
                  )}
                </Box>
              </Flex>
              
              {/* Grading Results Section */}
              {selectedSubmission && (selectedSubmission.score !== null && selectedSubmission.score !== undefined) ? (
                <Box borderWidth={1} borderRadius="md" p={4}>
                  <Heading size="md" mb={4}>Grading Results</Heading>
                  
                  <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
                    <Box flex="1" p={4} borderWidth={1} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.800')}>
                      <Heading size="sm" mb={2}>Score</Heading>
                      <Text fontSize="3xl" fontWeight="bold" color={
                        selectedSubmission.score >= 7 ? 'green.500' : 
                        selectedSubmission.score >= 5 ? 'yellow.500' : 'red.500'
                      }>
                        {selectedSubmission.score} / {selectedSubmission.total_points || 10}
                      </Text>
                      <Text color="gray.500">
                        {Math.round((selectedSubmission.score / (selectedSubmission.total_points || 10)) * 100)}%
                      </Text>
                    </Box>
                    
                    <Box flex="3" p={4} borderWidth={1} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.800')}>
                      <Heading size="sm" mb={2}>Feedback</Heading>
                      <Text whiteSpace="pre-wrap">
                        {selectedSubmission.feedback || 'No feedback provided'}
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              ) : (
                <Box borderWidth={1} borderRadius="md" p={4} textAlign="center">
                  {isGrading ? (
                    <VStack spacing={4}>
                      <Spinner size="xl" />
                      <Text>Grading submission...</Text>
                    </VStack>
                  ) : (
                    <Text>This submission has not been graded yet.</Text>
                  )}
                </Box>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" onClick={onScoreClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Submission
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {submissionToDelete?.student_name}'s submission? 
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteSubmission} 
                ml={3}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      
      {/* Rubric Upload Modal */}
      <Modal isOpen={isRubricOpen} onClose={onRubricClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{rubric ? 'Update Rubric' : 'Upload Rubric'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <FormControl>
                <FormLabel>Upload Rubric</FormLabel>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  display="none"
                  ref={fileInputRef}
                />
              </FormControl>
              
              <Button onClick={() => fileInputRef.current?.click()}>
                Select Rubric File
              </Button>
              
              {file && (
                <Text>Selected file: {file.name}</Text>
              )}
              
              {isUploading && (
                <Box w="100%">
                  <Progress value={uploadProgress} size="sm" colorScheme="blue" borderRadius="md" />
                  <Text mt={2} fontSize="sm" textAlign="center">
                    Uploading... {uploadProgress}%
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRubricClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleRubricUpload}
              isLoading={isUploading}
              loadingText="Uploading"
              isDisabled={!file || isUploading}
            >
              {rubric ? 'Update' : 'Upload'} Rubric
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SubmissionsPage; 