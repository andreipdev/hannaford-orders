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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{selectedItem.item} - {monthName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box mb={4}>
            <Text fontWeight="bold">Items purchased this month:</Text>
            <List spacing={2} mt={2}>
              {selectedItem.includedItems && selectedItem.includedItems.map((item, index) => (
                <ListItem key={index}>{item}</ListItem>
              ))}
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
