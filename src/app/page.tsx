'use client'
import { Box, Button, Container, Heading, Flex, useDisclosure, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
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

          const handleClipCoupons = async () => {
            const response = await fetch('/api/clip-coupons', { method: 'POST' });
            if (!response.ok) {
              console.error('Error clipping coupons:', await response.text());
            }
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
      <Flex direction="column" gap={6}>
        <Flex justifyContent="space-between" alignItems="center">
          <Heading size="lg">Most Purchased Items</Heading>
          <Button colorScheme="blue" onClick={handleClipCoupons}>
            Clip all coupons
          </Button>
        </Flex>

        <Tabs variant="enclosed">
          <TabList>
            <Tab>Top Categories</Tab>
            <Tab>All Items</Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={0} pt={4}>
              <Box shadow="md" borderWidth="1px" borderRadius="lg" overflow="hidden" position="relative">
                <GroceryTable 
                  groceryData={groceryData}
                  viewMode="topCategories"
                  onItemClick={(item) => {
                    setSelectedItem(item)
                    onOpen()
                  }} 
                />
              </Box>
            </TabPanel>
            <TabPanel p={0} pt={4}>
              <Box shadow="md" borderWidth="1px" borderRadius="lg" overflow="hidden" position="relative">
                <GroceryTable 
                  groceryData={groceryData}
                  viewMode="all"
                  onItemClick={(item) => {
                    setSelectedItem(item)
                    onOpen()
                  }} 
                />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>

      <MonthlyBreakdownModal 
        isOpen={isOpen} 
        onClose={onClose} 
        selectedItem={selectedItem}
      />
    </Container>
  )
}
