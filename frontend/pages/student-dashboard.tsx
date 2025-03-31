import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Button,
  useColorModeValue,
  VStack,
  HStack,
  Icon,
  Divider,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  Spinner,
  Link,
  useToast,
} from '@chakra-ui/react';
import { FaBook, FaChartLine, FaFileAlt, FaUser, FaChevronDown, FaDownload, FaEye } from 'react-icons/fa';
import { Line, Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useRouter } from 'next/router';
import { supabase } from '../src/services/supabaseClient';
import Header from '../components/Header';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Update interfaces to match our database schema
interface Submission {
  id: string;
  exam_id: string;
  student_name: string;
  student_id: string;
  script_file_url: string;
  script_file_name: string;
  created_at: string;
  score: number | null;
  feedback: string | null;
  total_points: number;
  exams?: {
    title: string;
    description: string;
  };
}

interface Student {
  id: string;
  name: string;
  student_id: string;
  email: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const headingColor = useColorModeValue('gray.800', 'white');
  
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('username');
      const name = localStorage.getItem('username');
      setStudentId(id);
      setStudentName(name);
    }
  }, []);
  
  useEffect(() => {
    loadStudentData();
  }, []);
  
  const loadStudentData = async () => {
    if (!studentId) return;
    try {
      // Fetch student details
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (studentError || !studentData) {
        throw new Error('Failed to load student data');
      }

      setStudent(studentData);

      // Fetch all submissions for this student
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          *,
          exams (
            title,
            description
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (submissionsError) {
        throw new Error('Failed to load submissions');
      }

      setSubmissions(submissionsData || []);

    } catch (error) {
      console.error('Error loading student data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your data. Please try logging in again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate analytics from real data
  const calculateAnalytics = () => {
    const gradedSubmissions = submissions.filter(s => s.score !== null);
    
    return {
      totalExams: submissions.length,
      gradedExams: gradedSubmissions.length,
      averageScore: gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length
        : 0,
      performanceData: {
        labels: gradedSubmissions.map(s => s.exams?.title || 'Untitled'),
        datasets: [{
          label: 'Score (%)',
          data: gradedSubmissions.map(s => ((s.score || 0) / s.total_points) * 100),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.4,
        }]
      }
    };
  };

  // Modify the viewPerformanceReport function
  const viewPerformanceReport = () => {
    if (!studentId) return;
    router.push(`/student-report?id=${studentId}`);
  };

  if (isLoading) {
    return (
      <Flex height="100vh" align="center" justify="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Loading your dashboard...</Text>
        </VStack>
      </Flex>
    );
  }

  const analytics = calculateAnalytics();

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Header 
        currentPage="student-dashboard" 
        username={student?.name}
        userRole="student"
      />
      <Container maxW="container.xl" py={8} mt="16">
        {/* Add this button near the top of your dashboard */}
        <Flex justify="flex-end" mb={6}>
          <Button
            leftIcon={<FaChartLine />}
            colorScheme="blue"
            onClick={viewPerformanceReport}
          >
            View Performance Report
          </Button>
        </Flex>

        {/* Student Info */}
        <Box bg={useColorModeValue('white', 'gray.800')} p={6} borderRadius="lg" shadow="md" mb={8}>
          <Flex direction={{ base: 'column', md: 'row' }} align="center" justify="space-between">
            <HStack spacing={4}>
              <Avatar size="xl" name={student?.name} />
              <VStack align="start" spacing={1}>
                <Heading size="lg">{student?.name}</Heading>
                <Text>Student ID: {student?.student_id}</Text>
                <Text>{student?.email}</Text>
              </VStack>
            </HStack>
            <VStack align={{ base: 'center', md: 'flex-end' }} spacing={2}>
              <Stat>
                <StatLabel>Overall Average</StatLabel>
                <StatNumber>{analytics.averageScore.toFixed(1)}%</StatNumber>
                <StatHelpText>
                  {analytics.gradedExams} graded submissions
                </StatHelpText>
              </Stat>
            </VStack>
          </Flex>
        </Box>
        
        {/* Submissions Table */}
        <Box bg={useColorModeValue('white', 'gray.800')} p={6} borderRadius="lg" shadow="md">
          <Heading size="md" mb={4}>Your Submissions</Heading>
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Exam</Th>
                  <Th>Submitted</Th>
                  <Th>Score</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {submissions.length === 0 ? (
                  <Tr>
                    <Td colSpan={5} textAlign="center">No submissions yet</Td>
                  </Tr>
                ) : (
                  submissions.map((submission) => (
                    <Tr key={submission.id}>
                      <Td>{submission.exams?.title || 'Untitled Exam'}</Td>
                      <Td>{new Date(submission.created_at).toLocaleDateString()}</Td>
                      <Td>
                        {submission.score !== null 
                          ? `${submission.score}/${submission.total_points} (${((submission.score / submission.total_points) * 100).toFixed(1)}%)`
                          : 'Not graded'
                        }
                      </Td>
                      <Td>
                        <Badge colorScheme={submission.score !== null ? 'green' : 'yellow'}>
                          {submission.score !== null ? 'Graded' : 'Pending'}
                        </Badge>
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          leftIcon={<Icon as={FaEye} />}
                          colorScheme="blue"
                          variant="outline"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            onOpen();
                          }}
                        >
                          View
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
        
        {/* Performance Chart */}
        {submissions.length > 0 && (
          <Box bg={useColorModeValue('white', 'gray.800')} p={6} borderRadius="lg" shadow="md" mt={8}>
            <Heading size="md" mb={4}>Performance Trend</Heading>
            <Box h="300px">
              <Line 
                data={analytics.performanceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                    }
                  }
                }}
              />
            </Box>
          </Box>
        )}
      </Container>
      
      {/* Submission Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedSubmission?.exams?.title || 'Submission Details'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {selectedSubmission && (
                <>
                  <Box>
                    <Text fontWeight="bold">Submitted on:</Text>
                    <Text>{new Date(selectedSubmission.created_at).toLocaleString()}</Text>
                  </Box>
                  
                  {selectedSubmission.score !== null && selectedSubmission.total_points && (
                    <Box>
                      <Text fontWeight="bold">Score:</Text>
                      <Text>
                        {selectedSubmission.score}/{selectedSubmission.total_points} 
                        ({((selectedSubmission.score / selectedSubmission.total_points) * 100).toFixed(1)}%)
                      </Text>
                    </Box>
                  )}
                  
                  {selectedSubmission.feedback && (
                    <Box>
                      <Text fontWeight="bold">Feedback:</Text>
                      <Text>{selectedSubmission.feedback}</Text>
                    </Box>
                  )}

                  {selectedSubmission.script_file_url && (
                    <Box>
                      <Text fontWeight="bold">Submission File:</Text>
                      <Link href={selectedSubmission.script_file_url} isExternal color="blue.500">
                        {selectedSubmission.script_file_name}
                      </Link>
                    </Box>
                  )}
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}