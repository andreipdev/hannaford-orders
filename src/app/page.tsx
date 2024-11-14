'use client'
import { Box, Button, Container, Heading, Table, Thead, Tbody, Tr, Th, Td, Flex } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface GroceryData {
  item: string
  unitPrice: number
  timesPurchased: number
  totalSpent: number
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
        <Heading size="lg">Most Purchased Items</Heading>
        <Button colorScheme="blue" onClick={handleClipCoupons}>
          Clip all coupons
        </Button>
      </Flex>

      <Box shadow="md" borderWidth="1px" borderRadius="lg" overflow="hidden">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Item</Th>
              <Th isNumeric>Unit Price</Th>
              <Th isNumeric>Times Purchased</Th>
              <Th isNumeric>Total Spent</Th>
            </Tr>
          </Thead>
          <Tbody>
            {groceryData.map((item) => (
              <Tr key={item.item}>
                <Td>{item.item}</Td>
                <Td isNumeric>${item.unitPrice.toFixed(2)}</Td>
                <Td isNumeric>{item.timesPurchased}</Td>
                <Td isNumeric>${item.totalSpent.toFixed(2)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Container>
  )
}
