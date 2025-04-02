'use client'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  Box,
  List,
  ListItem,
} from '@chakra-ui/react'
import { GroceryData } from '../types/groceryTypes'

interface MonthlyItemsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedItem: GroceryData | null
  monthName: string
}

export const MonthlyItemsModal = ({ isOpen, onClose, selectedItem, monthName }: MonthlyItemsModalProps) => {
  if (!selectedItem) return null

  // Get the count of items purchased in this month
  const itemCount = selectedItem.monthlyBreakdown && selectedItem.monthlyBreakdown[monthName] 
    ? selectedItem.monthlyBreakdown[monthName] 
    : 0;
  
  // Get the amount spent in this month
  const amountSpent = selectedItem.monthlySpent && selectedItem.monthlySpent[monthName]
    ? selectedItem.monthlySpent[monthName]
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{selectedItem.item} - {monthName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box mb={4}>
            <Text fontWeight="bold" mb={2}>Summary for {monthName}:</Text>
            <Text>Purchased {itemCount} times</Text>
            <Text>Total spent: ${amountSpent.toFixed(2)}</Text>
          </Box>
          
          <Box mb={4}>
            <Text fontWeight="bold" mb={2}>Items purchased in {monthName}:</Text>
            <List spacing={2} mt={2}>
              {selectedItem.includedItemsPerMonth && selectedItem.includedItemsPerMonth[monthName] ? (
                selectedItem.includedItemsPerMonth[monthName].map((item, index) => (
                  <ListItem key={index}>{item}</ListItem>
                ))
              ) : (
                <ListItem>No specific items found for this month</ListItem>
              )}
            </List>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
