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
  IconButton
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

interface ExamSubmission {
  id: string
  examName: string
  rubric: FileUpload
  testScriptsZip: FileUpload | null
  results: any[]
  date: string
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

// First, let's add a proper interface for the result type
interface GradingResult {
  studentName?: string;
  score: number;
  total_points: number;
  feedback: string;
}

const Upload: NextPage = () => {
  const router = useRouter();
  const { examName } = router.query;
  const [username, setUsername] = useState<string>('');
  const [rubric, setRubric] = useState<FileUpload | null>(null);
  const [testScripts, setTestScripts] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState<GradingResult[]>([]);
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
        setPreviousSubmissions(JSON.parse(submissions));
      }
    } else {
      router.push('/login');
    }
  }, [router]);

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
        setRubric({
          file,
          preview: result,
          id: Math.random().toString(36).substring(2, 9)
        });
      }
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleTestScriptsDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.type.match(/^image\/(jpeg|png)|application\/pdf/)
    );

    if (validFiles.length === 0) {
      toast({
        title: 'Invalid files',
        description: 'Please upload only PNG, JPG, or PDF files',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newTestScripts = validFiles.map(file => {
      return new Promise<FileUpload>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            resolve({
              file,
              preview: result,
              id: Math.random().toString(36).substring(2, 9)
            });
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newTestScripts).then(scripts => {
      setTestScripts(prev => [...prev, ...scripts]);
    });
  }, [toast]);

  const removeTestScript = (id: string) => {
    setTestScripts(prev => prev.filter(script => script.id !== id));
  };

  const handleUpload = async () => {
    if (!rubric || testScripts.length === 0) {
        toast({
            title: 'Missing files',
        description: 'Please upload both rubric and test scripts',
            status: 'warning',
            duration: 3000,
            isClosable: true,
        });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('rubric', rubric.file);
    testScripts.forEach((script, index) => {
      formData.append(`test_script_${index}`, script.file);
    });
    formData.append('strictness_level', strictnessLevel.toString());
    formData.append('test_scripts_count', testScripts.length.toString());

    try {
        const response = await fetch('https://aems.onrender.com/api/ocr/process', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
        }

        const result = await response.json();
        setResults(result);
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
                  <Box
                    w="full"
                    h="400px"
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
                    bg={useColorModeValue('white', 'gray.800')}
                    p={8}
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
                    <Text color="gray.500" fontSize="sm">Upload the rubric file (PNG, JPG, JPEG, PDF)</Text>
                  </Box>

                  {rubric && (
                    <VStack spacing={4} w="full" maxW="4xl">
                      <Box w="full" p={4} borderWidth={1} borderRadius="lg">
                        <HStack justify="space-between">
                          <HStack>
                            <Icon as={FaFileAlt} />
                            <Text>Rubric: {rubric.file.name}</Text>
                          </HStack>
                          <CloseButton onClick={() => setRubric(null)} />
                        </HStack>
                      </Box>
                    </VStack>
                  )}

                  <Box
                    w="full"
                    h="400px"
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
                      handleTestScriptsDrop(Array.from(e.dataTransfer.files));
                    }}
                    bg={useColorModeValue('white', 'gray.800')}
                    p={8}
                  >
                    <Input
                      type="file"
                      height="100%"
                      width="100%"
                      position="absolute"
                      opacity="0"
                      aria-hidden="true"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          handleTestScriptsDrop(Array.from(e.target.files));
                        }
                      }}
                    />
                    <Icon as={FaCloudUploadAlt} w={12} h={12} color="blue.500" mb={4} />
                    <Text fontSize="lg" mb={2}>Upload Test Scripts</Text>
                    <Text color="gray.500" fontSize="sm">Upload multiple test script files (PNG, JPG, JPEG, PDF)</Text>
                  </Box>

                  {testScripts.length > 0 && (
                    <VStack w="full" spacing={2}>
                      {testScripts.map((script) => (
                        <HStack key={script.id} w="full" p={2} borderWidth={1} borderRadius="md">
                          <Icon as={FaFileAlt} />
                          <Text flex={1}>{script.file.name}</Text>
                          <IconButton
                            aria-label="Remove file"
                            icon={<FaTrash />}
                            size="sm"
                            onClick={() => removeTestScript(script.id)}
                          />
                        </HStack>
                      ))}
                    </VStack>
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
                      isDisabled={!rubric || testScripts.length === 0}
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
                              ({result.total_points > 0 
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
                  {previousSubmissions.map((submission) => (
                    <Box key={submission.id} p={6} borderWidth={1} borderRadius="lg">
                      <VStack spacing={4} align="start">
                        <HStack justify="space-between" w="full">
                          <Text fontSize="xl" fontWeight="bold">
                            {submission.examName}
                          </Text>
                          <Text color="gray.500">
                            {new Date(submission.date).toLocaleDateString()}
                          </Text>
                        </HStack>
                        <Text>
                          <strong>Rubric:</strong> {submission.rubric.file?.name}
                        </Text>
                        <Text>
                          <strong>Test Scripts ZIP:</strong> {submission.testScriptsZip?.file?.name}
                        </Text>
                        <Divider />
                        <Text fontSize="lg" fontWeight="semibold">Results:</Text>
                        {submission.results.map((result, index) => (
                          <Box key={index} w="full" p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md">
                            <VStack spacing={2} align="start">
                              <Text fontWeight="bold">
                                Student: {result.studentName || `Student ${index + 1}`}
                              </Text>
                              <Text>
                                Score: {result.score}/{result.total_points} ({((result.score / result.total_points) * 100).toFixed(1)}%)
                              </Text>
                              <Text fontSize="sm" color="gray.500">
                                {result.feedback}
                              </Text>
                            </VStack>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  ))}
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