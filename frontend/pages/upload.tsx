import { NextPage } from 'next'
import Head from 'next/head'
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  useColorModeValue,
  Input,
  Button,
  useToast,
  Progress,
  Icon,
  Divider,
  SimpleGrid,
  Card,
  CardBody,
  List,
  ListItem,
  ListIcon,
  Select,
  Tooltip,
  useTheme,
  Flex,
  Badge,
  CloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  Image,
  IconButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react'
import { FaCloudUploadAlt, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaPlus, FaTrash, FaFileAlt } from 'react-icons/fa'
import Layout from '@/components/Layout'
import { useRouter } from 'next/router'

/**
 * Interface for managing file uploads
 * Tracks both the file object and its preview URL
 */
interface FileUpload {
  file: File
  preview: string
  id: string
}

interface ResultItem {
  score: number;
  feedback: string;
  total_points?: number;
  studentName?: string;
  extractedText?: {
    rubric?: string;
    script?: string;
  };
}

interface FileInfo {
  file: File;
  preview: string;
  id: string;
}

interface ExamSubmission {
  id: string;
  examName: string;
  rubric: FileInfo | null;
  testScript: FileInfo | null;
  results: ResultItem | { score: number; feedback: string; total_points?: number };
  date: string;
  studentName?: string;
  scriptFileName?: string;
  extractedText?: {
    rubric?: string;
    script?: string;
  };
}

// Type definition for grading strictness levels
type StrictnessLevel = 1 | 2 | 3 | 4;

/**
 * Grading standards configuration
 * Defines different levels of grading strictness and their descriptions
 */
const GRADING_STANDARDS = {
  1: {
    name: "Content Focus",
    description: "Focus solely on content and understanding. Ignore spelling, grammar, and formatting issues."
  },
  2: {
    name: "Standard",
    description: "Balance between content and presentation. Minor errors have small impact."
  },
  3: {
    name: "Strict",
    description: "Thorough evaluation of both content and presentation."
  },
  4: {
    name: "Academic",
    description: "Rigorous academic standard with high expectations for precision."
  }
} as const;

/**
 * Custom button component with progress indicator
 * Shows loading state with a progress bar that fills from left to right
 * Changes color based on loading state and progress
 */
const ProgressButton = ({ 
  onClick, 
  isLoading, 
  isDisabled, 
  progress, 
  children 
}: { 
  onClick: (e: React.FormEvent) => Promise<void>, 
  isLoading: boolean, 
  isDisabled: boolean,
  progress: number,
  children: React.ReactNode 
}) => {
  const theme = useTheme()
  const customBlue = "rgb(83, 129, 202)"
  const customBlueHover = "rgb(73, 119, 192)" // Slightly darker for hover
  const loadingBgColor = useColorModeValue('gray.100', 'gray.700')

  return (
    <Button
      position="relative"
      size="lg"
      w="full"
      onClick={onClick}
      isDisabled={isDisabled}
      overflow="hidden"
      bg={isLoading ? loadingBgColor : customBlue}
      color={isLoading && !progress ? 'black' : 'white'}
      _hover={{
        bg: isLoading ? loadingBgColor : customBlueHover,
      }}
    >
      {isLoading && (
        <Box
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          width={`${progress}%`}
          bg={customBlue}
          transition="width 0.3s ease"
        />
      )}
      <Text
        position="relative"
        zIndex={1}
      >
        {isLoading ? 'Processing...' : children}
      </Text>
    </Button>
  )
}

interface LayoutProps {
  children: React.ReactNode;
}

// Simplified function to extract student name from filename
const extractStudentNameFromFilename = (filename: string): string => {
  // Remove file extension
  const nameWithoutExtension = filename.split('.')[0];
  
  // Convert camelCase or snake_case to spaces
  const nameWithSpaces = nameWithoutExtension
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ')         // Replace underscores with spaces
    .replace(/-/g, ' ');        // Replace hyphens with spaces
  
  // Capitalize each word
  const formattedName = nameWithSpaces
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  console.log(`Extracted student name from filename "${filename}": "${formattedName}"`);
  return formattedName;
};

// Add these functions to save and load the rubric from localStorage

// Save rubric to localStorage for a specific exam
const saveRubricForExam = (examName: string, rubricInfo: FileInfo) => {
  try {
    const examRubrics = JSON.parse(localStorage.getItem('examRubrics') || '{}');
    
    // We need to create a serializable version of the rubric
    // since File objects can't be directly serialized
    const serializableRubric = {
      fileName: rubricInfo.file.name,
      fileType: rubricInfo.file.type,
      fileSize: rubricInfo.file.size,
      preview: rubricInfo.preview,
      id: rubricInfo.id
    };
    
    examRubrics[examName] = serializableRubric;
    localStorage.setItem('examRubrics', JSON.stringify(examRubrics));
    console.log(`Saved rubric for exam: ${examName}`);
  } catch (error) {
    console.error('Error saving rubric to localStorage:', error);
  }
};

// Load rubric from localStorage for a specific exam
const loadRubricForExam = (examName: string): FileInfo | null => {
  try {
    const examRubrics = JSON.parse(localStorage.getItem('examRubrics') || '{}');
    const savedRubric = examRubrics[examName];
    
    if (!savedRubric) return null;
    
    // Create a new File object from the saved data
    // Note: We can't fully reconstruct the original File object,
    // but we can create a placeholder with the same metadata
    const file = new File(
      [new Blob([''], { type: savedRubric.fileType })], 
      savedRubric.fileName, 
      { type: savedRubric.fileType }
    );
    
    return {
      file,
      preview: savedRubric.preview,
      id: savedRubric.id
    };
  } catch (error) {
    console.error('Error loading rubric from localStorage:', error);
    return null;
  }
};

const Upload: NextPage = () => {
  const router = useRouter();
  const { examName } = router.query;
  const [username, setUsername] = useState<string>('');
  const [rubric, setRubric] = useState<FileInfo | null>(null);
  const [testScript, setTestScript] = useState<FileInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [strictnessLevel, setStrictnessLevel] = useState<number>(2);
  const [previousSubmissions, setPreviousSubmissions] = useState<ExamSubmission[]>([]);
  const toast = useToast();
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      
      // Load previous submissions
      const submissions = localStorage.getItem(`submissions_${storedUsername}`);
      if (submissions) {
        const allSubmissions = JSON.parse(submissions);
        
        // Filter submissions by the current exam name
        if (examName) {
          const filteredSubmissions = allSubmissions.filter(
            (submission: ExamSubmission) => submission.examName === examName
          );
          setPreviousSubmissions(filteredSubmissions);
          
          // Load the saved rubric for this exam
          const savedRubric = loadRubricForExam(examName as string);
          if (savedRubric) {
            console.log(`Loaded saved rubric for exam: ${examName}`);
            setRubric(savedRubric);
          }
        } else {
          setPreviousSubmissions(allSubmissions);
        }
      } else if (examName) {
        // Even if there are no submissions, try to load the rubric
        const savedRubric = loadRubricForExam(examName as string);
        if (savedRubric) {
          console.log(`Loaded saved rubric for exam: ${examName}`);
          setRubric(savedRubric);
        }
      }
    } else {
      router.push('/login');
    }
  }, [router, examName]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute('inert', '');
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, handler: (files: File[]) => void) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    handler(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, handler: (files: File[]) => void) => {
    if (e.target.files) {
      handler(Array.from(e.target.files));
    }
  };

  const handleRubricDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (!file.type.match(/^image\/(jpeg|png)|application\/pdf/)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PNG, JPG, or PDF file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const rubricInfo = {
          file,
          preview: result,
          id: Math.random().toString(36).substring(2, 9)
        };
        setRubric(rubricInfo);
        
        // Save the rubric for this exam
        if (examName) {
          saveRubricForExam(examName as string, rubricInfo);
        }
      }
    };
    reader.readAsDataURL(file);
  }, [toast, examName]);

  const handleTestScriptDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file.type.match(/^image\/(jpeg|png)|application\/pdf/)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PNG, JPG, or PDF file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setTestScript({
          file,
          preview: result,
          id: Math.random().toString(36).substring(2, 9),
        });
      }
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleUpload = async () => {
    if (!rubric || !testScript) {
      toast({
        title: 'Missing files',
        description: 'Please upload both rubric and test script',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('rubric', rubric.file);
    formData.append('test_script', testScript.file);
    formData.append('strictness_level', strictnessLevel.toString());

    try {
      const response = await fetch('http://127.0.0.1:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();
      setResults(result);
      
      // Extract student name from filename
      const studentName = extractStudentNameFromFilename(testScript.file.name);
      
      // Create a new submission with extracted text
      const newSubmission: ExamSubmission = {
        id: Date.now().toString(),
        examName: examName as string,
        rubric,
        testScript,
        results: {
          score: result.score || 0,
          feedback: result.feedback || 'No feedback available',
          total_points: result.total_points || 10
        },
        date: new Date().toISOString(),
        studentName: studentName,
        scriptFileName: testScript.file.name,
        extractedText: result.extracted_text ? {
          rubric: result.extracted_text.rubric || '',
          script: result.extracted_text.test_script || ''
        } : undefined
      };
      
      // Update previous submissions
      const updated = [...previousSubmissions, newSubmission];
      setPreviousSubmissions(updated);
      
      // Save to localStorage
      const allSubmissions = JSON.parse(localStorage.getItem(`submissions_${username}`) || '[]');
      const updatedAllSubmissions = [...allSubmissions, newSubmission];
      localStorage.setItem(`submissions_${username}`, JSON.stringify(updatedAllSubmissions));
      
      // Clear only the test script, keep the rubric
      setTestScript(null);
      
      toast({
        title: 'Success',
        description: 'Files processed successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Upload failed',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Update the function to remove the rubric
  const handleRemoveRubric = () => {
    setRubric(null);
    
    // Also remove from localStorage
    if (examName) {
      const examRubrics = JSON.parse(localStorage.getItem('examRubrics') || '{}');
      delete examRubrics[examName as string];
      localStorage.setItem('examRubrics', JSON.stringify(examRubrics));
      console.log(`Removed rubric for exam: ${examName}`);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Upload Exam - AEMS</title>
        <meta name="description" content="Upload and grade exam papers" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
        <Box textAlign="center" py={20}>
          <Flex justify="flex-end" mb={4} px={4}>
            <Text fontSize="xl" fontWeight="semibold" color={useColorModeValue('gray.700', 'gray.200')}>
              Welcome, {username}!
            </Text>
          </Flex>
          <Heading
            as="h1"
            size="2xl"
            bgGradient="linear(to-r, blue.400, purple.500)"
            backgroundClip="text"
            mb={4}
          >
            Upload Exam
          </Heading>
          <Text fontSize="xl" color={useColorModeValue('gray.600', 'gray.400')} mb={8}>
            {examName ? `Uploading for: ${examName}` : 'Upload your exam papers for grading'}
          </Text>

          <Tabs isFitted variant="enclosed">
            <TabList mb="1em">
              <Tab>Upload Files</Tab>
              <Tab>Previous Submissions</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <VStack spacing={8} py={10} w="full" maxW="4xl" mx="auto">
                  {!rubric ? (
                    <Box
                      w="full"
                      h="200px"
                      border="2px dashed"
                      borderColor={useColorModeValue('gray.200', 'gray.700')}
                      rounded="lg"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      position="relative"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleRubricDrop(Array.from(e.dataTransfer.files));
                      }}
                    >
                      <Input
                        type="file"
                        height="100%"
                        width="100%"
                        position="absolute"
                        top="0"
                        left="0"
                        opacity="0"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleRubricDrop(Array.from(e.target.files));
                          }
                        }}
                      />
                      <Icon as={FaCloudUploadAlt} w={12} h={12} color="blue.500" mb={4} />
                      <Text fontSize="lg" mb={2}>Upload Rubric</Text>
                      <Text color="gray.500" fontSize="sm">Upload the rubric file (PNG, JPG, or PDF)</Text>
                    </Box>
                  ) : (
                    <Box
                      w="full"
                      p={6}
                      bg="green.50"
                      borderWidth={1}
                      borderColor="green.200"
                      rounded="lg"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <HStack w="full" spacing={4}>
                        <Icon as={FaFileAlt} color="green.500" boxSize={8} />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="lg" fontWeight="bold" color="green.700">Rubric Uploaded</Text>
                          <Text color="green.600">{rubric.file.name}</Text>
                        </VStack>
                        <CloseButton onClick={handleRemoveRubric} color="green.700" />
                      </HStack>
                    </Box>
                  )}

                  {!testScript ? (
                    <Box
                      w="full"
                      h="200px"
                      border="2px dashed"
                      borderColor={useColorModeValue('gray.200', 'gray.700')}
                      rounded="lg"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      position="relative"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleTestScriptDrop(Array.from(e.dataTransfer.files));
                      }}
                    >
                      <Input
                        type="file"
                        height="100%"
                        width="100%"
                        position="absolute"
                        opacity="0"
                        aria-hidden="true"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleTestScriptDrop(Array.from(e.target.files));
                          }
                        }}
                      />
                      <Icon as={FaCloudUploadAlt} w={12} h={12} color="blue.500" mb={4} />
                      <Text fontSize="lg" mb={2}>Upload Test Script</Text>
                      <Text color="gray.500" fontSize="sm">Upload a single test script file (PNG, JPG, or PDF)</Text>
                    </Box>
                  ) : (
                    <Box
                      w="full"
                      p={6}
                      bg="green.50"
                      borderWidth={1}
                      borderColor="green.200"
                      rounded="lg"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <HStack w="full" spacing={4}>
                        <Icon as={FaFileAlt} color="green.500" boxSize={8} />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="lg" fontWeight="bold" color="green.700">Test Script Uploaded</Text>
                          <Text color="green.600">{testScript.file.name}</Text>
                        </VStack>
                        <CloseButton onClick={() => setTestScript(null)} color="green.700" />
                      </HStack>
                    </Box>
                  )}

                  <VStack spacing={4} w="full" maxW="md">
                    <HStack w="full" spacing={2}>
                      <Select
                        value={strictnessLevel}
                        onChange={(e) => setStrictnessLevel(Number(e.target.value))}
                      >
                        <option value={1}>Lenient</option>
                        <option value={2}>Standard</option>
                        <option value={3}>Strict</option>
                      </Select>
                      <Tooltip
                        label={GRADING_STANDARDS[strictnessLevel as keyof typeof GRADING_STANDARDS].description}
                        placement="right"
                      >
                        <Box as="span" cursor="help">
                          <Icon as={FaInfoCircle} />
                        </Box>
                      </Tooltip>
                    </HStack>

                    <Button
                      colorScheme="blue"
                      isLoading={isUploading}
                      loadingText="Uploading..."
                      onClick={handleUpload}
                      isDisabled={!rubric || !testScript}
                      w="full"
                    >
                      Upload and Process
                    </Button>
                  </VStack>

                  {results.length > 0 && (
                    <VStack spacing={6} w="full" maxW="4xl" align="stretch">
                      {results.map((result, index) => (
                        <Box key={index} p={6} borderWidth={1} borderRadius="lg">
                          <VStack spacing={4} align="start">
                            <HStack justify="space-between" w="full">
                              <Text fontSize="xl" fontWeight="bold">
                                {result.studentName ? `Student: ${result.studentName}` : `Student ${index + 1}`}
                              </Text>
                              <Badge colorScheme="blue">
                                {GRADING_STANDARDS[strictnessLevel as StrictnessLevel]?.name || 'Standard'}
                              </Badge>
                            </HStack>
                            <Text fontSize="lg">
                              <strong>
                                Score: {result.score ?? 0}/{result.total_points ?? 0}
                              </strong>{' '}
                              ({result.total_points && result.total_points > 0 
                                ? ((result.score / result.total_points) * 100).toFixed(1) 
                                : '0'}%)
                            </Text>
                            <Text whiteSpace="pre-wrap">{result.feedback || 'No feedback available'}</Text>
                          </VStack>
                        </Box>
                      ))}
                    </VStack>
                  )}
                </VStack>
              </TabPanel>
              <TabPanel>
                <VStack spacing={6} w="full" maxW="4xl" align="stretch">
                  {previousSubmissions.length === 0 ? (
                    <Box p={6} borderWidth={1} borderRadius="lg" textAlign="center">
                      <Text>No previous submissions found for {examName}.</Text>
                    </Box>
                  ) : (
                    previousSubmissions.map((submission) => (
                      <Box key={submission.id} p={6} borderWidth={1} borderRadius="lg">
                        <VStack spacing={4} align="start">
                          <HStack justify="space-between" w="full">
                            <Heading size="md" color="blue.600">
                              Results for {submission.studentName || 'Unnamed Student'}
                            </Heading>
                            <Text color="gray.500">
                              {submission.date ? new Date(submission.date).toLocaleDateString() : 'No date'}
                            </Text>
                          </HStack>
                          <Text>
                            <strong>Test Script:</strong> {submission.scriptFileName || 'No file name'}
                          </Text>
                          <Divider />
                          <Text fontSize="lg" fontWeight="semibold">Results:</Text>
                          
                          {/* Handle different result formats safely */}
                          <Box w="full">
                            <Text fontWeight="bold">
                              Score: {
                                typeof submission.results === 'object' && 'score' in submission.results
                                  ? submission.results.score
                                  : 'N/A'
                              }/{
                                typeof submission.results === 'object' && 'total_points' in submission.results
                                  ? submission.results.total_points || 10
                                  : 10
                              }
                            </Text>
                            <Text mt={2} whiteSpace="pre-wrap">
                              {typeof submission.results === 'object' && 'feedback' in submission.results
                                ? submission.results.feedback
                                : 'No feedback available'}
                            </Text>
                          </Box>
                          
                          {/* Extracted Text Accordion */}
                          {submission.extractedText && (
                            <Accordion allowToggle w="full" mt={2}>
                              <AccordionItem border="none">
                                <h2>
                                  <AccordionButton bg={useColorModeValue('gray.100', 'gray.700')} borderRadius="md">
                                    <Box flex="1" textAlign="left" fontWeight="medium">
                                      View Extracted Text
                                    </Box>
                                    <AccordionIcon />
                                  </AccordionButton>
                                </h2>
                                <AccordionPanel pb={4} bg={useColorModeValue('gray.50', 'gray.800')} borderRadius="md">
                                  <Text fontWeight="bold" mt={2}>Rubric Text:</Text>
                                  <Box p={2} bg={useColorModeValue('white', 'gray.700')} borderRadius="md" mb={3} whiteSpace="pre-wrap">
                                    {submission.extractedText.rubric || 'No text extracted'}
                                  </Box>
                                  
                                  <Text fontWeight="bold">Student Answer:</Text>
                                  <Box p={2} bg={useColorModeValue('white', 'gray.700')} borderRadius="md" whiteSpace="pre-wrap">
                                    {submission.extractedText.script || 'No text extracted'}
                                  </Box>
                                </AccordionPanel>
                              </AccordionItem>
                            </Accordion>
                          )}
                        </VStack>
                      </Box>
                    ))
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Box>
    </Layout>
  );
};

export default Upload; 