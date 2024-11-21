'use client'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Table, Thead, Tbody, Tr, Th, Td, Box, Text } from '@chakra-ui/react'
import { GroceryData } from '../types/groceryTypes'

interface MonthlyBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  selectedItem: GroceryData | null
}

export const MonthlyBreakdownModal = ({ isOpen, onClose, selectedItem }: MonthlyBreakdownModalProps) => {
  return (
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
                  <Td isNumeric>${(selectedItem.monthlySpent?.[month] || 0).toFixed(2)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {selectedItem?.includedItems && selectedItem.includedItems.length > 0 && (
            <Box mt={4}>
              <Text fontWeight="bold" mb={2}>Included Items:</Text>
              <Text>{selectedItem.includedItems.join(', ')}</Text>
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
