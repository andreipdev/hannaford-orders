import { categoryMappings } from './categories';

export const topCategoryMappings: { [key: string]: string[] } = {
  'Meat': ['Ground Beef', 'Hot Dogs', 'Chicken', 'Pepperoni', 'Bacon', 'Salmon', 'Ground Turkey', 'Steak', 'Pork'],
  'Dairy & Eggs': ['Eggs', 'Milk & Chocolate Milk', 'Butter', 'Grated Cheese & Parmesan', 'Whole Cheese', 'Whipping Cream/Heavy Cream', 'Sour Cream'],
  'Pantry': ['Pasta', 'Rice', 'Vinegar', 'Chocolate Chips', 'Couscous', 'Baking (flour, sugar,...)', 'Oil', 'Salt', 'Beans', 'Stock & Broth', 'Tomato Sauce', 'Spices/Sauces'],
  'Snacks & Sweets': ['LU Ecolier', 'Donuts', 'Ice Cream', 'Chocolate Candies', 'Goldfish', 'Cookies', 'Marshmallows', 'Chips', 'Nutella Crackers', 'Nutella', 'Cereal Bars', 'Other Snacks', 'Cereal', 'Pudding', 'Cookies'],
  'Beverages': ['Red Bull', 'Beer/Cider', 'Coffee', 'Other Drinks', 'Milk & Chocolate Milk'],
  'Frozen Foods': ['Fries', 'Frozen Pizza'],
  'Fresh Produce': ['Vegetables', 'Fruits'],
  'Bread & Bakery': ['White Bread', 'Baguette', 'Naan', 'Crescents'],
  'Household': ['Hand Soap', 'Paper towels', 'Trash Bags', 'Clothes Washing', 'Toilet Paper', 'Spray Cleaners', 'Foil & Parchment', 'Dishwashing', 'Tissues', 'Other Cleaning Products', 'Ziploc'],
  'Personal Care': ['Deodorant', 'Shampoo & Conditioner', 'Body Wash', 'Dental', 'Hair Gel'],
  'International': ['Pilmeni', 'Samosa', 'Ramen', 'Tacos & Tortillas'],
  'Other': [] // Will contain any categories not explicitly mapped above
};

// Function to get the top category for a given category
export function getTopCategory(category: string): string {
  for (const [topCategory, subCategories] of Object.entries(topCategoryMappings)) {
    if (subCategories.includes(category)) {
      return topCategory;
    }
  }
  return 'Other';
}

// Function to categorize items that don't match any category
export function categorizeUnmatchedItems(itemName: string): string {
  // Add logic here to categorize items that don't match any specific category
  return 'Other';
}
