import { NextPage } from 'next'
import Head from 'next/head'
import { useState, useCallback } from 'react'
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
  useTheme
} from '@chakra-ui/react'
import { FaCloudUploadAlt, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa'
import Layout from '../components/Layout'

/**
 * Interface for managing file uploads
 * Tracks both the file object and its preview URL
 */
interface FileUpload {
  file: File | null
  preview: string | null
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

const Upload: NextPage = () => {
  // State management for file uploads and UI
  const [testScript, setTestScript] = useState<FileUpload>({ file: null, preview: null })
  const [rubric, setRubric] = useState<FileUpload>({ file: null, preview: null })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [strictnessLevel, setStrictnessLevel] = useState<StrictnessLevel>(2) // Default to Standard
  const toast = useToast()
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  /**
   * Handles file drop events for both test script and rubric
   * Validates file type and creates preview
   */
  const handleDrop = useCallback((type: 'script' | 'rubric') => (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && isValidFileType(droppedFile)) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const setter = type === 'script' ? setTestScript : setRubric
        setter({
          file: droppedFile,
          preview: reader.result as string
        })
      }
      reader.readAsDataURL(droppedFile)
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PNG, JPG, JPEG, or PDF file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }, [toast])

  /**
   * Handles file input selection
   * Processes selected files and creates previews
   */
  const handleFileInput = (type: 'script' | 'rubric') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && isValidFileType(selectedFile)) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const setter = type === 'script' ? setTestScript : setRubric
        setter({
          file: selectedFile,
          preview: reader.result as string
        })
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  /**
   * Validates file types
   * Accepts PNG, JPEG, and PDF files
   */
  const isValidFileType = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'application/pdf']
    return validTypes.includes(file.type)
  }

  /**
   * Handles the upload and grading process
   * 1. Validates file presence
   * 2. Shows upload progress
   * 3. Sends files to backend
   * 4. Processes response and displays results
   */
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testScript.file || !rubric.file) {
        toast({
            title: 'Missing files',
            description: 'Please upload both test script and rubric',
            status: 'warning',
            duration: 3000,
            isClosable: true,
        });
        return;
    }

    setIsUploading(true)
    setUploadProgress(0)

    const formData = new FormData();
    formData.append('script', testScript.file);
    formData.append('rubric', rubric.file);
    formData.append('strictness_level', strictnessLevel.toString());

    try {
        // Start progress animation
        let progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval)
                    return 90
                }
                return prev + 10
            })
        }, 500)

        const response = await fetch('http://localhost:8000/api/ocr/process', {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            clearInterval(progressInterval)
            setUploadProgress(0)
            const errorData = await response.text();
            console.error('Server response:', errorData);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        clearInterval(progressInterval)
        setUploadProgress(100)
        console.log('Success:', result);
        setResults(result);
        toast({
            title: 'Processing successful',
            description: 'Your exam has been graded successfully',
            status: 'success',
            duration: 5000,
            isClosable: true,
        });

        // Reset progress after a short delay
        setTimeout(() => {
            setUploadProgress(0)
            setIsUploading(false)
        }, 500)
    } catch (error) {
        console.error('Error:', error);
        toast({
            title: 'Processing failed',
            description: error instanceof Error ? error.message : 'An error occurred',
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
        setUploadProgress(0)
        setIsUploading(false)
    }
  };

  /**
   * Reusable upload box component
   * Supports both drag-and-drop and click-to-upload
   * Shows file preview when available
   */
  const UploadBox = ({ type, file, onDrop }: { 
    type: 'script' | 'rubric', 
    file: FileUpload, 
    onDrop: (e: React.DragEvent) => void 
  }) => (
    <Box
      w="full"
      h="300px"
      border="2px dashed"
      borderColor={borderColor}
      rounded="lg"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      position="relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
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
        aria-hidden="true"
        accept=".png,.jpg,.jpeg,.pdf"
        onChange={handleFileInput(type)}
      />
      {file.preview ? (
        <Box position="relative" w="full" h="full">
          <img
            src={file.preview}
            alt={`${type} preview`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </Box>
      ) : (
        <>
          <Icon as={FaCloudUploadAlt} w={12} h={12} color="blue.500" mb={4} />
          <Text fontSize="lg" mb={2}>
            Upload {type === 'script' ? 'Test Script' : 'Rubric'}
          </Text>
          <Text color="gray.500" fontSize="sm">
            Drag and drop or click to browse
          </Text>
        </>
      )}
    </Box>
  )

  return (
    <Layout>
      <Head>
        <title>Upload Exam - AEMS</title>
        <meta name="description" content="Upload exam papers for automated grading" />
      </Head>

      <VStack spacing={8} py={10}>
        <Heading
          size="xl"
          bgGradient="linear(to-r, blue.400, purple.500)"
          backgroundClip="text"
        >
          Upload Files for Grading
        </Heading>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} w="full">
          <VStack spacing={4}>
            <Heading size="md">Test Script</Heading>
            <UploadBox
              type="script"
              file={testScript}
              onDrop={handleDrop('script')}
            />
          </VStack>
          
          <VStack spacing={4}>
            <Heading size="md">Rubric</Heading>
            <UploadBox
              type="rubric"
              file={rubric}
              onDrop={handleDrop('rubric')}
            />
          </VStack>
        </SimpleGrid>

        <VStack spacing={4} w="full" maxW="md">
          <HStack w="full" spacing={2}>
            <Select
              value={strictnessLevel}
              onChange={(e) => setStrictnessLevel(Number(e.target.value) as StrictnessLevel)}
              variant="filled"
            >
              {Object.entries(GRADING_STANDARDS).map(([level, { name }]) => (
                <option key={level} value={level}>
                  {name}
                </option>
              ))}
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

          <ProgressButton
            onClick={handleUpload}
            isLoading={isUploading}
            isDisabled={!testScript.file || !rubric.file || isUploading}
            progress={uploadProgress}
          >
            Process and Grade
          </ProgressButton>
        </VStack>

        {results && (
          <Box mt={6} p={6} borderWidth={1} borderRadius="lg" maxW="4xl">
            <VStack spacing={4} align="start">
              <Text fontSize="xl" fontWeight="bold">
                Grading Results ({GRADING_STANDARDS[strictnessLevel].name})
              </Text>
              <Text fontSize="lg">
                <strong>Score: {results.score}/{results.total_points}</strong>{' '}
                ({((results.score / results.total_points) * 100).toFixed(1)}%)
              </Text>
              <Text whiteSpace="pre-wrap">{results.feedback}</Text>
            </VStack>
          </Box>
        )}
      </VStack>
    </Layout>
  )
}

export default Upload 