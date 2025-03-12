import { Box, Container, Flex, Heading, Button, useColorMode, useColorModeValue } from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import Link from 'next/link'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const { colorMode, toggleColorMode } = useColorMode()
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const navBg = useColorModeValue('white', 'gray.800')

  return (
    <Box minH="100vh" bg={bgColor}>
      <Flex
        as="nav"
        position="fixed"
        w="100%"
        bg={navBg}
        boxShadow="sm"
        zIndex={1}
        p={4}
      >
        <Container maxW="container.xl" display="flex" alignItems="center" justifyContent="space-between">
          <Link href="/" passHref>
            <Heading as="h1" size="md" cursor="pointer">
              AEMS
            </Heading>
          </Link>
          <Flex gap={4} alignItems="center">
            <Link href="/upload" passHref>
              <Button variant="ghost">Upload Exam</Button>
            </Link>
            <Link href="/history" passHref>
              <Button variant="ghost">History</Button>
            </Link>
            <Button onClick={toggleColorMode}>
              {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            </Button>
          </Flex>
        </Container>
      </Flex>

      <Container maxW="container.xl" pt="80px" pb="20">
        {children}
      </Container>

      <Box
        as="footer"
        position="fixed"
        bottom={0}
        w="100%"
        bg={navBg}
        boxShadow="0 -1px 2px rgba(0,0,0,0.1)"
        py={4}
      >
        <Container maxW="container.xl" textAlign="center">
          © {new Date().getFullYear()} AEMS. All rights reserved.
        </Container>
      </Box>
    </Box>
  )
}

export default Layout 