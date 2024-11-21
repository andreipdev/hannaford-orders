// Default prices for items that might show up as $0
export const defaultPrices: { [key: string]: number } = {
  "Asparagus": 3.99,
  "Bananas": 0.59,
  "Broccoli": 2.99,
  "Carrots": 1.99,
  "Celery": 2.49,
  "Cucumber": 0.99,
  "Green Beans": 2.99,
  "Lettuce": 1.99,
  "Mushrooms": 2.99,
  "Onions": 1.29,
  "Peppers": 1.99,
  "Potatoes": 0.99,
  "Spinach": 2.99,
  "Tomatoes": 2.49,
  "Zucchini": 1.99
};

// Helper function to find matching default price
export function findDefaultPrice(itemName: string): number | null {
  const normalizedName = itemName.toLowerCase();
  for (const [key, price] of Object.entries(defaultPrices)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return price;
    }
  }
  return null;
}
