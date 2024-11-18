'use client'
import { Box, Button, Container, Heading, Table, Thead, Tbody, Tr, Th, Td, Flex, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface GroceryData {
  item: string
  unitPrice: number
  timesPurchased: number
  totalSpent: number
  monthlyBreakdown: Record<string, number>
  monthlySpent: Record<string, number>
}

export default function Home() {
  const [groceryData, setGroceryData] = useState<GroceryData[]>([])
  const [selectedItem, setSelectedItem] = useState<GroceryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      // Prevent multiple fetches
      if (isLoading || hasLoaded) return;
      
      setIsLoading(true);
      try {
        const response = await fetch('/api/grocery-data', {
          signal: controller.signal
        });
        const data = await response.json();
        setGroceryData(data);
        setHasLoaded(true);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error('Error fetching data:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [isLoading, hasLoaded]);

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

      <Box shadow="md" borderWidth="1px" borderRadius="lg" overflow="hidden" position="relative">
        {isLoading && (
          <Flex 
            position="absolute" 
            top="0" 
            left="0" 
            right="0" 
            bottom="0" 
            bg="rgba(255, 255, 255, 0.8)" 
            zIndex="1" 
            justify="center" 
            align="center"
          >
            <Button isLoading loadingText="Loading data..." variant="ghost" />
          </Flex>
        )}
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
              <Tr key={item.item} cursor="pointer" _hover={{ bg: "gray.50" }} onClick={() => {
                setSelectedItem(item)
                onOpen()
              }}>
                <Td>{item.item}</Td>
                <Td isNumeric>${item.unitPrice.toFixed(2)}</Td>
                <Td isNumeric>{item.timesPurchased}</Td>
                <Td isNumeric>${item.totalSpent.toFixed(2)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedItem?.item} - Monthly Breakdown</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Month</Th>
                  <Th isNumeric>Quantity</Th>
                  <Th isNumeric>Total Spent</Th>
                </Tr>
              </Thead>
              <Tbody>
                {selectedItem && Object.entries(selectedItem.monthlyBreakdown).map(([month, quantity]) => (
                  <Tr key={month}>
                    <Td>{month}</Td>
                    <Td isNumeric>{quantity}</Td>
                    <Td isNumeric>${selectedItem.monthlySpent[month].toFixed(2)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
}
