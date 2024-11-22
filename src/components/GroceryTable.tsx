'use client'
import { Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react'
import { GroceryData } from '../types/groceryTypes'

interface GroceryTableProps {
  groceryData: GroceryData[]
  viewMode: 'categorized' | 'topCategories' | 'all'
  onItemClick: (item: GroceryData) => void
}

import { categoryMappings } from '../config/categories'
import { topCategoryMappings, getTopCategory } from '../config/topCategories'

export const GroceryTable = ({ groceryData, viewMode, onItemClick }: GroceryTableProps) => {
  const getCategoryForItem = (itemName: string): string => {
    for (const [category, pattern] of Object.entries(categoryMappings)) {
      if (pattern.test(itemName)) {
        return category;
      }
    }
    return 'Other';
  };

  const organizeDataByCategory = () => {
    const organized: { [category: string]: GroceryData[] } = {};
    
    groceryData.forEach(item => {
      const category = getCategoryForItem(item.item);
      if (!organized[category]) {
        organized[category] = [];
      }
      organized[category].push(item);
    });

    return organized;
  };

  const organizeDataByTopCategory = () => {
    const organized: { [category: string]: GroceryData[] } = {};
    
    groceryData.forEach(item => {
      const category = getCategoryForItem(item.item);
      const topCategory = getTopCategory(category);
      
      if (!organized[topCategory]) {
        organized[topCategory] = [];
      }
      organized[topCategory].push(item);
    });

    return organized;
  };

  const renderTable = () => {
    if (viewMode === 'all') {
      return renderRegularTable(groceryData);
    }

    const organizedData = viewMode === 'categorized' 
      ? organizeDataByCategory()
      : organizeDataByTopCategory();

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
          {Object.entries(organizedData).map(([category, items]) => (
            <>
              <Tr key={category} bg="gray.50">
                <Td colSpan={5} fontWeight="bold">{category}</Td>
              </Tr>
              {items.map((item) => (
                <Tr key={item.item} cursor="pointer" _hover={{ bg: "gray.50" }} onClick={() => onItemClick(item)}>
                  <Td pl={8}>{item.item}</Td>
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
            </>
          ))}
        </Tbody>
      </Table>
    );
  };

  return renderTable();
};
