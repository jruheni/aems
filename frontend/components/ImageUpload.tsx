import { useState, ChangeEvent } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  useToast,
  Progress,
} from '@chakra-ui/react';
import { FiUpload } from 'react-icons/fi';

interface ImageUploadProps {
  onTextExtracted?: (text: string) => void;
}

export default function ImageUpload({ onTextExtracted }: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toast = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setText('');
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select an image file first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/ocr/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setText(response.data.text);
      onTextExtracted?.(response.data.text);

      toast({
        title: 'Success',
        description: 'Text extracted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to extract text from image',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack spacing={4} width="100%" maxW="600px" mx="auto">
      <Box width="100%">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          display="none"
          id="image-upload"
        />
        <Button
          as="label"
          htmlFor="image-upload"
          leftIcon={<FiUpload />}
          colorScheme="blue"
          cursor="pointer"
          width="100%"
        >
          Select Image
        </Button>
        {file && (
          <Text mt={2} fontSize="sm" color="gray.600">
            Selected: {file.name}
          </Text>
        )}
      </Box>

      <Button
        onClick={handleUpload}
        colorScheme="green"
        isLoading={isLoading}
        loadingText="Extracting text..."
        isDisabled={!file || isLoading}
        width="100%"
      >
        Extract Text
      </Button>

      {isLoading && (
        <Progress size="xs" isIndeterminate width="100%" colorScheme="green" />
      )}

      {text && (
        <Box
          width="100%"
          p={4}
          bg="gray.50"
          borderRadius="md"
          border="1px"
          borderColor="gray.200"
        >
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {text}
          </Text>
        </Box>
      )}
    </VStack>
  );
} 