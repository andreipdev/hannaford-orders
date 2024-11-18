import { NextResponse } from 'next/server'
import { HannafordScraper } from '../../../services/hannafordScraper'

// Keep mock data for development/testing
const mockData = [
  { 
    item: 'Organic Milk',
    unitPrice: 4.99,
    timesPurchased: 24,
    monthlyBreakdown: {
      'January': 2,
      'February': 2,
      'March': 2,
      'April': 2,
      'May': 2,
      'June': 2,
      'July': 2,
      'August': 2,
      'September': 2,
      'October': 2,
      'November': 2,
      'December': 2
    }
  },
  { 
    item: 'Orange Juice',
    unitPrice: 3.99,
    timesPurchased: 18,
    monthlyBreakdown: {
      'January': 1,
      'February': 2,
      'March': 1,
      'April': 2,
      'May': 1,
      'June': 2,
      'July': 1,
      'August': 2,
      'September': 1,
      'October': 2,
      'November': 2,
      'December': 1
    }
  },
  // ... similar pattern for other items
].map(item => ({
  ...item,
  totalSpent: item.unitPrice * item.timesPurchased,
  monthlySpent: Object.entries(item.monthlyBreakdown).reduce((acc, [month, quantity]) => ({
    ...acc,
    [month]: quantity * item.unitPrice
  }), {})
})).sort((a, b) => b.totalSpent - a.totalSpent)

export async function GET(request: Request) {
  const signal = request.signal;
  // Check if we have credentials in environment variables
  const username = process.env.HANNAFORD_USERNAME;
  const password = process.env.HANNAFORD_PASSWORD;
  
  // Use mock data if no credentials are provided
  if (!username || !password) {
    console.log('No credentials found, using mock data');
    return NextResponse.json(mockData);
  }
  
  try {
    const scraper = new HannafordScraper(signal);
    await scraper.initialize();
    await scraper.login({ username, password });
    
    const purchases = await scraper.scrapeOrders();
    const processedData = scraper.processOrderData(purchases);
    
    await scraper.close();
    
    return NextResponse.json(processedData);
  } catch (error) {
    console.error('Error fetching Hannaford data:', error);
    // Fallback to mock data on error
    return NextResponse.json(mockData);
  }
}
