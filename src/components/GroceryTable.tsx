'use client'
import { Fragment } from 'react'
import { Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react'
import { GroceryData } from '../types/groceryTypes'

interface GroceryTableProps {
  groceryData: GroceryData[]
  viewMode: 'topCategories' | 'all' | 'pastMonth' | 'beforeLastMonth'
  onItemClick: (item: GroceryData) => void
}

import { categoryMappings } from '../config/categories'
import { topCategoryMappings, getTopCategory } from '../config/topCategories'

export const GroceryTable = ({ groceryData, viewMode, onItemClick }: GroceryTableProps) => {
  console.log(groceryData);

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
  };

  // Filter data based on the view mode
  const getFilteredData = () => {
    if (viewMode === 'pastMonth') {
      // Filter for current month (March)
      const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
      
      return groceryData.filter(item => {
        // Check if the item has monthlyBreakdown and if any purchase was made in the current month
        if (!item.monthlyBreakdown || typeof item.monthlyBreakdown !== 'object') {
          return false;
        }
        
        // Check if the current month exists in the monthlyBreakdown and has a value > 0
        return item.monthlyBreakdown[currentMonthName] > 0;
      });
    } else if (viewMode === 'beforeLastMonth') {
      // Filter for previous month (February)
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      const previousMonthName = date.toLocaleString('default', { month: 'long' });
      
      return groceryData.filter(item => {
        // Check if the item has monthlyBreakdown and if any purchase was made in the previous month
        if (!item.monthlyBreakdown || typeof item.monthlyBreakdown !== 'object') {
          return false;
        }
        
        // Check if the previous month exists in the monthlyBreakdown and has a value > 0
        return item.monthlyBreakdown[previousMonthName] > 0;
      });
    }
    
    // Default case: return all data
    return groceryData;
  };

  const renderTable = () => {
    if (viewMode === 'all' || viewMode === 'pastMonth' || viewMode === 'beforeLastMonth') {
      const filteredData = viewMode === 'all' ? groceryData : getFilteredData();
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
            {filteredData.map((item) => (
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

    // Sort top categories by spent per month descending
    topCategoryTotals.sort((a, b) => b.spentPerMonth - a.spentPerMonth);

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
            <Fragment key={topCategory}>
              < Tr bg="gray.50" >
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
            </Fragment>
          ))
          }
        </Tbody >
      </Table >
    );
  };

  return renderTable();
};
