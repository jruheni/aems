import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Grid, Heading, Text, VStack, Image, Flex, Container, Link, 
  Menu, MenuButton, MenuList, MenuItem, useToast, IconButton, FormControl, 
  FormLabel, Input, Textarea, useDisclosure, HStack, SimpleGrid,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, 
  ModalBody, ModalCloseButton, Stat, StatLabel, StatNumber, StatHelpText,
  StatArrow, StatGroup, Card, CardHeader, CardBody, CardFooter, Divider,
  Tabs, TabList, TabPanels, Tab, TabPanel, Badge, Progress, Spinner,
  Select, Tooltip, InputGroup, InputLeftElement, Icon
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { MoonIcon, SunIcon, Search2Icon, EmailIcon, DownloadIcon } from '@chakra-ui/icons';
import { useColorMode, useColorModeValue } from '@chakra-ui/react';
import { FiMoreVertical, FiBarChart2, FiPieChart, FiUsers, FiCheckCircle, FiAlertCircle, FiFileText, FiStar } from 'react-icons/fi';
import { FaUserGraduate, FaChartLine, FaGraduationCap } from 'react-icons/fa';
import { getExams, createExam, Exam, getSubmissions, supabase } from '../src/services/supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area
} from 'recharts';
import Header from '../components/Header';
import { customColors, getGradients } from '../src/theme/colors';

// Define types for our analytics data
interface ExamStats {
  totalSubmissions: number;
  gradedSubmissions: number;
  averageScore: number | null;
  passingRate: number | null;
}

interface AnalyticsData {
  recentExams: Exam[];
  totalExams: number;
  totalSubmissions: number;
  totalGradedSubmissions: number;
  averageScore: number;
  passingRate: number;
  scoreDistribution: { name: string; value: number; color: string }[];
  gradingActivity: { date: string; count: number }[];
  examPerformance: { name: string; average: number; submissions: number }[];
}

// Add these interfaces
interface StudentSearchResult {
  student_id: string;
  name: string;
  submissions: any[];
  examCount: number;
  averageScore: string;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDescription, setNewExamDescription] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // Default to 30 days
  const toast = useToast();
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    recentExams: [],
    totalExams: 0,
    totalSubmissions: 0,
    totalGradedSubmissions: 0,
    averageScore: 0,
    passingRate: 0,
    scoreDistribution: [],
    gradingActivity: [],
    examPerformance: []
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  // Add this state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Add a reference to the exams section
  const examsRef = useRef<HTMLDivElement>(null);

  // Add a function to scroll to the exams section
  const scrollToExams = () => {
    examsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUsername = localStorage.getItem('username');
    
    if (!storedUserId || !storedUsername) {
      router.replace('/login');
      return;
    }

    // Add an auth check using the cookie
    fetch('/api/auth/verify', {
      credentials: 'include'
    }).then(response => {
      if (!response.ok) {
        router.replace('/login');
        return;
      }
      setUserId(storedUserId);
      setUsername(storedUsername);
      loadExams(storedUserId);
    }).catch(() => {
      router.replace('/login');
    });
  }, [router]);
  
  useEffect(() => {
    if (userId) {
      loadAnalyticsData(userId);
    }
  }, [userId, timeRange]);

  const loadExams = async (userId: string) => {
    setIsLoading(true);
    try {
      const data = await getExams(userId);
      setExams(data);
    } catch (error) {
      toast({
        title: 'Error loading exams',
        description: error instanceof Error ? error.message : 'Failed to load exams',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadAnalyticsData = async (userId: string) => {
    setIsLoadingAnalytics(true);
    try {
      // Get all exams for this user
      const examsData = await getExams(userId);
      
      // Get submissions for all exams
      let allSubmissions: any[] = [];
      let examStats: Record<string, ExamStats> = {};
      
      for (const exam of examsData) {
        const submissions = await getSubmissions(exam.id);
        allSubmissions = [...allSubmissions, ...submissions];
        
        // Calculate stats for this exam
        const gradedSubmissions = submissions.filter(s => s.score !== null);
        const scores = gradedSubmissions.map(s => s.score as number);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        const passingSubmissions = gradedSubmissions.filter(s => (s.score as number) >= 6).length;
        const passingRate = gradedSubmissions.length > 0 ? (passingSubmissions / gradedSubmissions.length) * 100 : null;
        
        examStats[exam.id] = {
          totalSubmissions: submissions.length,
          gradedSubmissions: gradedSubmissions.length,
          averageScore: avgScore,
          passingRate: passingRate
        };
      }
      
      // Calculate overall stats
      const gradedSubmissions = allSubmissions.filter(s => s.score !== null);
      const scores = gradedSubmissions.map(s => s.score as number);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const passingSubmissions = gradedSubmissions.filter(s => (s.score as number) >= 6).length;
      const passingRate = gradedSubmissions.length > 0 ? (passingSubmissions / gradedSubmissions.length) * 100 : 0;
      
      // Calculate score distribution
      const scoreRanges = [
        { name: '0-2', min: 0, max: 2, color: '#FF5252' },
        { name: '3-5', min: 3, max: 5, color: '#FFA726' },
        { name: '6-8', min: 6, max: 8, color: '#66BB6A' },
        { name: '9-10', min: 9, max: 10, color: '#2196F3' }
      ];
      
      const distribution = scoreRanges.map(range => {
        const count = gradedSubmissions.filter(
          s => (s.score as number) >= range.min && (s.score as number) <= range.max
        ).length;
        return { name: range.name, value: count, color: range.color };
      });
      
      // Calculate grading activity over time
      const days = parseInt(timeRange);
      const dateMap: Record<string, number> = {};
      
      // Initialize all dates in the range with 0
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateMap[dateStr] = 0;
      }
      
      // Count submissions by date
      gradedSubmissions.forEach(submission => {
        const submissionDate = new Date(submission.created_at).toISOString().split('T')[0];
        if (dateMap[submissionDate] !== undefined) {
          dateMap[submissionDate]++;
        }
      });
      
      // Convert to array for chart
      const gradingActivity = Object.entries(dateMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Calculate exam performance
      const examPerformance = examsData
        .filter(exam => examStats[exam.id].averageScore !== null)
        .map(exam => ({
          name: exam.title.length > 20 ? exam.title.substring(0, 20) + '...' : exam.title,
          average: examStats[exam.id].averageScore as number,
          submissions: examStats[exam.id].gradedSubmissions
        }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 5);
      
      setAnalyticsData({
        recentExams: examsData.slice(0, 5),
        totalExams: examsData.length,
        totalSubmissions: allSubmissions.length,
        totalGradedSubmissions: gradedSubmissions.length,
        averageScore: parseFloat(avgScore.toFixed(2)),
        passingRate: parseFloat(passingRate.toFixed(2)),
        scoreDistribution: distribution,
        gradingActivity,
        examPerformance
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        title: 'Error loading analytics',
        description: 'Failed to load analytics data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleCreateExam = async () => {
    if (!newExamTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Exam title is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      if (userId) {
        const newExam = await createExam(newExamTitle, newExamDescription, userId);
        setExams([newExam, ...exams]);
        onClose();
        setNewExamTitle('');
        setNewExamDescription('');
        
        toast({
          title: 'Exam created',
          description: `${newExamTitle} has been created successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Refresh analytics
        loadAnalyticsData(userId);
      }
    } catch (error) {
      toast({
        title: 'Error creating exam',
        description: error instanceof Error ? error.message : 'Failed to create exam',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleExamClick = (exam: Exam) => {
    console.log('Navigating to exam:', exam);
    router.push(`/submissions?examId=${exam.id}&examName=${encodeURIComponent(exam.title)}`);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const statCardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Add this function to search for students
  const handleStudentSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('student_id, student_name, exam_id, score, exams(title)')
        .eq('student_id', searchQuery)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const groupedResults = data.reduce((acc: Record<string, any[]>, item: any) => {
        if (!acc[item.student_id]) {
          acc[item.student_id] = [];
        }
        acc[item.student_id].push(item);
        return acc;
      }, {});
      
      setSearchResults(Object.entries(groupedResults).map(([student_id, submissions]) => ({
        student_id,
        name: submissions[0].student_name,
        submissions,
        examCount: new Set(submissions.map((s: any) => s.exam_id)).size,
        averageScore: submissions.filter((s: any) => s.score !== null).length > 0 
          ? (submissions.filter((s: any) => s.score !== null).reduce((sum: number, s: any) => sum + s.score, 0) / 
             submissions.filter((s: any) => s.score !== null).length).toFixed(1)
          : 'N/A'
      } as StudentSearchResult)));
    } catch (error) {
      console.error('Error searching students:', error);
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Add this to navigate to the student report
  const viewStudentReport = (studentId: string, studentName: string) => {
    router.push(`/student-report?id=${encodeURIComponent(studentId)}&name=${encodeURIComponent(studentName)}`);
  };

  return (
    <Box minH="100vh" bg={bgColor}>
      <Header 
        currentPage="dashboard" 
        username={username}
        userRole="teacher"
      />
      <Container maxW="container.xl" pt="24" pb="10">
        <VStack spacing={8} align="stretch">
          {/* Welcome Section */}
          <Flex 
            direction={{ base: "column", md: "row" }} 
            justify="space-between" 
            align="center"
            bg={cardBg}
            p={6}
            borderRadius="lg"
            boxShadow="sm"
          >
            <Box>
              <Heading size="lg" mb={2}>Welcome back, {username}!</Heading>
              <Text color="gray.500">
                Here's an overview of your exams and grading analytics
              </Text>
            </Box>
            <HStack spacing={4} mt={{ base: 4, md: 0 }}>
              <Select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                w="150px"
                size="sm"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </Select>
              <Button 
                colorScheme="blue" 
                leftIcon={<FiBarChart2 />}
                onClick={() => loadAnalyticsData(userId as string)}
              >
                Refresh
              </Button>
            </HStack>
          </Flex>
          
          {/* Search Bar - Now positioned at the top of the Overview panel */}
          <Box mb={8}>
            <Heading size="md" mb={4}>Student Search</Heading>
            <HStack>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <Search2Icon color="gray.300" />
                </InputLeftElement>
                <Input 
                  placeholder="Search by student ID (6 digits)..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleStudentSearch()}
                  maxLength={6}
                  pattern="[0-9]{6}"
                />
              </InputGroup>
              <Button 
                colorScheme="blue" 
                onClick={handleStudentSearch}
                isLoading={isSearching}
              >
                Search
              </Button>
            </HStack>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <Box mt={4}>
                <Heading size="sm" mb={2}>Search Results</Heading>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {searchResults.map((student, index) => (
                    <Card key={index} variant="outline">
                      <CardBody>
                        <Flex justify="space-between" align="center">
                          <VStack align="start" spacing={1}>
                            <Heading size="sm">{student.name}</Heading>
                            <HStack spacing={4}>
                              <Text fontSize="sm">
                                <Icon as={FaGraduationCap} mr={1} />
                                ID: {student.student_id}
                              </Text>
                              <Text fontSize="sm">
                                <Icon as={FiFileText} mr={1} />
                                {student.examCount} {student.examCount === 1 ? 'exam' : 'exams'}
                              </Text>
                              <Text fontSize="sm">
                                <Icon as={FiStar} mr={1} />
                                Avg: {student.averageScore}
                              </Text>
                            </HStack>
                          </VStack>
                          <Button 
                            size="sm" 
                            colorScheme="blue" 
                            variant="ghost"
                            onClick={() => viewStudentReport(student.student_id, student.name)}
                          >
                            View Report
                          </Button>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Box>
            )}
          </Box>
          
          {/* Analytics Section - Now positioned after the search bar */}
          <Heading size="md" mb={4}>Analytics Overview</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
            <Stat
              px={{ base: 2, md: 4 }}
              py="5"
              shadow="base"
              borderColor={customColors.orange}
              rounded="lg"
              bg={useColorModeValue('white', 'gray.700')}
              _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
              transition="all 0.2s"
            >
              <StatLabel fontWeight="semibold">Total Exams</StatLabel>
              <StatNumber fontSize="3xl">
                {isLoadingAnalytics ? <Spinner size="sm" /> : analyticsData.totalExams}
              </StatNumber>
              <StatHelpText>Created exams</StatHelpText>
            </Stat>
            
            <Stat 
              bg={cardBg} 
              p={5} 
              borderRadius="lg" 
              boxShadow="sm"
              border="1px"
              borderColor={borderColor}
            >
              <Flex align="center" mb={2}>
                <Box 
                  p={2} 
                  bg="green.50" 
                  color="green.500" 
                  borderRadius="md" 
                  mr={3}
                >
                  <FiUsers size={20} />
                </Box>
                <StatLabel fontSize="lg">Submissions</StatLabel>
              </Flex>
              <StatNumber fontSize="3xl">{analyticsData.totalSubmissions}</StatNumber>
              <StatHelpText>
                {analyticsData.totalGradedSubmissions} graded ({analyticsData.totalSubmissions > 0 
                  ? ((analyticsData.totalGradedSubmissions / analyticsData.totalSubmissions) * 100).toFixed(0) 
                  : 0}%)
              </StatHelpText>
            </Stat>
            
            <Stat 
              bg={cardBg} 
              p={5} 
              borderRadius="lg" 
              boxShadow="sm"
              border="1px"
              borderColor={borderColor}
            >
              <Flex align="center" mb={2}>
                <Box 
                  p={2} 
                  bg="purple.50" 
                  color="purple.500" 
                  borderRadius="md" 
                  mr={3}
                >
                  <FiPieChart size={20} />
                </Box>
                <StatLabel fontSize="lg">Average Score</StatLabel>
              </Flex>
              <StatNumber fontSize="3xl">{analyticsData.averageScore}</StatNumber>
              <StatHelpText>
                <StatArrow type={analyticsData.averageScore >= 6 ? 'increase' : 'decrease'} />
                {analyticsData.averageScore >= 6 ? 'Above passing' : 'Below passing'}
              </StatHelpText>
            </Stat>
            
            <Stat 
              bg={cardBg} 
              p={5} 
              borderRadius="lg" 
              boxShadow="sm"
              border="1px"
              borderColor={borderColor}
            >
              <Flex align="center" mb={2}>
                <Box 
                  p={2} 
                  bg={analyticsData.passingRate >= 70 ? "green.50" : "red.50"} 
                  color={analyticsData.passingRate >= 70 ? "green.500" : "red.500"} 
                  borderRadius="md" 
                  mr={3}
                >
                  {analyticsData.passingRate >= 70 ? <FiCheckCircle size={20} /> : <FiAlertCircle size={20} />}
                </Box>
                <StatLabel fontSize="lg">Passing Rate</StatLabel>
              </Flex>
              <StatNumber fontSize="3xl">{analyticsData.passingRate}%</StatNumber>
              <StatHelpText>
                <StatArrow type={analyticsData.passingRate >= 70 ? 'increase' : 'decrease'} />
                {analyticsData.passingRate >= 70 ? 'Good' : 'Needs improvement'}
              </StatHelpText>
            </Stat>
          </SimpleGrid>
          
          {/* Charts Section */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            <Card bg={cardBg} borderRadius="lg" boxShadow="sm">
              <CardHeader pb={0}>
                <Heading size="md">Grading Activity</Heading>
              </CardHeader>
              <CardBody>
                <Box height="300px">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analyticsData.gradingActivity}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value} submissions`, 'Graded']}
                        labelFormatter={(label: string) => `Date: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>
            
            <Card bg={cardBg} borderRadius="lg" boxShadow="sm">
              <CardHeader pb={0}>
                <Heading size="md">Score Distribution</Heading>
              </CardHeader>
              <CardBody>
                <Box height="300px">
                  {analyticsData.totalGradedSubmissions > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.scoreDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }: { name: string; percent: number }) => 
                            percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        >
                          {analyticsData.scoreDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: number, name: string) => [`${value} submissions`, `Score ${name}`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Flex height="100%" alignItems="center" justifyContent="center">
                      <Text color="gray.500">No graded submissions yet</Text>
                    </Flex>
                  )}
                </Box>
              </CardBody>
            </Card>
          </SimpleGrid>
          
          {/* Exam Performance */}
          <Card bg={cardBg} borderRadius="lg" boxShadow="sm">
            <CardHeader pb={0}>
              <Heading size="md">Exam Performance</Heading>
            </CardHeader>
            <CardBody>
              <Box height="300px">
                {analyticsData.examPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData.examPerformance}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 10]} />
                      <YAxis type="category" dataKey="name" width={150} />
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}`, 'Average Score']}
                        labelFormatter={(label: string) => `Exam: ${label}`}
                      />
                      <Bar 
                        dataKey="average" 
                        fill={customColors.orange}
                        radius={[4, 4, 0, 0]}
                      >
                        {analyticsData.examPerformance.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.average >= 6 ? customColors.orange : customColors.coral} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Flex height="100%" alignItems="center" justifyContent="center">
                    <Text color="gray.500">No exam performance data available</Text>
                  </Flex>
                )}
              </Box>
            </CardBody>
          </Card>
          
          {/* Recent Exams Section */}
          <Box mt={8}>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md">Your Exams</Heading>
              <Button
                colorScheme="blue"
                bg={customColors.orange}
                color="white"
                _hover={{ bg: customColors.coral }}
                onClick={onOpen}
              >
                Create New Exam
              </Button>
            </Flex>
            
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
              {isLoading ? (
                <Flex justify="center" py={10} gridColumn="1 / -1">
                  <Spinner size="xl" color="blue.500" />
                </Flex>
              ) : exams.length === 0 ? (
                <Box 
                  p={6} 
                  borderWidth={1} 
                  borderRadius="lg" 
                  textAlign="center"
                  gridColumn="1 / -1"
                  bg={cardBg}
                >
                  <Text mb={4}>You haven't created any exams yet.</Text>
                  <Button
                    colorScheme="blue"
                    bg={customColors.orange}
                    color="white"
                    _hover={{ bg: customColors.coral }}
                    onClick={onOpen}
                  >
                    Create Your First Exam
                  </Button>
                </Box>
              ) : (
                exams.map((exam) => (
                  <Box
                    key={exam.id}
                    p={5}
                    borderWidth={1}
                    borderRadius="lg"
                    bg={cardBg}
                    boxShadow="sm"
                    cursor="pointer"
                    position="relative"
                    onClick={() => handleExamClick(exam)}
                    _hover={{ 
                      borderColor: customColors.orange,
                      transform: 'translateY(-2px)',
                      boxShadow: 'md'
                    }}
                    transition="all 0.2s"
                  >
                    <Heading size="sm" mb={2} noOfLines={2}>{exam.title}</Heading>
                    <Text fontSize="sm" color="gray.500" mb={4}>
                      Created: {new Date(exam.created_at || '').toLocaleDateString()}
                    </Text>
                    
                    <Divider mb={4} />
                    
                    <HStack spacing={4} justify="space-between">
                      <Badge colorScheme="blue" borderRadius="full" px={2}>
                        Exam
                      </Badge>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          aria-label="Options"
                          icon={<FiMoreVertical />}
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <MenuList onClick={(e) => e.stopPropagation()}>
                          <MenuItem onClick={() => {
                            setIsRenaming(true);
                            setCurrentExam(exam);
                            setNewExamTitle(exam.title);
                            setNewExamDescription(exam.description || '');
                            onOpen();
                          }}>Rename</MenuItem>
                          <MenuItem onClick={() => {
                            // Implement delete functionality
                          }}>Delete</MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  </Box>
                ))
              )}
            </SimpleGrid>
          </Box>
        </VStack>
      </Container>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isRenaming ? 'Rename Exam' : 'Create New Exam'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Exam Title</FormLabel>
                <Input
                  placeholder="Enter exam title"
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description (Optional)</FormLabel>
                <Textarea
                  placeholder="Enter exam description..."
                  value={newExamDescription}
                  onChange={(e) => setNewExamDescription(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleCreateExam}>
              Submit
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Dashboard; 