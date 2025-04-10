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
  Image,
  Grid,
  GridItem,
  Hide,
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaUserShield, FaGraduationCap } from 'react-icons/fa';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import Header from '../components/Header';
import { customColors } from '../src/theme/colors';
import { apiRequest } from '../src/utils/api';

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
      const data = await apiRequest('auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: teacherUsername,
          password: teacherPassword,
        }),
      });
      
      // Store user info
      if (typeof window !== 'undefined') {
        localStorage.setItem('userId', data.id);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userRole', 'teacher');
      }
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      
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
      const response = await apiRequest('auth/student-login', {
        method: 'POST',
        body: JSON.stringify({
          student_id: studentId,
          password: studentPassword,
        }),
      });
      
      // Store user info from the nested user object
      if (typeof window !== 'undefined') {
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem('username', response.user.username);
        localStorage.setItem('userRole', 'student');
        
        // Store studentId specifically for student-report page
        localStorage.setItem('studentId', response.user.student_id);
        localStorage.setItem('studentName', response.user.username);
      }
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });

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
      <Container maxW="container.xl" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }} mt="16">
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr 1fr' }} gap={8} alignItems="center">
          {/* Left Image */}
          <Hide below="lg">
            <GridItem>
              <Box
                position="relative"
                height="600px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Image
                  src="\images\5e535eb7550b76782df9e820_peep-sitting-7.svg"
                  alt="Teacher illustration"
                  objectFit="contain"
                  maxH="100%"
                  w="auto"
                />
              </Box>
            </GridItem>
          </Hide>

          {/* Login Form */}
          <GridItem>
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
                              <Link as={NextLink} href="/register?role=student" color="blue.500">
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
          </GridItem>

          {/* Right Image */}
          <Hide below="lg">
            <GridItem>
              <Box
                position="relative"
                height="600px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Image
                  src="images\5e536601c67e7916da9d1aa5_peep-standing-27.svg"
                  alt="Student illustration"
                  objectFit="contain"
                  maxH="100%"
                  w="auto"
                />
              </Box>
            </GridItem>
          </Hide>
        </Grid>
      </Container>
    </>
  );
} 