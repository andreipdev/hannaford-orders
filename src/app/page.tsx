'use client'
import { Box, Button, Container, Heading, Flex, useDisclosure } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { GroceryTable } from '../components/GroceryTable'
import { MonthlyBreakdownModal } from '../components/MonthlyBreakdownModal'
import { GroceryData } from '../types/groceryTypes'

export default function Home() {
  const [groceryData, setGroceryData] = useState<GroceryData[]>([])
  const [selectedItem, setSelectedItem] = useState<GroceryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      if (hasLoaded) return;
      
      setIsLoading(true);
      try {
        const response = await fetch('/api/grocery-data', {
          signal: controller.signal,
          headers: {
            'Connection': 'keep-alive'
          }
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
  }, [hasLoaded]);

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
        <GroceryTable 
          groceryData={groceryData} 
          onItemClick={(item) => {
            setSelectedItem(item)
            onOpen()
          }} 
        />
      </Box>

      <MonthlyBreakdownModal 
        isOpen={isOpen} 
        onClose={onClose} 
        selectedItem={selectedItem}
      />
    </Container>
  )
}
