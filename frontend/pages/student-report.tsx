import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Button, Container, Flex, Heading, Text, VStack, HStack, 
  Spinner, useToast, Image, Divider, Badge, SimpleGrid, Card, 
  CardHeader, CardBody, CardFooter, Stat, StatLabel, StatNumber, 
  StatHelpText, StatArrow, StatGroup, Progress, useColorModeValue,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, IconButton,
  Icon
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { FaArrowLeft, FaDownload, FaChartLine, FaGraduationCap, FaTrophy, FaChartBar, FaBookReader } from 'react-icons/fa';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { supabase } from '../src/services/supabaseClient';
import Head from 'next/head';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { motion } from 'framer-motion';
import { keyframes } from '@emotion/react';
import { customColors, getGradients } from '../src/theme/colors';
import { apiRequest } from '../src/utils/api';

// Add proper types for the submissions and analytics
interface Exam {
  id: string;
  title: string;
  description: string;
  created_at: string;
  user_id: string;
  total_marks?: number;
}

interface Submission {
  id: string;
  exam_id: string;
  student_name: string;
  student_id: string;
  score: number | null;
  feedback: string | null;
  created_at: string;
  exams: Exam;
  total_points?: number | null;
  exam_title?: string;
}

// Add the missing Student interface definition
interface Student {
  id: string;
  name: string;
  email: string;
  student_id: string;
}

interface ExamPerformance {
  examName: string;
  score: number;
  totalMarks: number;
  percentage: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
}

interface ImprovementTrend {
  examNumber: number;
  examName: string;
  date: string;
  percentage: number;
}

interface SkillAssessment {
  name: string;
  score: number;
}

interface Analytics {
  totalExams: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  examPerformance: ExamPerformance[];
  scoreDistribution: ScoreDistribution[];
  improvementTrend: ImprovementTrend[];
  strengthsWeaknesses: SkillAssessment[];
}

interface AuthError {
  message: string;
}

// Update the animations definition
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

// Update the animations to use Framer Motion's transition types
const MotionSimpleGrid = motion(SimpleGrid);
const MotionFlex = motion(Flex);

const StudentReport = () => {
  const router = useRouter();
  const toast = useToast();
  const { id, name } = router.query;
  const [studentId, setStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalExams: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    examPerformance: [],
    scoreDistribution: [],
    improvementTrend: [],
    strengthsWeaknesses: []
  });
  const reportRef = useRef(null);
  
  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const subTextColor = useColorModeValue('gray.600', 'gray.300');
  
  const [userRole, setUserRole] = useState<'teacher' | 'student'>('student');
  const [autoRefresh, setAutoRefresh] = useState<NodeJS.Timeout | null>(null);
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  
  // Move chartColors here, inside the component
  const chartColors = {
    primary: customColors.orange,
    secondary: customColors.coral,
    accent: customColors.pink,
    error: '#E53E3E',
    grid: useColorModeValue('#E2E8F0', '#2D3748')
  };
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setStoredUserId(localStorage.getItem('username'));
    }
  }, []);

  useEffect(() => {
    // Check authentication first
    const checkAuth = async () => {
      try {
        // Add a debug log before making the request
        console.log('[Debug] Attempting to verify auth...');
        
        const response = await apiRequest('auth/verify');
        console.log('[Debug] Auth response:', response);
        
        // Set the user role from the response
        setUserRole(response.user_type || 'teacher');
        
        // If we have query parameters, use them
        if (id && name) {
          setStudentId(decodeURIComponent(id as string));
          setStudentName(decodeURIComponent(name as string));
          loadStudentData(decodeURIComponent(id as string));
        } else if (response.user_type === 'student' && response.student_id) {
          // If no query params but user is a student, use their own data
          setStudentId(response.student_id);
          setStudentName(response.username);
          loadStudentData(response.student_id);
        } else {
          // If no query params and not a student, redirect to dashboard
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        
        // Check if we have query parameters despite auth failure
        if (id && name) {
          // We have student params, try to use them anyway (may be a teacher accessing directly)
          console.log('[Debug] Auth failed but using query parameters to continue');
          setStudentId(decodeURIComponent(id as string));
          setStudentName(decodeURIComponent(name as string));
          loadStudentData(decodeURIComponent(id as string));
          return;
        }
        
        // Type guard to check if error is an AuthError
        if (error && typeof error === 'object' && 'message' in error) {
          const authError = error as AuthError;
          // Only redirect to login for authentication required errors
          if (authError.message === 'Authentication required') {
            router.push('/login');
          } else {
            // For other errors like "User not found", try to get student ID from localStorage
            const storedStudentId = localStorage.getItem('studentId');
            const storedStudentName = localStorage.getItem('studentName');
            
            if (storedStudentId && storedStudentName) {
              console.log('[Debug] Using stored credentials:', storedStudentId, storedStudentName);
              setStudentId(storedStudentId);
              setStudentName(storedStudentName);
              loadStudentData(storedStudentId);
            } else {
              toast({
                title: 'Error',
                description: authError.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
              });
              // Redirect to dashboard after showing the error
              setTimeout(() => router.push('/dashboard'), 2000);
            }
          }
        } else {
          // Handle case where error is not of expected type
          toast({
            title: 'Error',
            description: 'An unexpected error occurred',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          // Redirect to dashboard after showing the error
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      }
    };

    checkAuth();
  }, [id, name, router, toast]);
  
  const loadStudentData = useCallback(async (studentIdFromParam: string) => {
    setIsLoading(true);
    let studentIdToUse = studentIdFromParam; // Use the ID passed from the effect

    try {
      // Step 1: Verify Auth (optional if already done in effect, but safe to keep)
      console.log('[Debug] loadStudentData: BEFORE apiRequest auth/verify');
      const authResponse = await apiRequest('auth/verify');
      // Log immediately after await, before any access
      console.log('[Debug] loadStudentData: AFTER apiRequest auth/verify.'); 
      
      // Now try accessing properties
      console.log('[Debug] loadStudentData: Checking authResponse object:', authResponse);
      if (authResponse && authResponse.student_id) {
          console.log('[Debug] loadStudentData: Condition (authResponse && authResponse.student_id) is TRUE.');
          studentIdToUse = authResponse.student_id;
          console.log(`[Debug] loadStudentData: Using authenticated student_id: ${studentIdToUse}`);
      } else {
          console.log('[Debug] loadStudentData: Condition (authResponse && authResponse.student_id) is FALSE.');
          console.warn('[Debug] loadStudentData: student_id not found in auth response, using ID from params:', studentIdFromParam);
          if (!studentIdFromParam) {
              console.error('[Debug] loadStudentData: Throwing error - Student ID is missing.')
              throw new Error('Student ID is missing.');
          }
      }
      console.log(`[Debug] loadStudentData: Determined studentIdToUse: ${studentIdToUse}`);

      // Step 2: Fetch Student Details (Added back)
      console.log(`[Debug] loadStudentData: BEFORE apiRequest students?student_id=${studentIdToUse}`);
      const studentDetails = await apiRequest(`students?student_id=${studentIdToUse}`);
      console.log(`[Debug] loadStudentData: AFTER apiRequest students?student_id=${studentIdToUse}`);
      console.log('[Debug] loadStudentData: Student details received:', studentDetails);
      if (!studentDetails) {
          console.error('[Debug] loadStudentData: Throwing error - Failed to fetch student details.')
          throw new Error('Failed to fetch student details.');
      }
      // Set student data state if needed for display
      setStudentData({
        id: studentDetails.id,
        name: studentDetails.name,
        email: studentDetails.email,
        student_id: studentDetails.student_id
      });
      console.log('[Debug] loadStudentData: setStudentData called.');
      // Update local state name if different from query param
      if (studentDetails.name && studentDetails.name !== studentName) {
          console.log(`[Debug] loadStudentData: Updating studentName state from ${studentName} to ${studentDetails.name}`);
          setStudentName(studentDetails.name);
      }

      // Step 3: Fetch Submissions using apiRequest
      console.log(`[Debug] loadStudentData: BEFORE apiRequest submissions?student_id=${studentIdToUse}`);
      const submissionsData = await apiRequest(`submissions?student_id=${studentIdToUse}`);
      console.log(`[Debug] loadStudentData: AFTER apiRequest submissions?student_id=${studentIdToUse}`);
      console.log('[Debug] loadStudentData: Submissions data received:', submissionsData);

      if (!submissionsData) {
        // Handle case where apiRequest might return null/undefined on non-error empty response?
        console.warn('[Debug] No submissions data received (or empty array).');
        setSubmissions([]);
        // Continue to analytics calculation with empty data
      } else if (submissionsData.length === 0) {
        toast({
          title: 'No data available',
          description: `No submissions found for Student ID: ${studentIdToUse}`,
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
        setSubmissions([]);
        // Set empty analytics and finish loading
        setAnalytics({
          totalExams: 0, averageScore: 0, highestScore: 0, lowestScore: 0,
          examPerformance: [], scoreDistribution: [], improvementTrend: [], strengthsWeaknesses: []
        });
        setIsLoading(false);
        return; // Exit early as there's nothing more to process
      } else {
         // We have submissions, proceed
         setSubmissions(submissionsData as Submission[]); // Assuming apiRequest returns array
      }

      // Step 4: Process Submissions & Calculate Analytics
      console.log('[Debug] Processing submissions and calculating analytics...');
      const gradedSubmissions = submissionsData.filter((s: Submission) => s.score !== null);

      if (gradedSubmissions.length === 0) {
          toast({
            title: 'No graded submissions',
            description: `${studentName || studentIdToUse} has submissions, but none have been graded yet`,
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
          setAnalytics({
            totalExams: submissionsData.length, averageScore: 0, highestScore: 0, lowestScore: 0,
            examPerformance: [], scoreDistribution: [], improvementTrend: [], strengthsWeaknesses: []
          });
      } else {
          // --- Perform Analytics Calculation --- 
          // Basic stats
          const totalExams = new Set(submissionsData.map((s: Submission) => s.exam_id)).size;
          const averageScore = gradedSubmissions.length > 0 
            ? (gradedSubmissions.reduce((sum: number, s: Submission) => sum + (((s.score || 0) / (s.total_points || 10)) * 100), 0) / gradedSubmissions.length)
            : 0;
          const highestScore = gradedSubmissions.length > 0 
            ? Math.max(...gradedSubmissions.map((s: Submission) => (((s.score || 0) / (s.total_points || 10)) * 100)))
            : 0;
          const lowestScore = gradedSubmissions.length > 0 
            ? Math.min(...gradedSubmissions.map((s: Submission) => (((s.score || 0) / (s.total_points || 10)) * 100)))
            : 0;
          
          // Exam performance
          const examPerformance = gradedSubmissions.map((s: Submission) => ({
            examName: s.exam_title || 'Untitled Exam', // Use field from transformed data
            score: s.score || 0,
            totalMarks: s.total_points || 10,
            percentage: ((s.score || 0) / (s.total_points || 10)) * 100
          }));
          
          // Score distribution
          const scoreRanges = [
            { range: '0-25%', count: 0 }, { range: '26-50%', count: 0 },
            { range: '51-75%', count: 0 }, { range: '76-100%', count: 0 }
          ];
          gradedSubmissions.forEach((s: Submission) => {
            const percentage = ((s.score || 0) / (s.total_points || 10)) * 100;
            if (percentage <= 25) scoreRanges[0].count++;
            else if (percentage <= 50) scoreRanges[1].count++;
            else if (percentage <= 75) scoreRanges[2].count++;
            else scoreRanges[3].count++;
          });
          
          // Improvement trend (chronological performance)
          const improvementTrend = gradedSubmissions.map((s: Submission, index: number) => ({
            examNumber: index + 1,
            examName: s.exam_title || 'Untitled Exam',
            date: new Date(s.created_at).toLocaleDateString(),
            percentage: ((s.score || 0) / (s.total_points || 10)) * 100
          }));
          
          // Strengths and weaknesses analysis (simplified - replace with actual logic if available)
          const strengthsWeaknesses = [
            { name: 'Knowledge', score: Math.random() * 100 },
            { name: 'Understanding', score: Math.random() * 100 },
            { name: 'Application', score: Math.random() * 100 },
            { name: 'Analysis', score: Math.random() * 100 },
            { name: 'Evaluation', score: Math.random() * 100 }
          ];
          
          setAnalytics({
            totalExams,
            averageScore,
            highestScore,
            lowestScore,
            examPerformance,
            scoreDistribution: scoreRanges,
            improvementTrend,
            strengthsWeaknesses
          });
          console.log('[Debug] Analytics calculation complete.');
      }

    } catch (error) {
      console.error('[Error] Error in loadStudentData:', error);
      toast({
        title: 'Error loading data',
        description: error instanceof Error ? error.message : 'An unknown error occurred while loading student data.',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
      // Ensure loading stops even on error
      setSubmissions([]);
      setAnalytics({ totalExams: 0, averageScore: 0, highestScore: 0, lowestScore: 0, examPerformance: [], scoreDistribution: [], improvementTrend: [], strengthsWeaknesses: [] });
    } finally {
      console.log('[Debug] Setting isLoading to false in finally block.');
      setIsLoading(false);
    }
  // Update dependencies: Include necessary state setters and router query 'id'
  }, [id, toast, setStudentData, setSubmissions, setAnalytics, setIsLoading, setStudentName, studentName]);
  
  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${studentName.replace(/\s+/g, '_')}_Performance_Report.pdf`);
      
      toast({
        title: 'PDF Generated',
        description: 'The report has been downloaded as a PDF',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const getPerformanceSummary = () => {
    if (analytics.improvementTrend.length === 0) return '';
    
    const firstExam = analytics.improvementTrend[0];
    const lastExam = analytics.improvementTrend[analytics.improvementTrend.length - 1];
    const improving = lastExam.percentage > firstExam.percentage;
    
    let summary = `${studentName} has completed ${analytics.totalExams} ${analytics.totalExams === 1 ? 'exam' : 'exams'} with an average score of ${analytics.averageScore.toFixed(1)}%. `;
    
    if (analytics.improvementTrend.length >= 2) {
      if (improving) {
        summary += `There is a positive trend in performance, with scores improving from ${firstExam.percentage.toFixed(1)}% to ${lastExam.percentage.toFixed(1)}%. `;
      } else {
        summary += `There has been some variability in performance, with scores changing from ${firstExam.percentage.toFixed(1)}% to ${lastExam.percentage.toFixed(1)}%. `;
      }
    }
    
    // Add recommendations based on performance
    if (analytics.averageScore >= 8) {
      summary += 'Overall, the student demonstrates excellent understanding of the material and consistently performs at a high level.';
    } else if (analytics.averageScore >= 6) {
      summary += 'The student shows good understanding of most concepts but could benefit from additional practice in some areas.';
    } else if (analytics.averageScore >= 4) {
      summary += 'The student demonstrates basic understanding but needs more support to fully grasp key concepts.';
    } else {
      summary += 'The student requires significant additional support and practice to improve understanding of fundamental concepts.';
    }
    
    return summary;
  };
  
  return (
    <>
      <Head>
        <title>{studentName} - Performance Report | AEMS</title>
      </Head>
      
      <Box
        position="fixed"
        top="64px"
        left={0}
        right={0}
        height="300px"
        bgImage={getGradients('22')}
        opacity={0.8}
        zIndex={-1}
      />
      
      <Box pt="64px">
        <Container maxW="container.xl" py={4}>
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <HStack mb={4} spacing={4}>
              <IconButton
                aria-label="Back to dashboard"
                icon={<FaArrowLeft />}
                onClick={() => router.push(userRole === 'student' ? '/student-dashboard' : '/dashboard')}
              />
              <Heading size="lg">
                {userRole === 'student' ? 'Your Performance Report' : 'Student Performance Report'}
              </Heading>
            </HStack>
          </motion.div>
          
          {userRole === 'student' && (
            <Text color="gray.500" mb={4} fontSize="sm">
              This report updates automatically as new grades become available
            </Text>
          )}
          
          {isLoading ? (
            <Flex justify="center" align="center" minH="60vh" direction="column">
              <Box
                as={motion.div}
                animation={`${fadeIn} 1s ease-in-out infinite alternate`}
              >
                <Spinner size="xl" thickness="4px" color="blue.500" />
              </Box>
              <Text mt={4} color="gray.500">Loading your performance data...</Text>
            </Flex>
          ) : submissions.length === 0 ? (
            <Box textAlign="center" p={10}>
              <Image
                src="/images/no-data.svg"
                alt="No data"
                maxW="200px"
                mx="auto"
                mb={6}
              />
              <Heading size="md" mb={4}>No data available</Heading>
              <Text>No submissions found for {studentName}</Text>
              <Button mt={6} onClick={() => router.back()}>
                Return to Dashboard
              </Button>
            </Box>
          ) : (
            <>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <HStack spacing={4} mb={6} justify="flex-end">
                  <Button 
                    leftIcon={<FaDownload />} 
                    bg={customColors.orange}
                    color="white"
                    _hover={{ bg: customColors.coral }}
                    variant="solid"
                    onClick={generatePDF}
                  >
                    Download PDF
                  </Button>
                </HStack>
                
                <Box 
                  ref={reportRef} 
                  bg={cardBg} 
                  p={8} 
                  borderRadius="lg" 
                  boxShadow="lg"
                  position="relative"
                  overflow="hidden"
                  _before={{
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    bgGradient: `linear(to-r, ${customColors.orange}, ${customColors.coral}, ${customColors.pink})`
                  }}
                >
                  <Flex 
                    direction={{ base: "column", md: "row" }} 
                    justify="space-between" 
                    align={{ base: "start", md: "center" }}
                    mb={8}
                    pb={4}
                    borderBottom="1px"
                    borderColor={borderColor}
                    position="relative"
                    zIndex={1}
                  >
                    <HStack spacing={4}>
                      <Icon as={FaGraduationCap} w={8} h={8} color="blue.500" />
                      <Box>
                        <Heading size="xl" mb={2}>{studentName}</Heading>
                        <Text color={subTextColor} fontSize="lg">
                          Performance Report • {new Date().toLocaleDateString()}
                        </Text>
                      </Box>
                    </HStack>
                    <HStack spacing={6} mt={{ base: 4, md: 0 }}>
                      <Stat>
                        <StatLabel>Exams</StatLabel>
                        <StatNumber>{analytics.totalExams}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Avg. Score</StatLabel>
                        <StatNumber color={customColors.orange}>{analytics.averageScore.toFixed(1)}%</StatNumber>
                      </Stat>
                    </HStack>
                  </Flex>
                  
                  <MotionSimpleGrid 
                    columns={{ base: 1, md: 4 }} 
                    spacing={6} 
                    mb={8}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ 
                      type: "spring",
                      duration: 0.5,
                      delay: 0.2 
                    }}
                  >
                    <Card 
                      boxShadow="sm" 
                      _hover={{ 
                        transform: 'translateY(-2px)', 
                        boxShadow: 'md',
                        borderColor: customColors.orange 
                      }}
                      transition="all 0.2s"
                    >
                      <CardBody>
                        <HStack spacing={4}>
                          <Icon as={FaChartLine} w={6} h={6} color={customColors.orange} />
                          <Stat>
                            <StatLabel>Average Score</StatLabel>
                            <StatNumber color={customColors.orange}>{analytics.averageScore.toFixed(1)}%</StatNumber>
                            <StatHelpText>
                              <StatArrow 
                                type={analytics.averageScore >= 60 ? 'increase' : 'decrease'} 
                              />
                              {analytics.averageScore >= 60 ? 'Above passing' : 'Below passing'}
                            </StatHelpText>
                          </Stat>
                        </HStack>
                      </CardBody>
                    </Card>
                    
                    <Card 
                      boxShadow="sm" 
                      _hover={{ 
                        transform: 'translateY(-2px)', 
                        boxShadow: 'md',
                        borderColor: customColors.orange 
                      }}
                      transition="all 0.2s"
                    >
                      <CardBody>
                        <HStack spacing={4}>
                          <Icon as={FaTrophy} w={6} h={6} color="blue.500" />
                          <Stat>
                            <StatLabel>Highest Score</StatLabel>
                            <StatNumber>{analytics.highestScore.toFixed(1)}%</StatNumber>
                            <StatHelpText>
                              {analytics.examPerformance.find(e => e.percentage === analytics.highestScore)?.examName || 'N/A'}
                            </StatHelpText>
                          </Stat>
                        </HStack>
                      </CardBody>
                    </Card>
                    
                    <Card 
                      boxShadow="sm" 
                      _hover={{ 
                        transform: 'translateY(-2px)', 
                        boxShadow: 'md',
                        borderColor: customColors.orange 
                      }}
                      transition="all 0.2s"
                    >
                      <CardBody>
                        <HStack spacing={4}>
                          <Icon as={FaChartBar} w={6} h={6} color="blue.500" />
                          <Stat>
                            <StatLabel>Lowest Score</StatLabel>
                            <StatNumber>{analytics.lowestScore.toFixed(1)}%</StatNumber>
                            <StatHelpText>
                              {analytics.examPerformance.find(e => e.percentage === analytics.lowestScore)?.examName || 'N/A'}
                            </StatHelpText>
                          </Stat>
                        </HStack>
                      </CardBody>
                    </Card>
                    
                    <Card 
                      boxShadow="sm" 
                      _hover={{ 
                        transform: 'translateY(-2px)', 
                        boxShadow: 'md',
                        borderColor: customColors.orange 
                      }}
                      transition="all 0.2s"
                    >
                      <CardBody>
                        <HStack spacing={4}>
                          <Icon as={FaChartBar} w={6} h={6} color="blue.500" />
                          <Stat>
                            <StatLabel>Performance Trend</StatLabel>
                            <StatNumber>
                              {analytics.improvementTrend.length >= 2 ? (
                                <Badge 
                                  colorScheme={
                                    analytics.improvementTrend[analytics.improvementTrend.length - 1].percentage >
                                    analytics.improvementTrend[0].percentage ? "orange" : "pink"
                                  } 
                                  bg={
                                    analytics.improvementTrend[analytics.improvementTrend.length - 1].percentage >
                                    analytics.improvementTrend[0].percentage ? customColors.orange : customColors.pink
                                  }
                                  color="white"
                                  fontSize="md" 
                                  px={2} 
                                  py={1}
                                >
                                  {analytics.improvementTrend[analytics.improvementTrend.length - 1].percentage >
                                    analytics.improvementTrend[0].percentage ? 'Improving' : 'Variable'}
                                </Badge>
                              ) : (
                                <Badge colorScheme="blue" fontSize="md" px={2} py={1}>
                                  Baseline
                                </Badge>
                              )}
                            </StatNumber>
                            <StatHelpText>
                              Based on {analytics.improvementTrend.length} exams
                            </StatHelpText>
                          </Stat>
                        </HStack>
                      </CardBody>
                    </Card>
                  </MotionSimpleGrid>
                  
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <Card boxShadow="md" mb={8}>
                      <CardHeader pb={0}>
                        <HStack spacing={4}>
                          <Icon as={FaChartBar} w={6} h={6} color="blue.500" />
                          <Box>
                            <Heading size="md">Performance Trend</Heading>
                            <Text color={subTextColor}>Score progression over time</Text>
                          </Box>
                        </HStack>
                      </CardHeader>
                      <CardBody>
                        <Box h="300px">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.improvementTrend}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                              <XAxis 
                                dataKey="examName" 
                                tick={{ fill: textColor }} 
                                axisLine={{ stroke: borderColor }}
                              />
                              <YAxis 
                                domain={[0, 100]} 
                                tick={{ fill: textColor }} 
                                axisLine={{ stroke: borderColor }}
                                label={{ 
                                  value: 'Score (%)', 
                                  angle: -90, 
                                  position: 'insideLeft',
                                  fill: textColor
                                }}
                              />
                              <RechartsTooltip 
                                formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(1) : value}%`, 'Score']}
                                labelFormatter={(label: string) => `Exam: ${label}`}
                                contentStyle={{ 
                                  backgroundColor: cardBg, 
                                  border: `1px solid ${borderColor}`,
                                  color: textColor
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="percentage" 
                                stroke={customColors.orange} 
                                strokeWidth={2}
                                dot={{ fill: customColors.coral, r: 6 }}
                                activeDot={{ r: 8, fill: customColors.pink }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </CardBody>
                    </Card>
                  </motion.div>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
                    <Card boxShadow="md">
                      <CardHeader pb={0}>
                        <Heading size="md">Score Distribution</Heading>
                        <Text color={subTextColor}>Performance by score range</Text>
                      </CardHeader>
                      <CardBody>
                        <Box h="300px">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.scoreDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="count"
                                nameKey="range"
                                label={({ name, percent }) => 
                                  percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                              >
                                {analytics.scoreDistribution.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={
                                      index === 0 ? customColors.pink : 
                                      index === 1 ? customColors.coral : 
                                      index === 2 ? customColors.orange : 
                                      '#2196F3'
                                    } 
                                  />
                                ))}
                              </Pie>
                              <RechartsTooltip 
                                formatter={(value: any) => [`${value} exams`, 'Count']}
                                contentStyle={{ 
                                  backgroundColor: cardBg, 
                                  border: `1px solid ${borderColor}`,
                                  color: textColor
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                      </CardBody>
                    </Card>
                    
                    <Card boxShadow="md">
                      <CardHeader pb={0}>
                        <Heading size="md">Skills Assessment</Heading>
                        <Text color={subTextColor}>Strengths and areas for improvement</Text>
                      </CardHeader>
                      <CardBody>
                        <Box h="300px">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.strengthsWeaknesses}>
                              <PolarGrid stroke={chartColors.grid} />
                              <PolarAngleAxis dataKey="name" tick={{ fill: textColor }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: textColor }} />
                              <Radar
                                name="Skills"
                                dataKey="score"
                                stroke={customColors.orange}
                                fill={customColors.coral}
                                fillOpacity={0.4}
                              />
                              <RechartsTooltip 
                                formatter={(value: any) => [`${value.toFixed(1)}%`, 'Proficiency']}
                                contentStyle={{ 
                                  backgroundColor: cardBg, 
                                  border: `1px solid ${borderColor}`,
                                  color: textColor
                                }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </Box>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                  
                  <Card boxShadow="md" mb={8}>
                    <CardHeader>
                      <Heading size="md">Exam Performance Details</Heading>
                    </CardHeader>
                    <CardBody>
                      <TableContainer>
                        <Table variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Exam</Th>
                              <Th>Date</Th>
                              <Th isNumeric>Score</Th>
                              <Th isNumeric>Percentage</Th>
                              <Th>Performance</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {submissions
                              .filter(s => s.score !== null)
                              .map((submission) => {
                                const percentage = ((submission.score ?? 0) / 10) * 100;
                                let performanceColor;
                                if (percentage >= 80) performanceColor = "green";
                                else if (percentage >= 60) performanceColor = "blue";
                                else if (percentage >= 40) performanceColor = "orange";
                                else performanceColor = "red";
                                
                                return (
                                  <Tr key={submission.id}>
                                    <Td fontWeight="medium">{submission.exam_title || 'Untitled Exam'}</Td>
                                    <Td>{new Date(submission.created_at).toLocaleDateString()}</Td>
                                    <Td isNumeric>{submission.score} / 10</Td>
                                    <Td isNumeric>{percentage.toFixed(1)}%</Td>
                                    <Td>
                                      <Badge 
                                        colorScheme={
                                          percentage >= 80 ? 'green' : 
                                          percentage >= 60 ? 'blue' : 
                                          percentage >= 40 ? 'orange' : 
                                          'red'
                                        }
                                        bg={
                                          percentage >= 80 ? customColors.orange : 
                                          percentage >= 60 ? customColors.coral : 
                                          percentage >= 40 ? customColors.pink : 
                                          'red.500'
                                        }
                                        color="white"
                                        px={2} 
                                        py={1} 
                                        borderRadius="full"
                                      >
                                        {percentage >= 80 ? 'Excellent' : 
                                         percentage >= 60 ? 'Good' : 
                                         percentage >= 40 ? 'Average' : 
                                         'Needs Improvement'}
                                      </Badge>
                                    </Td>
                                  </Tr>
                                );
                              })}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </CardBody>
                  </Card>
                  
                  <Card boxShadow="md">
                    <CardHeader>
                      <Heading size="md">Performance Analysis</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack align="start" spacing={4}>
                        <Box>
                          <Heading size="sm" mb={2}>Summary</Heading>
                          <Text>{getPerformanceSummary()}</Text>
                        </Box>
                        
                        <Box>
                          <Heading size="sm" mb={2}>Strengths</Heading>
                          <Text>
                            Based on the assessment, {studentName} demonstrates particular strength in 
                            {analytics.strengthsWeaknesses
                              .sort((a, b) => b.score - a.score)
                              .slice(0, 2)
                              .map(s => ` ${s.name.toLowerCase()}`)
                              .join(' and ')}.
                          </Text>
                        </Box>
                        
                        <Box>
                          <Heading size="sm" mb={2}>Areas for Improvement</Heading>
                          <Text>
                            To improve overall performance, {studentName} should focus on developing skills in 
                            {analytics.strengthsWeaknesses
                              .sort((a, b) => a.score - b.score)
                              .slice(0, 2)
                              .map(s => ` ${s.name.toLowerCase()}`)
                              .join(' and ')}.
                          </Text>
                        </Box>
                        
                        <Box>
                          <Heading size="sm" mb={2}>Recommendations</Heading>
                          <Text>
                            {analytics.averageScore >= 8 ? (
                              `${studentName} is performing excellently. To maintain this high level of achievement, consider exploring more advanced topics and challenging material.`
                            ) : analytics.averageScore >= 6 ? (
                              `${studentName} is performing well but could benefit from additional practice in specific areas, particularly focusing on conceptual understanding and application.`
                            ) : analytics.averageScore >= 4 ? (
                              `${studentName} would benefit from more structured study sessions, focusing on fundamental concepts and regular practice with feedback.`
                            ) : (
                              `${studentName} requires additional support. Consider implementing a structured intervention plan with regular check-ins, targeted practice, and one-on-one tutoring sessions.`
                            )}
                          </Text>
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                  
                  <MotionFlex 
                    justify="space-between" 
                    align="center" 
                    mt={8} 
                    pt={4}
                    borderTop="1px"
                    borderColor={borderColor}
                    position="relative"
                    _after={{
                      content: '""',
                      position: 'absolute',
                      bottom: '-1px',
                      left: '0',
                      right: '0',
                      height: '2px',
                      bgGradient: `linear(to-r, ${customColors.orange}, ${customColors.pink})`
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ 
                      type: "tween",
                      duration: 0.5,
                      delay: 0.8 
                    }}
                  >
                    <HStack spacing={2}>
                      <Icon as={FaBookReader} w={4} h={4} color="blue.500" />
                      <Text fontSize="sm" color={subTextColor}>
                        Generated by AEMS • {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color={subTextColor}>
                      Automated Exam Marking System
                    </Text>
                  </MotionFlex>
                </Box>
              </motion.div>
            </>
          )}
        </Container>
      </Box>
    </>
  );
};

export default StudentReport;

// Add these styles to your global CSS or create a new styles file
const styles = {
  // Add any custom styles here
};