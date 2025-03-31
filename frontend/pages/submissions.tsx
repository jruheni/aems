import React, { useState, useEffect } from 'react';
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
  Rubric
} from '../src/services/supabaseClient';
import { extractTextFromImage } from '../src/services/ocrService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { FaChartBar, FaChartPie, FaUserGraduate, FaCheck, FaTimes, FaExclamationTriangle, FaUpload, FaEdit, FaFileAlt, FaTrash, FaArrowLeft } from 'react-icons/fa';
import Header from '../components/Header';
import { customColors, getGradients } from '../src/theme/colors';
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
  image_url?: string;
  feedback?: string;
  // other properties...
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
  const [isLoading, setIsLoading] = useState(false);
  const { isOpen: isRubricOpen, onOpen: onRubricOpen, onClose: onRubricClose } = useDisclosure();
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [isUploadingRubric, setIsUploadingRubric] = useState(false);
  const [rubricUploadProgress, setRubricUploadProgress] = useState(0);
  const [rubricError, setRubricError] = useState('');
  const [isUpdatingRubric, setIsUpdatingRubric] = useState(false);

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
    
    if (!storedUserId) {
      router.push('/login');
      return;
    }
    
    setUserId(storedUserId);
    
    if (examId) {
      loadSubmissions(examId as string);
      loadRubric(examId as string);
    }
  }, [router, examId]);

  const loadSubmissions = async (examId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading submissions:', error);
        toast({
          title: 'Error loading submissions',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      console.log('Loaded submissions:', data);
      setSubmissions(data || []);
      
      // Calculate analytics after loading submissions
      calculateAnalytics(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRubric = async (examId: string) => {
    try {
      const rubric = await getRubric(examId);
      setRubric(rubric);
      
      // If rubric has content, set it
      if (rubric?.content) {
        setRubricContent(rubric.content);
      }
      
      // If rubric has image URL, set it
      if (rubric?.image_url) {
        setRubricImageUrl(rubric.image_url);
      }
      
      return rubric?.content || '';
    } catch (error) {
      console.error('Error loading rubric:', error);
      return '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file type
      const isTextFile = selectedFile.type.includes('text/') || 
                         selectedFile.name.endsWith('.txt');
      const isPdfFile = selectedFile.type.includes('application/pdf') || 
                        selectedFile.name.endsWith('.pdf');
      const isImageFile = selectedFile.type.includes('image/jpeg') || 
                          selectedFile.type.includes('image/jpg') || 
                          selectedFile.type.includes('image/png') ||
                          selectedFile.name.match(/\.(jpeg|jpg|png)$/i);
      
      if (!isTextFile && !isPdfFile && !isImageFile) {
        setError('Please upload a text, PDF, or image file (JPEG, JPG, PNG)');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleRubricUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!examId || !userId) {
      setError('Missing exam information');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      // Determine file type
      let fileType = '';
      if (file.type.includes('text/') || file.name.endsWith('.txt')) {
        fileType = 'text';
      } else if (file.type.includes('application/pdf') || file.name.endsWith('.pdf')) {
        fileType = 'pdf';
      } else if (file.type.includes('image/') || file.name.match(/\.(jpeg|jpg|png)$/i)) {
        fileType = 'image';
      } else {
        fileType = 'other';
      }
      
      // Get file size in bytes
      const fileSize = file.size;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${examId}_rubric_${Date.now()}.${fileExt}`;
      const filePath = fileName;
      
      // Use the existing 'rubrics' bucket
      const bucketName = 'rubrics';
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      // Extract text content if it's an image
      let textContent = '';
      if (fileType === 'image') {
        try {
          textContent = await extractTextFromImage(publicUrl);
        } catch (ocrError) {
          console.error('OCR error:', ocrError);
          // Continue without extracted text
        }
      } else if (fileType === 'text') {
        // For text files, read the content directly
        textContent = await file.text();
      }
      
      // First check if a rubric already exists for this exam
      const { data: existingRubric, error: fetchError } = await supabase
        .from('rubrics')
        .select('id')
        .eq('exam_id', examId)
        .maybeSingle();
      
      if (fetchError) {
        console.error('Error checking for existing rubric:', fetchError);
      }
      
      let insertError;
      
      if (existingRubric?.id) {
        // Update existing rubric
        const { error } = await supabase
          .from('rubrics')
          .update({
            file_name: file.name,
            file_type: fileType,
            file_size: fileSize,
            image_url: publicUrl,
            content: textContent,
            created_at: new Date().toISOString()
          })
          .eq('id', existingRubric.id);
        
        insertError = error;
      } else {
        // Insert new rubric
        const { error } = await supabase
          .from('rubrics')
          .insert({
            exam_id: examId,
            file_name: file.name,
            file_type: fileType,
            file_size: fileSize,
            image_url: publicUrl,
            content: textContent,
            created_at: new Date().toISOString()
          });
        
        insertError = error;
      }
      
      if (insertError) {
        throw new Error(insertError.message);
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast({
        title: 'Upload successful',
        description: 'Rubric has been uploaded',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reload the rubric
      await loadRubric(examId as string);
      
      // Close the modal
      onRubricClose();
      
      // Reset state
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
      
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmissionUpload = async () => {
    if (!file || !studentName.trim() || !studentId) {
      setError('Please provide all required fields');
      return;
    }
    
    // Validate student ID format (6 digits)
    if (!/^\d{6}$/.test(studentId)) {
      setError('Student ID must be a 6-digit number');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('student_name', studentName);
      formData.append('student_id', studentId);
      
      if (examId) {
        // If examId is potentially an array, take the first value
        const examIdValue = Array.isArray(examId) ? examId[0] : examId;
        formData.append('exam_id', String(examIdValue));
      }
      
      // Upload file to storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `submissions/${fileName}`;
      
      // Use the existing 'submissions' bucket
      const bucketName = 'submissions';
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // Extract text if it's an image
      let extractedText = '';
      if (file.type.includes('image/') || file.name.match(/\.(jpeg|jpg|png)$/i)) {
        try {
          extractedText = await extractTextFromImage(publicUrl);
        } catch (ocrError) {
          console.error('OCR error:', ocrError);
          // Continue without extracted text
        }
      } else if (file.type.includes('text/') || file.name.endsWith('.txt')) {
        // For text files, read the content directly
        extractedText = await file.text();
      }

      // Insert into submissions table - ADD student_id HERE
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({
          exam_id: examId,
          student_name: studentName,
          student_id: studentId,
          script_file_name: file.name,
          script_file_url: publicUrl,
          extracted_text_script: extractedText,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      toast({
        title: 'Upload successful',
        description: `${studentName}'s submission has been uploaded`,
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
      setStudentId(''); // Reset student ID
    } catch (error) {
      console.error('Error uploading submission:', error);
      setError('Failed to upload submission. Please try again.');
    } finally {
      setIsUploading(false);
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
        
        // Load or use existing rubric content
        let currentRubricContent = rubricContent;
        if (!currentRubricContent) {
          console.log('Rubric not loaded yet, trying to load it');
          currentRubricContent = await loadRubric(examId as string);
        }
        
        if (!currentRubricContent) {
          console.error('Failed to load rubric content');
          toast({
            title: 'Cannot grade submission',
            description: 'Missing rubric content',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          setIsGrading(false);
          return;
        }
        
        // Check if we have the extracted text from the submission
        let answerText = '';
        
        // First check if we have valid extracted_text_script
        const needsOcr = !submission.extracted_text_script || 
                         submission.extracted_text_script.trim() === '' ||
                         submission.extracted_text_script.includes('OCR') ||
                         submission.extracted_text_script.includes('Image file');
        
        if (!needsOcr && submission.extracted_text_script) {
          console.log('Using existing extracted_text_script for grading');
          answerText = submission.extracted_text_script;
        } 
        // If OCR is needed, process the image
        else {
          console.log('OCR processing needed for this submission');
          
          // Determine which URL to use for OCR
          const imageUrl = submission.image_url || submission.script_file_url;
          
          if (!imageUrl) {
            console.error('No image URL available for OCR');
            toast({
              title: 'Cannot grade submission',
              description: 'No image available for OCR processing',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            setIsGrading(false);
            return;
          }
          
          // Show OCR processing toast
          toast({
            title: 'OCR Processing',
            description: 'Extracting text from image...',
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
          
          try {
            console.log('Calling OCR service with image URL:', imageUrl);
            // Call OCR service to extract text from the image
            const extractedText = await extractTextFromImage(imageUrl);
            
            if (extractedText && extractedText.trim() !== '' && !extractedText.includes('OCR')) {
              console.log('Successfully extracted text from image:', extractedText.substring(0, 100) + '...');
              answerText = extractedText;
              
              // Update the submission with the extracted text
              const { error: updateError } = await supabase
                .from('submissions')
                .update({ extracted_text_script: extractedText })
                .eq('id', submission.id);
              
              if (updateError) {
                console.error('Error updating submission with extracted text:', updateError);
              } else {
                console.log('Updated submission with extracted text');
                // Update the local submission object
                submission.extracted_text_script = extractedText;
                
                // Update the selected submission state
                setSelectedSubmission({
                  ...submission,
                  extracted_text_script: extractedText
                });
                
                toast({
                  title: 'OCR Complete',
                  description: 'Successfully extracted text from image',
                  status: 'success',
                  duration: 3000,
                  isClosable: true,
                });
              }
            } else {
              throw new Error('OCR failed to extract meaningful text from the image');
            }
          } catch (ocrError) {
            console.error('OCR error:', ocrError);
            toast({
              title: 'OCR Processing Failed',
              description: 'Failed to extract text from the submission image',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            setIsGrading(false);
            return;
          }
        }
        
        // Verify we have text to grade
        if (!answerText || answerText.trim() === '' || answerText.includes('OCR')) {
          console.error('No valid answer text available for grading');
          toast({
            title: 'Cannot grade submission',
            description: 'No valid answer text available for grading',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          setIsGrading(false);
          return;
        }
        
        console.log('Grading submission with:');
        console.log('- Answer text length:', answerText.length);
        console.log('- Answer text preview:', answerText.substring(0, 100) + '...');
        console.log('- Rubric content length:', currentRubricContent.length);
        
        // Show grading toast
        toast({
          title: 'Grading in Progress',
          description: 'Analyzing student answer...',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
        
        // Call the grading API
        const result = await gradeSubmission(
          submission.id,
          answerText,
          currentRubricContent,
          2 // Default strictness level
        );
        
        console.log('Grading result:', result);
        
        // Update the local state with the grading result
        setSelectedSubmission({
          ...submission,
          score: result.score,
          feedback: result.feedback,
          total_points: result.total_points,
          extracted_text_script: answerText // Ensure we keep the extracted text
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
                      borderRadius="md"
                    />
                  </Box>
                ) : (
                  <Box 
                    p={4} 
                    bg={previewBg}
                    maxH="400px"
                    overflowY="auto"
                    whiteSpace="pre-wrap"
                    fontFamily="monospace"
                    fontSize="sm"
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
        username={localStorage.getItem('username') || ''}
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
                  onChange={handleFileChange}
                  accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png"
                  p={1}
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
                <FormLabel>Upload Rubric File</FormLabel>
                <Input
                  type="file"
                  accept=".txt,.pdf,.jpg,.jpeg,.png,text/plain,application/pdf,image/jpeg,image/png"
                  onChange={handleFileChange}
                  p={1}
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Supported file types: .txt, .pdf, .jpg, .jpeg, .png
                </Text>
              </FormControl>
              
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