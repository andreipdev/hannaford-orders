// Default prices for items that might show up as $0
export const defaultPrices: { [key: string]: number } = {
  "Asparagus": 3.99,
  "Angus Beef Top Round London Broil Steak": 8,
  "Beef Top Round Steak for London Broil": 8
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
