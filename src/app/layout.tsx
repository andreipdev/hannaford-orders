import { ChakraProvider } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hannaford Orders Tracker',
  description: 'Track your Hannaford grocery orders and clip coupons',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ChakraProvider>
          {children}
        </ChakraProvider>
      </body>
    </html>
  )
}
