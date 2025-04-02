'use client'
import { Box, Button, Container, Heading, Flex, useDisclosure, Tabs, TabList, TabPanels, Tab, TabPanel, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { GroceryTable } from '../components/GroceryTable'
import { MonthlyBreakdownModal } from '../components/MonthlyBreakdownModal'
import { MonthlyItemsModal } from '../components/MonthlyItemsModal'
import { GroceryData } from '../types/groceryTypes'

export default function Home() {
  const [groceryData, setGroceryData] = useState<GroceryData[]>([])
  const [selectedItem, setSelectedItem] = useState<GroceryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  
  // Get current and previous month names
  const getCurrentMonthName = () => {
    const date = new Date();
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  
  const getPreviousMonthName = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  
  const currentMonth = getCurrentMonthName();
  const previousMonth = getPreviousMonthName();
  const currentMonthShort = new Date().toLocaleString('default', { month: 'long' });
  const previousMonthShort = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString('default', { month: 'long' });
  
  // Separate disclosure hooks for different modals
  const { isOpen: isBreakdownOpen, onOpen: onBreakdownOpen, onClose: onBreakdownClose } = useDisclosure()
  const { isOpen: isMonthlyItemsOpen, onOpen: onMonthlyItemsOpen, onClose: onMonthlyItemsClose } = useDisclosure()

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

  const handleClipCoupons = async () => {
    const response = await fetch('/api/clip-coupons', { method: 'POST' });
    if (!response.ok) {
      console.error('Error clipping coupons:', await response.text());
    }
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

        <Tabs variant="enclosed" onChange={(index) => setActiveTab(index)}>
          <TabList>
            <Tab>Top Categories</Tab>
            <Tab>All Items</Tab>
            <Tab>{currentMonth}</Tab>
            <Tab>{previousMonth}</Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={0} pt={4}>
              <Box shadow="md" borderWidth="1px" borderRadius="lg" overflow="hidden" position="relative">
                <GroceryTable
                  groceryData={groceryData}
                  viewMode="topCategories"
                  onItemClick={(item) => {
                    setSelectedItem(item)
                    onBreakdownOpen()
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
                    onBreakdownOpen()
                  }}
                />
              </Box>
            </TabPanel>
            <TabPanel p={0} pt={4}>
              {/* Calculate total spent for current month */}
              <Box mb={4}>
                <Text fontSize="lg" fontWeight="bold">
                  Total spent in {currentMonthShort}: $
                  {groceryData
                    .filter(item => item.monthlySpent && item.monthlySpent[currentMonthShort])
                    .reduce((total, item) => total + (item.monthlySpent[currentMonthShort] || 0), 0)
                    .toFixed(2)}
                </Text>
              </Box>
              <Box shadow="md" borderWidth="1px" borderRadius="lg" overflow="hidden" position="relative">
                <GroceryTable
                  groceryData={groceryData}
                  viewMode="pastMonth"
                  onItemClick={(item) => {
                    setSelectedItem(item)
                    onMonthlyItemsOpen()
                  }}
                />
              </Box>
            </TabPanel>
            <TabPanel p={0} pt={4}>
              {/* Calculate total spent for previous month */}
              <Box mb={4}>
                <Text fontSize="lg" fontWeight="bold">
                  Total spent in {previousMonthShort}: $
                  {groceryData
                    .filter(item => item.monthlySpent && item.monthlySpent[previousMonthShort])
                    .reduce((total, item) => total + (item.monthlySpent[previousMonthShort] || 0), 0)
                    .toFixed(2)}
                </Text>
              </Box>
              <Box shadow="md" borderWidth="1px" borderRadius="lg" overflow="hidden" position="relative">
                <GroceryTable
                  groceryData={groceryData}
                  viewMode="beforeLastMonth"
                  onItemClick={(item) => {
                    setSelectedItem(item)
                    onMonthlyItemsOpen()
                  }}
                />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>

      {/* Use different modals based on the active tab */}
      <MonthlyBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={onBreakdownClose}
        selectedItem={selectedItem}
      />
      
      <MonthlyItemsModal
        isOpen={isMonthlyItemsOpen}
        onClose={onMonthlyItemsClose}
        selectedItem={selectedItem}
        monthName={activeTab === 2 ? currentMonthShort : previousMonthShort}
      />
    </Container>
  )
}
