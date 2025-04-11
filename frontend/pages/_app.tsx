import type { AppProps } from 'next/app'
import { ChakraProvider } from '@chakra-ui/react'
import NetworkErrorBoundary from '../components/NetworkErrorBoundary'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <NetworkErrorBoundary>
        <Component {...pageProps} />
      </NetworkErrorBoundary>
    </ChakraProvider>
  )
}

export default MyApp 