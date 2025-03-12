import type { NextPage } from 'next'
import Head from 'next/head'
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Stack,
  SimpleGrid,
  Icon,
  useColorModeValue
} from '@chakra-ui/react'
import { FaUpload, FaHistory, FaChartBar } from 'react-icons/fa'
import Layout from '../components/Layout'
import Link from 'next/link'

const Feature = ({ title, text, icon }: { title: string; text: string; icon: any }) => {
  return (
    <Stack
      align="center"
      textAlign="center"
      bg={useColorModeValue('white', 'gray.800')}
      p={8}
      rounded="lg"
      shadow="md"
      borderWidth="1px"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      _hover={{
        transform: 'translateY(-5px)',
        transition: 'all 0.2s',
        shadow: 'lg',
      }}
    >
      <Icon as={icon} w={10} h={10} color="blue.500" mb={4} />
      <Heading size="md" mb={2}>{title}</Heading>
      <Text color={useColorModeValue('gray.600', 'gray.400')}>{text}</Text>
    </Stack>
  )
}

const Home: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>AEMS - Automated Exam Marking System</title>
        <meta name="description" content="Automated Exam Marking System using OCR technology" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box textAlign="center" py={20}>
        <Heading
          as="h1"
          size="2xl"
          bgGradient="linear(to-r, blue.400, purple.500)"
          backgroundClip="text"
          mb={4}
        >
          Automated Exam Marking System
        </Heading>
        <Text fontSize="xl" color={useColorModeValue('gray.600', 'gray.400')} mb={8}>
          Streamline your exam grading process with OCR technology
        </Text>
        <Link href="/upload" passHref>
          <Button
            size="lg"
            colorScheme="blue"
            mb={16}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
            }}
          >
            Get Started
          </Button>
        </Link>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} px={4}>
          <Feature
            icon={FaUpload}
            title="Upload Exams"
            text="Simply upload scanned exam papers and let our system process them"
          />
          <Feature
            icon={FaChartBar}
            title="Automated Grading"
            text="Advanced OCR and AI algorithms grade exams based on predefined criteria"
          />
          <Feature
            icon={FaHistory}
            title="Track History"
            text="Access and review all previously graded exams in one place"
          />
        </SimpleGrid>
      </Box>
    </Layout>
  )
}

export default Home 