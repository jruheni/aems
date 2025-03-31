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
  useToast,
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaUserShield, FaGraduationCap } from 'react-icons/fa';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import Header from '../components/Header';

export default function Login() {
  const router = useRouter();
  const { role } = router.query;
  
  const [tabIndex, setTabIndex] = useState(role === 'student' ? 1 : 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Teacher login state
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  
  // Student login state
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  
  const toast = useToast();
  
  // Set the tab index based on the role query parameter
  useEffect(() => {
    if (role === 'student') {
      setTabIndex(1);
    } else if (role === 'teacher') {
      setTabIndex(0);
    }
  }, [role]);
  
  const handleTeacherLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: teacherUsername,
          password: teacherPassword,
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Login error response:', errorText);
        throw new Error('Login failed. Please check your credentials and try again.');
      }
      
      const data = await response.json();
      
      // Store user info
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.username);
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      
      // Use replace instead of push
      router.replace('/dashboard');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to login. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStudentLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          password: studentPassword,
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Student login error response:', errorText);
        throw new Error('Login failed. Please check your credentials and try again.');
      }
      
      const data = await response.json();
      
      // Store user info
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.username);
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });

      // Use replace instead of push
      router.replace('/student-dashboard');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to login. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  return (
    <>
      <Header currentPage="login" />
      <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }} mt="16">
        <Stack spacing="8">
          <Stack spacing="6" textAlign="center">
            <Heading size="xl">Welcome to AEMS</Heading>
            <Text color={textColor}>Sign in to your account</Text>
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
                {/* Teacher Login Panel */}
                <TabPanel>
                  <form onSubmit={handleTeacherLogin}>
                    <Stack spacing="6">
                      {error && (
                        <Alert status="error" borderRadius="md">
                          <AlertIcon />
                          {error}
                        </Alert>
                      )}
                      
                      <FormControl isRequired>
                        <FormLabel htmlFor="username">Username</FormLabel>
                        <Input
                          id="username"
                          type="text"
                          value={teacherUsername}
                          onChange={(e) => setTeacherUsername(e.target.value)}
                        />
                      </FormControl>
                      
                      <FormControl isRequired>
                        <FormLabel htmlFor="password">Password</FormLabel>
                        <InputGroup>
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={teacherPassword}
                            onChange={(e) => setTeacherPassword(e.target.value)}
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
                      
                      <Button
                        type="submit"
                        colorScheme="blue"
                        size="lg"
                        fontSize="md"
                        isLoading={isLoading}
                      >
                        Sign in
                      </Button>
                      
                      <VStack spacing={2}>
                        <Text align="center">
                          Don't have an account?{' '}
                          <Link as={NextLink} href="/register?role=teacher" color="blue.500">
                            Register
                          </Link>
                        </Text>
                      </VStack>
                    </Stack>
                  </form>
                </TabPanel>
                
                {/* Student Login Panel */}
                <TabPanel>
                  <form onSubmit={handleStudentLogin}>
                    <Stack spacing="6">
                      {error && (
                        <Alert status="error" borderRadius="md">
                          <AlertIcon />
                          {error}
                        </Alert>
                      )}
                      
                      <FormControl isRequired>
                        <FormLabel htmlFor="studentId">Student ID</FormLabel>
                        <Input
                          id="studentId"
                          type="text"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="Enter your 6-digit student ID"
                          maxLength={6}
                          pattern="[0-9]{6}"
                        />
                      </FormControl>
                      
                      <FormControl isRequired>
                        <FormLabel htmlFor="studentPassword">Password</FormLabel>
                        <InputGroup>
                          <Input
                            id="studentPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={studentPassword}
                            onChange={(e) => setStudentPassword(e.target.value)}
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
                      
                      <Button
                        type="submit"
                        colorScheme="green"
                        size="lg"
                        fontSize="md"
                        isLoading={isLoading}
                      >
                        Sign in
                      </Button>
                      
                      <VStack spacing={2}>
                        <Text align="center">
                          Don't have an account?{' '}
                          <Link as={NextLink} href="/register?role=student" color="green.500">
                            Register
                          </Link>
                        </Text>
                      </VStack>
                    </Stack>
                  </form>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </Stack>
      </Container>
    </>
  );
} 