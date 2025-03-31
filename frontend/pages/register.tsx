import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useColorModeValue,
  FormErrorMessage,
  InputGroup,
  InputRightElement,
  Icon,
  Flex,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Alert,
  AlertIcon,
  Link,
  VStack,
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaUserShield, FaGraduationCap } from 'react-icons/fa';
import { useRouter } from 'next/router';
import NextLink from 'next/link';

export default function Register() {
  const router = useRouter();
  const { role } = router.query;
  
  const [tabIndex, setTabIndex] = useState(role === 'student' ? 1 : 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Teacher registration state
  const [teacherName, setTeacherName] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherConfirmPassword, setTeacherConfirmPassword] = useState('');
  
  // Student registration state
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentConfirmPassword, setStudentConfirmPassword] = useState('');
  
  // Set the tab index based on the role query parameter
  useEffect(() => {
    if (role === 'student') {
      setTabIndex(1);
    } else if (role === 'teacher') {
      setTabIndex(0);
    }
  }, [role]);
  
  const handleTeacherRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate passwords match
    if (teacherPassword !== teacherConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teacherName,
          username: teacherUsername,
          email: teacherEmail,
          password: teacherPassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      setSuccess('Registration successful! You can now log in.');
      
      // Clear form
      setTeacherName('');
      setTeacherUsername('');
      setTeacherEmail('');
      setTeacherPassword('');
      setTeacherConfirmPassword('');
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login?role=teacher');
      }, 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStudentRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate passwords match
    if (studentPassword !== studentConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate student ID format (6 digits)
    if (!/^\d{6}$/.test(studentId)) {
      setError('Student ID must be a 6-digit number');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/student-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: studentName,
          student_id: studentId,
          email: studentEmail,
          password: studentPassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      setSuccess('Registration successful! You can now log in.');
      
      // Clear form
      setStudentName('');
      setStudentId('');
      setStudentEmail('');
      setStudentPassword('');
      setStudentConfirmPassword('');
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login?role=student');
      }, 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  
  return (
    <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
      <Stack spacing="8">
        <Stack spacing="6" textAlign="center">
          <Heading size="xl">Create an Account</Heading>
          <Text color={textColor}>Join AEMS to get started</Text>
        </Stack>
        
        <Box
          py={{ base: '0', sm: '8' }}
          px={{ base: '4', sm: '10' }}
          bg={bgColor}
          boxShadow="md"
          borderRadius="xl"
        >
          <Tabs isFitted variant="enclosed" index={tabIndex} onChange={setTabIndex}>
            <TabList mb="1em">
              <Tab><Icon as={FaUserShield} mr={2} /> Teacher</Tab>
              <Tab><Icon as={FaGraduationCap} mr={2} /> Student</Tab>
            </TabList>
            
            <TabPanels>
              {/* Teacher Registration Panel */}
              <TabPanel>
                <form onSubmit={handleTeacherRegister}>
                  <Stack spacing="6">
                    {error && (
                      <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        {error}
                      </Alert>
                    )}
                    
                    {success && (
                      <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        {success}
                      </Alert>
                    )}
                    
                    <FormControl isRequired>
                      <FormLabel>Full Name</FormLabel>
                      <Input
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Username</FormLabel>
                      <Input
                        value={teacherUsername}
                        onChange={(e) => setTeacherUsername(e.target.value)}
                        placeholder="Choose a username"
                      />
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Email</FormLabel>
                      <Input
                        type="email"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Password</FormLabel>
                      <InputGroup>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={teacherPassword}
                          onChange={(e) => setTeacherPassword(e.target.value)}
                          placeholder="Create a password"
                        />
                        <InputRightElement>
                          <Button
                            variant="ghost"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            <Icon as={showPassword ? FaEyeSlash : FaEye} />
                          </Button>
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Confirm Password</FormLabel>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={teacherConfirmPassword}
                        onChange={(e) => setTeacherConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                      />
                    </FormControl>
                    
                    <Button
                      type="submit"
                      colorScheme="blue"
                      size="lg"
                      fontSize="md"
                      isLoading={isLoading}
                    >
                      Register
                    </Button>
                    
                    <Text align="center">
                      Already have an account?{' '}
                      <Link as={NextLink} href="/login?role=teacher" color="blue.500">
                        Sign in
                      </Link>
                    </Text>
                  </Stack>
                </form>
              </TabPanel>
              
              {/* Student Registration Panel */}
              <TabPanel>
                <form onSubmit={handleStudentRegister}>
                  <Stack spacing="6">
                    {error && (
                      <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        {error}
                      </Alert>
                    )}
                    
                    {success && (
                      <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        {success}
                      </Alert>
                    )}
                    
                    <FormControl isRequired>
                      <FormLabel>Full Name</FormLabel>
                      <Input
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Student ID</FormLabel>
                      <Input
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="Enter your 6-digit student ID"
                        maxLength={6}
                        pattern="[0-9]{6}"
                      />
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Email</FormLabel>
                      <Input
                        type="email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Password</FormLabel>
                      <InputGroup>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                          placeholder="Create a password"
                        />
                        <InputRightElement>
                          <Button
                            variant="ghost"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            <Icon as={showPassword ? FaEyeSlash : FaEye} />
                          </Button>
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Confirm Password</FormLabel>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={studentConfirmPassword}
                        onChange={(e) => setStudentConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                      />
                    </FormControl>
                    
                    <Button
                      type="submit"
                      colorScheme="green"
                      size="lg"
                      fontSize="md"
                      isLoading={isLoading}
                    >
                      Register
                    </Button>
                    
                    <Text align="center">
                      Already have an account?{' '}
                      <Link as={NextLink} href="/login?role=student" color="green.500">
                        Sign in
                      </Link>
                    </Text>
                  </Stack>
                </form>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Stack>
    </Container>
  );
} 