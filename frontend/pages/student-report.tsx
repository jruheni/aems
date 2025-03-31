import React, { useState, useEffect, useRef } from 'react';
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
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
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
    // Check if the user is logged in and get their role
    const checkUserRole = () => {
      if (typeof window === 'undefined') return false;
      const userRole = localStorage.getItem('userRole');
      if (userRole !== 'student') {
        router.push('/login');
        return false;
      }
      return true;
    };

    // Verify authentication
    apiRequest('auth/verify')
      .then(() => {
        checkUserRole();
      })
      .catch(() => {
        router.push('/login');
      });

    // Cleanup interval on unmount
    return () => {
      if (autoRefresh) {
        clearInterval(autoRefresh);
      }
    };
  }, [id, router]);
  
  useEffect(() => {
    if (id && name) {
      setStudentId(decodeURIComponent(id as string));
      setStudentName(decodeURIComponent(name as string));
      loadStudentData(decodeURIComponent(id as string));
    }
  }, [id, name]);
  
  const loadStudentData = async (studentId: string) => {
    setIsLoading(true);
    
    try {
      // If student is trying to view someone else's report
      if (typeof window !== 'undefined' && userRole === 'student' && studentId !== localStorage.getItem('username')) {
        router.push('/login');
        return;
      }

      console.log("Loading data for student ID:", studentId);
      
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('id, exam_id, student_name, student_id, score, feedback, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });
      
      if (submissionsError) {
        console.error("Supabase error fetching submissions:", submissionsError);
        throw submissionsError;
      }
      
      console.log("Raw submissions data:", submissionsData);
      
      if (!submissionsData || submissionsData.length === 0) {
        toast({
          title: 'No data available',
          description: `No submissions found for Student ID: ${studentId}`,
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
        setSubmissions([]);
        setIsLoading(false);
        return;
      }
      
      // Step 2: Fetch exam details separately for each submission
      const enhancedSubmissions = await Promise.all(
        submissionsData.map(async (submission) => {
          try {
            console.log("Fetching exam data for exam_id:", submission.exam_id);
            
            const { data: examData, error: examError } = await supabase
              .from('exams')
              .select('*')  // Select all fields to ensure we get everything
              .eq('id', submission.exam_id)
              .single();
            
            if (examError) {
              console.error("Error fetching exam data for submission:", submission.id, examError);
              return {
                ...submission,
                exams: {
                  id: submission.exam_id,
                  title: "Unknown Exam",
                  description: "",
                  created_at: submission.created_at,
                  user_id: "",
                  total_marks: 10
                }
              };
            }
            
            console.log("Retrieved exam data:", examData);
            
            // Make sure we have all the required fields
            if (!examData || !examData.title) {
              console.error("Exam data is missing title for exam_id:", submission.exam_id);
              return {
                ...submission,
                exams: {
                  id: submission.exam_id,
                  title: "Untitled Exam",
                  description: examData?.description || "",
                  created_at: examData?.created_at || submission.created_at,
                  user_id: examData?.user_id || "",
                  total_marks: examData?.total_marks || 10
                }
              };
            }
            
            return {
              ...submission,
              exams: {
                id: examData.id,
                title: examData.title,
                description: examData.description || "",
                created_at: examData.created_at,
                user_id: examData.user_id || "",
                total_marks: examData.total_marks || 10
              }
            };
          } catch (err) {
            console.error("Error processing exam data for submission:", submission.id, err);
            return {
              ...submission,
              exams: {
                id: submission.exam_id,
                title: "Error Loading Exam",
                description: "",
                created_at: submission.created_at,
                user_id: "",
                total_marks: 10
              }
            };
          }
        })
      );
      
      console.log("Enhanced submissions with exam data:", enhancedSubmissions);
      
      // Cast to Submission[] after transformation
      setSubmissions(enhancedSubmissions as Submission[]);
      
      // Process analytics data
      if (enhancedSubmissions.length > 0) {
        try {
          const gradedSubmissions = enhancedSubmissions.filter(s => s.score !== null);
          
          console.log("Graded submissions:", gradedSubmissions);
          
          if (gradedSubmissions.length === 0) {
            toast({
              title: 'No graded submissions',
              description: `${studentName} has submissions, but none have been graded yet`,
              status: 'info',
              duration: 5000,
              isClosable: true,
            });
            // Set default analytics values
            setAnalytics({
              totalExams: enhancedSubmissions.length,
              averageScore: 0,
              highestScore: 0,
              lowestScore: 0,
              examPerformance: [],
              scoreDistribution: [],
              improvementTrend: [],
              strengthsWeaknesses: []
            });
            setIsLoading(false);
            return;
          }
          
          // Basic stats
          const totalExams = new Set(enhancedSubmissions.map(s => s.exam_id)).size;
          const averageScore = gradedSubmissions.length > 0 
            ? (gradedSubmissions.reduce((sum, s) => sum + ((s.score || 0) / (s.exams.total_marks || 10) * 100), 0) / gradedSubmissions.length)
            : 0;
          const highestScore = gradedSubmissions.length > 0 
            ? Math.max(...gradedSubmissions.map(s => ((s.score || 0) / (s.exams.total_marks || 10) * 100)))
            : 0;
          const lowestScore = gradedSubmissions.length > 0 
            ? Math.min(...gradedSubmissions.map(s => ((s.score || 0) / (s.exams.total_marks || 10) * 100)))
            : 0;
          
          // Exam performance
          const examPerformance = gradedSubmissions.map(s => ({
            examName: s.exams.title,
            score: s.score || 0,
            totalMarks: s.exams.total_marks || 10,
            percentage: ((s.score || 0) / (s.exams.total_marks || 10)) * 100
          }));
          
          // Score distribution
          const scoreRanges = [
            { range: '0-25%', count: 0 },
            { range: '26-50%', count: 0 },
            { range: '51-75%', count: 0 },
            { range: '76-100%', count: 0 }
          ];
          
          gradedSubmissions.forEach(s => {
            const percentage = ((s.score || 0) / (s.exams.total_marks || 10)) * 100;
            if (percentage <= 25) scoreRanges[0].count++;
            else if (percentage <= 50) scoreRanges[1].count++;
            else if (percentage <= 75) scoreRanges[2].count++;
            else scoreRanges[3].count++;
          });
          
          // Improvement trend (chronological performance)
          const improvementTrend = gradedSubmissions.map((s, index) => ({
            examNumber: index + 1,
            examName: s.exams.title,
            date: new Date(s.created_at).toLocaleDateString(),
            percentage: ((s.score || 0) / (s.exams.total_marks || 10)) * 100
          }));
          
          // Strengths and weaknesses analysis (simplified)
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
        } catch (analyticsError) {
          console.error("Error processing analytics:", analyticsError);
          toast({
            title: 'Error processing analytics',
            description: analyticsError instanceof Error ? analyticsError.message : 'Failed to process analytics data',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
          
          // Set default analytics values
          setAnalytics({
            totalExams: enhancedSubmissions.length,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            examPerformance: [],
            scoreDistribution: [],
            improvementTrend: [],
            strengthsWeaknesses: []
          });
        }
      }
    } catch (error) {
      console.error('Error loading student data:', error);
      
      if (error instanceof Error && error.message === 'Unauthorized access') {
        toast({
          title: 'Access Denied',
          description: 'You can only view your own performance report',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        router.replace('/student-dashboard');
        return;
      }

      toast({
        title: 'Error loading data',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      // Set empty data
      setSubmissions([]);
      setAnalytics({
        totalExams: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        examPerformance: [],
        scoreDistribution: [],
        improvementTrend: [],
        strengthsWeaknesses: []
      });
    } finally {
      setIsLoading(false);
    }
  };
  
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
        position="absolute"
        top={0}
        left={0}
        right={0}
        height="300px"
        bgImage={getGradients('22')}
        opacity={0.8}
        zIndex={-1}
      />
      
      <Container maxW="container.xl" py={8}>
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <HStack mb={6} spacing={4}>
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
                                  <Td fontWeight="medium">{submission.exams.title}</Td>
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
    </>
  );
};

export default StudentReport;

// Add these styles to your global CSS or create a new styles file
const styles = {
  // Add any custom styles here
};