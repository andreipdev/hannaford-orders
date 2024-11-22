'use client'
import { Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react'
import { GroceryData } from '../types/groceryTypes'

interface GroceryTableProps {
  groceryData: GroceryData[]
  viewMode: 'topCategories' | 'all'
  onItemClick: (item: GroceryData) => void
}

import { categoryMappings } from '../config/categories'
import { topCategoryMappings, getTopCategory } from '../config/topCategories'

export const GroceryTable = ({ groceryData, viewMode, onItemClick }: GroceryTableProps) => {
  const organizeDataByTopCategory = () => {
    const organized: { [topCategory: string]: GroceryData[] } = {};

    groceryData.forEach(item => {
      const category = item.category;
      const topCategory = getTopCategory(category);

      if (!organized[topCategory]) {
        organized[topCategory] = [];
      }
      organized[topCategory].push(item);
    });

    return organized;

    // Map categories to top categories
    const topCategoryData: { [topCategory: string]: GroceryData[] } = {};
    for (const [category, items] of Object.entries(organized)) {
      const topCategory = getTopCategory(category);
      if (!topCategoryData[topCategory]) {
        topCategoryData[topCategory] = [];
      }
      topCategoryData[topCategory].push(...items);
    }

    return topCategoryData;
  };

  const renderTable = () => {
    if (viewMode === 'all') {
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
      );
    }

    const organizedData = organizeDataByTopCategory();

    // Calculate total spent and spent per month for each top category
    const topCategoryTotals = Object.entries(organizedData).map(([topCategory, items]) => {
      const totalSpent = items.reduce((total, item) => total + item.totalSpent, 0);
      const spentPerMonth = items.reduce((total, item) => total + item.spentPerMonth, 0);
      return { topCategory, totalSpent, spentPerMonth };
    });

    // Sort top categories by total spent descending
    topCategoryTotals.sort((a, b) => b.totalSpent - a.totalSpent);

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
          {topCategoryTotals.map(({ topCategory, totalSpent, spentPerMonth }) => (
            <>
              <Tr key={topCategory} bg="gray.50">
                <Td colSpan={3} fontWeight="bold">{topCategory}</Td>
                <Td isNumeric fontWeight="bold">${totalSpent.toFixed(2)}</Td>
                <Td isNumeric fontWeight="bold">${spentPerMonth.toFixed(2)}</Td>
              </Tr>
              {organizedData[topCategory].map((item) => (
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
