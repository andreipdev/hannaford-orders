'use client'
import { Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react'
import { GroceryData } from '../types/groceryTypes'

interface GroceryTableProps {
  groceryData: GroceryData[]
  onItemClick: (item: GroceryData) => void
}

export const GroceryTable = ({ groceryData, onItemClick }: GroceryTableProps) => {
  return (
    <Table variant="simple">
      <Thead>
        <Tr>
          <Th>Item</Th>
          <Th isNumeric>Unit Price</Th>
          <Th isNumeric>Times Purchased</Th>
          <Th isNumeric>Total Spent</Th>
          <Th isNumeric>Spent per Month</Th>
        </Tr>
      </Thead>
      <Tbody>
        {groceryData.map((item) => (
          <Tr key={item.item} cursor="pointer" _hover={{ bg: "gray.50" }} onClick={() => onItemClick(item)}>
            <Td>{item.item}</Td>
            <Td isNumeric>
              {item.priceRange.min === item.priceRange.max ? 
                `$${item.priceRange.min.toFixed(2)}` : 
                `$${item.priceRange.min.toFixed(2)}-$${item.priceRange.max.toFixed(2)}`
              }
            </Td>
            <Td isNumeric>{item.timesPurchased}</Td>
            <Td isNumeric>${item.totalSpent.toFixed(2)}</Td>
            <Td isNumeric>${item.spentPerMonth.toFixed(2)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}
