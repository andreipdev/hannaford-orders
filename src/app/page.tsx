'use client'
import { Box, Container, Heading, Flex, useDisclosure, Tabs, TabList, TabPanels, Tab, TabPanel, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { GroceryTable } from '../components/GroceryTable'
import { MonthlyBreakdownModal } from '../components/MonthlyBreakdownModal'
import { MonthlyItemsModal } from '../components/MonthlyItemsModal'
import { GroceryData } from '../types/groceryTypes'
import { getDisplayMonth } from '../lib/months'

export default function Home() {
  const [groceryData, setGroceryData] = useState<GroceryData[]>([])
  const [selectedItem, setSelectedItem] = useState<GroceryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  
  const currentMonth = getDisplayMonth();
  const previousMonth = getDisplayMonth(-1);
  const currentMonthShort = currentMonth;
  const previousMonthShort = previousMonth;

  // Separate disclosure hooks for different modals
  const { isOpen: isBreakdownOpen, onOpen: onBreakdownOpen, onClose: onBreakdownClose } = useDisclosure()
  const { isOpen: isMonthlyItemsOpen, onOpen: onMonthlyItemsOpen, onClose: onMonthlyItemsClose } = useDisclosure()

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const response = await fetch('/api/grocery-data', {
          signal: controller.signal,
          headers: {
            'X-Hannaford-Local': '1'
          }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not fetch grocery data.');
        if (!controller.signal.aborted) setGroceryData(data);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          setLoadError(error instanceof Error ? error.message : 'Could not fetch grocery data.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <Container maxW="container.xl" py={5}>
      <Flex direction="column" gap={6}>
        <Flex justifyContent="space-between" alignItems="center">
          <Heading size="lg">Most Purchased Items</Heading>

        </Flex>

        {isLoading && <Text role="status">Loading purchase history…</Text>}
        {loadError && <Text role="alert" color="red.700">{loadError}</Text>}
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
