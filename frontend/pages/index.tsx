import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Stack,
  Icon,
  useColorModeValue,
  VStack,
  HStack,
  Image,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useBreakpointValue,
  Divider,
  Link as ChakraLink,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  FormErrorMessage,
  useToast,
} from '@chakra-ui/react';
import { FaGraduationCap, FaChartLine, FaRobot, FaClipboardCheck, FaUserShield, FaLaptopCode, FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion } from 'framer-motion';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { IconType } from 'react-icons';
import Header from '../components/Header';

// Add this near the top of the file, after the imports
const customColors = {
  orange: '#ff8906',
  coral: '#f25f4c',
  pink: '#e53170',
};

// Then update the MotionBox and MotionFlex declarations
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

// Define types for our components
interface FeatureProps {
  title: string;
  text: string;
  icon: IconType;
}

interface TestimonialProps {
  content: string;
  author: string;
  role: string;
}

interface StatisticProps {
  label: string;
  value: string;
  change: string;
  isIncrease: boolean;
}

const Feature = ({ title, text, icon }: FeatureProps) => {
  return (
    <VStack
      align={'center'}
      p={5}
      borderWidth="1px"
      borderRadius="lg"
      transition="all 0.3s"
      _hover={{ transform: 'translateY(-5px)', shadow: 'lg' }}
    >
      <Box
        w={16}
        h={16}
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderRadius="full"
        bg={useColorModeValue('blue.100', 'blue.900')}
        color={useColorModeValue('blue.500', 'blue.200')}
        mb={4}
      >
        <Icon as={icon} w={8} h={8} />
      </Box>
      <Text fontWeight={600} fontSize="lg">{title}</Text>
      <Text textAlign="center" color={useColorModeValue('gray.600', 'gray.400')}>{text}</Text>
    </VStack>
  );
};

const Testimonial = ({ content, author, role }: TestimonialProps) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  return (
    <Box
      p={6}
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      position="relative"
      zIndex={1}
      shadow="md"
    >
      <Text fontSize="md" mb={4}>"{content}"</Text>
      <HStack>
        <VStack align="start" spacing={0}>
          <Text fontWeight="bold">{author}</Text>
          <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>{role}</Text>
        </VStack>
      </HStack>
    </Box>
  );
};

const Statistic = ({ label, value, change, isIncrease }: StatisticProps) => {
  return (
    <Stat
      px={4}
      py={5}
      borderWidth="1px"
      borderRadius="lg"
      shadow="sm"
    >
      <StatLabel fontWeight="medium" isTruncated>{label}</StatLabel>
      <StatNumber fontSize="3xl" fontWeight="bold">{value}</StatNumber>
      <StatHelpText>
        <StatArrow type={isIncrease ? 'increase' : 'decrease'} />
        {change}
      </StatHelpText>
    </Stat>
  );
};

export default function Home() {
  const router = useRouter();
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [isTeacherLoading, setIsTeacherLoading] = useState(false);
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [teacherError, setTeacherError] = useState('');
  const [studentError, setStudentError] = useState('');
  const toast = useToast();

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError('');
    setIsTeacherLoading(true);
    
    try {
      // Simulate login - replace with actual authentication
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any non-empty values
      if (teacherEmail && teacherPassword) {
        toast({
          title: 'Login successful',
          description: 'Redirecting to teacher dashboard',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        router.push('/dashboard');
      } else {
        setTeacherError('Please enter both email and password');
      }
    } catch (error) {
      setTeacherError('Login failed. Please check your credentials.');
    } finally {
      setIsTeacherLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');
    setIsStudentLoading(true);
    
    try {
      // Simulate login - replace with actual authentication
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validate student ID format (6 digits)
      const studentIdRegex = /^\d{6}$/;
      if (!studentIdRegex.test(studentId)) {
        setStudentError('Student ID must be a 6-digit number');
        setIsStudentLoading(false);
        return;
      }
      
      // For demo purposes, accept any valid student ID and non-empty password
      if (studentId && studentPassword) {
        toast({
          title: 'Login successful',
          description: 'Redirecting to student dashboard',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        router.push('/student-dashboard');
      } else {
        setStudentError('Please enter both student ID and password');
      }
    } catch (error) {
      setStudentError('Login failed. Please check your credentials.');
    } finally {
      setIsStudentLoading(false);
    }
  };

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const headingColor = useColorModeValue('gray.800', 'white');
  const cardBg = useColorModeValue('white', 'gray.800');
  const buttonSize = useBreakpointValue({ base: 'md', md: 'lg' });

  return (
    <>
      <Header currentPage="landing" />
      <Box mt="16">
        <Box bg={bgColor} minH="100vh">
          {/* Hero Section */}
          <Box
            position="relative"
            overflow="hidden"
            bg={`linear-gradient(135deg, ${customColors.coral} 0%, ${customColors.pink} 100%)`}
            color="white"
          >
            {/* Decorative Elements */}
            <Box
              position="absolute"
              top="-10%"
              right="-10%"
              width="600px"
              height="600px"
              borderRadius="full"
              bg={`linear-gradient(45deg, ${customColors.orange}22, ${customColors.coral}22)`}
              filter="blur(40px)"
            />
            <Box
              position="absolute"
              bottom="-20%"
              left="-10%"
              width="400px"
              height="400px"
              borderRadius="full"
              bg={`linear-gradient(45deg, ${customColors.pink}22, ${customColors.coral}22)`}
              filter="blur(40px)"
            />

            <Container maxW="container.xl" py={20}>
              <Stack
                direction={{ base: 'column', lg: 'row' }}
                spacing={10}
                align="center"
                justify="space-between"
              >
                <MotionBox
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  flex={1}
                >
                  <Heading
                    size="2xl"
                    lineHeight="shorter"
                    mb={6}
                    fontWeight="extrabold"
                  >
                    Automated Exam Marking System
                  </Heading>
                  <Text fontSize="xl" mb={8} opacity={0.9}>
                    Transform your exam management with our intelligent grading system.
                    Save time, reduce errors, and gain valuable insights.
                  </Text>
                  <HStack spacing={4}>
                    <Button
                      size="lg"
                      bg={customColors.orange}
                      _hover={{ bg: customColors.coral }}
                      onClick={() => router.push('/login?role=teacher')}
                    >
                      Teacher Login
                    </Button>
                    <Button
                      size="lg"
                      bg={customColors.pink}
                      _hover={{ opacity: 0.9 }}
                      onClick={() => router.push('/login?role=student')}
                    >
                      Student Login
                    </Button>
                  </HStack>
                </MotionBox>

                <MotionBox
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  flex={1}
                >
                  <Image
                    src="\images\Open Doodles - Stuff To Do.png" // Add a relevant illustration
                    alt="AEMS Platform"
                    width="100%"
                    maxW="600px"
                  />
                </MotionBox>
              </Stack>
            </Container>
          </Box>

          {/* Features Section */}
          <Box as="section" py={20}>
            <Container maxW="container.xl">
              <VStack spacing={12}>
                <VStack spacing={2} textAlign="center">
                  <Heading as="h2" size="xl">Key Features</Heading>
                  <Text color={textColor} maxW="2xl">
                    Our platform offers a comprehensive suite of tools designed to streamline the exam assessment process.
                  </Text>
                </VStack>
                
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10} width="full">
                  <Feature
                    icon={FaRobot}
                    title="AI-Powered Grading"
                    text="Leverage advanced machine learning algorithms to automatically grade exams with high accuracy."
                  />
                  <Feature
                    icon={FaChartLine}
                    title="Performance Analytics"
                    text="Gain valuable insights into student performance with comprehensive analytics and visualizations."
                  />
                  <Feature
                    icon={FaClipboardCheck}
                    title="Customizable Rubrics"
                    text="Create and apply detailed grading rubrics to ensure consistent and fair assessment."
                  />
                  <Feature
                    icon={FaGraduationCap}
                    title="Student Dashboard"
                    text="Students can access their exam results, feedback, and performance trends in one place."
                  />
                  <Feature
                    icon={FaUserShield}
                    title="Secure & Private"
                    text="Enterprise-grade security ensures that all student data and exam results remain protected."
                  />
                  <Feature
                    icon={FaLaptopCode}
                    title="Easy Integration"
                    text="Seamlessly integrates with existing learning management systems and educational platforms."
                  />
                </SimpleGrid>
              </VStack>
            </Container>
          </Box>

          {/* Statistics Section */}
          <Box as="section" py={20} bg={useColorModeValue('gray.100', 'gray.700')}>
            <Container maxW="container.xl">
              <VStack spacing={12}>
                <VStack spacing={2} textAlign="center">
                  <Heading as="h2" size="xl">Why Choose AEMS?</Heading>
                  <Text color={textColor} maxW="2xl">
                    Join hundreds of educational institutions already benefiting from our platform.
                  </Text>
                </VStack>
                
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} width="full">
                  <Statistic
                    label="Time Saved"
                    value="70%"
                    change="compared to manual grading"
                    isIncrease={true}
                  />
                  <Statistic
                    label="Grading Accuracy"
                    value="95%"
                    change="alignment with expert graders"
                    isIncrease={true}
                  />
                  <Statistic
                    label="Student Satisfaction"
                    value="89%"
                    change="from faster feedback"
                    isIncrease={true}
                  />
                  <Statistic
                    label="Cost Reduction"
                    value="60%"
                    change="in assessment resources"
                    isIncrease={true}
                  />
                </SimpleGrid>
              </VStack>
            </Container>
          </Box>

          {/* Testimonials Section */}
          <Box as="section" py={20}>
            <Container maxW="container.xl">
              <VStack spacing={12}>
                <VStack spacing={2} textAlign="center">
                  <Heading as="h2" size="xl">What Educators Say</Heading>
                  <Text color={textColor} maxW="2xl">
                    Hear from teachers and administrators who have transformed their assessment process.
                  </Text>
                </VStack>
                
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} width="full">
                  <Testimonial
                    content="AEMS has revolutionized how we handle assessments. What used to take weeks now takes days, and the insights we get are invaluable for improving our teaching methods."
                    author="Dr. Sarah Johnson"
                    role="Department Head, Computer Science"
                  />
                  <Testimonial
                    content="The accuracy of the AI grading has been impressive. It's not just about saving time—it's about providing consistent, fair evaluations for all students."
                    author="Prof. Michael Chen"
                    role="Mathematics Instructor"
                  />
                  <Testimonial
                    content="My students love getting their results quickly. The detailed feedback helps them understand their strengths and weaknesses much better than traditional grading."
                    author="Lisa Rodriguez"
                    role="High School Science Teacher"
                  />
                </SimpleGrid>
              </VStack>
            </Container>
          </Box>

          {/* CTA Section */}
          <Box 
            as="section" 
            py={20} 
            bg={useColorModeValue('blue.50', 'blue.900')}
          >
            <Container maxW="container.md" textAlign="center">
              <VStack spacing={8}>
                <Heading as="h2" size="xl">Ready to Transform Your Assessment Process?</Heading>
                <Text fontSize="lg" maxW="2xl">
                  Join thousands of educators who are saving time, reducing stress, and gaining valuable insights with AEMS.
                </Text>
                <HStack spacing={4}>
                  <Button 
                    as={NextLink} 
                    href="/register"
                    size={buttonSize} 
                    colorScheme="blue"
                    height="60px"
                    px={8}
                  >
                    Sign Up Now
                  </Button>
                  <Button 
                    as={NextLink} 
                    href="/demo"
                    size={buttonSize} 
                    variant="outline" 
                    colorScheme="blue"
                    height="60px"
                    px={8}
                  >
                    Request Demo
                  </Button>
                </HStack>
              </VStack>
            </Container>
          </Box>

          {/* Footer */}
          <Box as="footer" bg={useColorModeValue('gray.100', 'gray.800')} color={textColor} py={10}>
            <Container maxW="container.xl">
              <Stack 
                direction={{ base: 'column', md: 'row' }} 
                spacing={8} 
                justify="space-between"
                align={{ base: 'center', md: 'flex-start' }}
                textAlign={{ base: 'center', md: 'left' }}
              >
                <VStack align={{ base: 'center', md: 'flex-start' }} spacing={4}>
                  <Heading size="md">AEMS</Heading>
                  <Text color={textColor}>
                    Automated Exam Marking System
                  </Text>
                  <Text fontSize="sm" color={textColor}>
                    © {new Date().getFullYear()} AEMS. All rights reserved.
                  </Text>
                </VStack>
                
                <VStack align={{ base: 'center', md: 'flex-start' }} spacing={4}>
                  <Heading size="sm">Quick Links</Heading>
                  <ChakraLink as={NextLink} href="/about" color={textColor}>About</ChakraLink>
                  <ChakraLink as={NextLink} href="/features" color={textColor}>Features</ChakraLink>
                  <ChakraLink as={NextLink} href="/pricing" color={textColor}>Pricing</ChakraLink>
                </VStack>
                
                <VStack align={{ base: 'center', md: 'flex-start' }} spacing={4}>
                  <Heading size="sm">Resources</Heading>
                  <ChakraLink as={NextLink} href="/blog" color={textColor}>Blog</ChakraLink>
                  <ChakraLink as={NextLink} href="/documentation" color={textColor}>Documentation</ChakraLink>
                  <ChakraLink as={NextLink} href="/support" color={textColor}>Support</ChakraLink>
                </VStack>
                
                <VStack align={{ base: 'center', md: 'flex-start' }} spacing={4}>
                  <Heading size="sm">Legal</Heading>
                  <ChakraLink as={NextLink} href="/privacy" color={textColor}>Privacy Policy</ChakraLink>
                  <ChakraLink as={NextLink} href="/terms" color={textColor}>Terms of Service</ChakraLink>
                </VStack>
              </Stack>
            </Container>
          </Box>
        </Box>
      </Box>
    </>
  );
}