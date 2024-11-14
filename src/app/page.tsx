'use client'
import { Box, Button, Container, Heading, Table, Thead, Tbody, Tr, Th, Td, Flex } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface GroceryData {
  month: string
  averageCost: number
}

export default function Home() {
  const [groceryData, setGroceryData] = useState<GroceryData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/api/grocery-data')
      const data = await response.json()
      setGroceryData(data)
    }
    fetchData()
  }, [])

  const handleClipCoupons = () => {
    console.log('Clipping all coupons...')
    // Add coupon clipping logic here
  }

  return (
    <Container maxW="container.xl" py={5}>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Hannaford Orders</Heading>
        <Button colorScheme="blue" onClick={handleClipCoupons}>
          Clip all coupons
        </Button>
      </Flex>

      <Box shadow="md" borderWidth="1px" borderRadius="lg" overflow="hidden">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Month</Th>
              <Th isNumeric>Average Cost</Th>
            </Tr>
          </Thead>
          <Tbody>
            {groceryData.map((item) => (
              <Tr key={item.month}>
                <Td>{item.month}</Td>
                <Td isNumeric>${item.averageCost.toFixed(2)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Container>
  )
}
