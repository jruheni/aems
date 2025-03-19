import React, { useState, useEffect } from 'react';
import { Box, Button, Grid, Heading, Text, VStack, Image, Flex, Container, Link, Menu, MenuButton, MenuList, MenuItem, useToast, IconButton, FormControl, FormLabel } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useColorMode, useColorModeValue } from '@chakra-ui/react';
import { useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Input } from '@chakra-ui/react';
import { FiMoreVertical } from 'react-icons/fi';

interface Exam {
  id: number;
  title: string;
  description: string;
  date: string;
  questions: any[];
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newExamName, setNewExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const toast = useToast();

  useEffect(() => {
    const username = localStorage.getItem('username');
    if (!username) {
      router.push('/login');
      return;
    }

    fetchExams(username);
  }, []);

  const fetchExams = async (username: string) => {
    try {
      const response = await fetch(`/api/exams?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      if (data.success) {
        setExams(data.data);
      } else {
        toast({
          title: 'Error loading exams',
          description: data.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load exams',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleExamClick = (exam: Exam) => {
    router.push(`/upload?examId=${exam.id}&examName=${encodeURIComponent(exam.title)}`);
  };

  const handleCreateNewExam = () => {
    setIsRenaming(false);
    setCurrentExam(null);
    setNewExamName('');
    setExamDate('');
    onOpen();
  };

  const handleRenameExam = (exam: Exam) => {
    setIsRenaming(true);
    setCurrentExam(exam);
    setNewExamName(exam.title);
    onOpen();
  };

  const handleSubmit = async () => {
    if (newExamName.trim()) {
      const username = localStorage.getItem('username');
      if (!username) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/exams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            action: isRenaming ? 'rename' : 'create',
            examId: currentExam?.id,
            examData: isRenaming
              ? { title: newExamName.trim() }
              : {
                  title: newExamName.trim(),
                  description: '',
                  date: examDate || new Date().toISOString().split('T')[0],
                },
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          toast({
            title: isRenaming ? 'Exam renamed' : 'Exam created',
            status: 'success',
            duration: 2000,
            isClosable: true,
          });
          fetchExams(username);
        } else {
          toast({
            title: 'Error',
            description: data.message,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to process request',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }

      setNewExamName('');
      setExamDate('');
      setCurrentExam(null);
      onClose();
    }
  };

  const handleDeleteExam = async (exam: Exam) => {
    const username = localStorage.getItem('username');
    if (!username) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          action: 'delete',
          examId: exam.id,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Exam deleted',
          status: 'info',
          duration: 2000,
          isClosable: true,
        });
        fetchExams(username);
      } else {
        toast({
          title: 'Error',
          description: data.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete exam',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    router.push('/login');
  };

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Flex
        as="nav"
        position="fixed"
        w="100%"
        bg={useColorModeValue('white', 'gray.800')}
        boxShadow="sm"
        zIndex={1}
        p={4}
      >
        <Container maxW="container.xl" display="flex" alignItems="center" justifyContent="space-between">
          <Link href="/">
            <Heading as="h1" size="md" cursor="pointer">
              AEMS
            </Heading>
          </Link>
          <Flex gap={4} alignItems="center">
            <Link href="/upload">
              <Button variant="ghost">Upload Exam</Button>
            </Link>
            <Link href="/history">
              <Button variant="ghost">History</Button>
            </Link>
            <Button onClick={handleLogout} variant="ghost">
              Logout
            </Button>
            <Button onClick={toggleColorMode}>
              {useColorModeValue(<MoonIcon />, <SunIcon />)}
            </Button>
          </Flex>
        </Container>
      </Flex>

      <Container maxW="container.xl" pt="60px" pb="10" centerContent>
        <VStack spacing={4} py={6} px={4} mx={0} align="center">
          <Heading
            size="xl"
            bgGradient="linear(to-r, blue.400, purple.500)"
            backgroundClip="text"
          >
            Exam Dashboard
          </Heading>
          <Text 
            fontSize="2xl" 
            fontWeight="bold" 
            color={useColorModeValue('gray.700', 'gray.200')}
            textAlign="center"
            mt={2}
          >
            Welcome back, {localStorage.getItem('username')}!
          </Text>
        </VStack>
      </Container>
      <Image src="/images/backsplash.jpg" alt="Banner Image" w="100%" h="500px" objectFit="cover" mb={4} />
      <Container maxW="container.xl" pb="20">
        <Grid templateColumns="repeat(auto-fill, minmax(250px, 1fr))" gap={6} w="full">
          <Box
            p={4}
            borderWidth={1}
            borderRadius="lg"
            textAlign="center"
            cursor="pointer"
            onClick={handleCreateNewExam}
            h="250px"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            _hover={{ borderColor: 'blue.500' }}
          >
            <Text fontSize="2xl">+</Text>
            <Text>Create New Exam</Text>
          </Box>
          {exams.map((exam) => (
            <Box
              key={exam.id}
              p={4}
              borderWidth={1}
              borderRadius="lg"
              textAlign="center"
              cursor="pointer"
              h="250px"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              position="relative"
              onClick={() => handleExamClick(exam)}
              _hover={{ borderColor: 'blue.500' }}
            >
              <Text fontSize="lg" fontWeight="semibold" mb={2}>{exam.title}</Text>
              <Text fontSize="sm" color="gray.500">Date: {new Date(exam.date).toLocaleDateString()}</Text>
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="Options"
                  icon={<FiMoreVertical />}
                  variant="ghost"
                  position="absolute"
                  top={2}
                  right={2}
                  onClick={(e) => e.stopPropagation()}
                />
                <MenuList onClick={(e) => e.stopPropagation()}>
                  <MenuItem onClick={() => handleRenameExam(exam)}>Rename</MenuItem>
                  <MenuItem onClick={() => handleDeleteExam(exam)}>Delete</MenuItem>
                </MenuList>
              </Menu>
            </Box>
          ))}
        </Grid>
      </Container>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isRenaming ? 'Rename Exam' : 'Create New Exam'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Exam Name</FormLabel>
                <Input
                  placeholder="Enter exam name"
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                />
              </FormControl>
              {!isRenaming && (
                <FormControl>
                  <FormLabel>Exam Date</FormLabel>
                  <Input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                  />
                </FormControl>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleSubmit}>
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