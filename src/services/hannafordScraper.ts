import puppeteer from 'puppeteer';

interface HannafordCredentials {
  username: string;
  password: string;
}

interface PurchaseData {
  item: string;
  unitPrice: number;
  quantity: number;
  date: Date;
}

export class HannafordScraper {
  private browser: any;
  private page: any;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: 'new' // Use new headless mode
    });
    this.page = await this.browser.newPage();
  }

  async login(credentials: HannafordCredentials) {
    await this.page.goto('https://www.hannaford.com/login');
    
    // Wait for the CSRF token to be available
    await this.page.waitForSelector('input[name="CSRF_TOKEN_HEADER"]');
    
    // Get CSRF token
    const csrfToken = await this.page.$eval('input[name="CSRF_TOKEN_HEADER"]', 
      (el: any) => el.value
    );

    // Set up the form data
    const formData = new URLSearchParams({
      'form_state': 'loginForm1',
      'CSRF_TOKEN_HEADER': csrfToken,
      'isFromHeader': 'true',
      'dest': 'https://www.hannaford.com/',
      'loginAction': 'TRUE',
      'userName': credentials.username,
      'password': credentials.password
    });

    // Perform the login request
    await this.page.setRequestInterception(true);
    this.page.once('request', (request: any) => {
      request.continue({
        method: 'POST',
        postData: formData.toString(),
        headers: {
          ...request.headers(),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    });

    // Submit the form and wait for navigation
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.$eval('form[name="loginForm1"]', (form: any) => form.submit())
    ]);

    // Verify login was successful
    const isLoggedIn = await this.page.evaluate(() => {
      return !document.querySelector('form[name="loginForm1"]');
    });

    if (!isLoggedIn) {
      throw new Error('Login failed');
    }
  }

  async scrapeOrders(): Promise<PurchaseData[]> {
    // TODO: Navigate to orders page
    // await this.page.goto('https://www.hannaford.com/orders');
    
    const purchases: PurchaseData[] = [];
    
    // TODO: Implement actual scraping logic
    // This will need to:
    // 1. Navigate through order history pages
    // 2. Extract item details from each order
    // 3. Parse prices and dates
    
    return purchases;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  processOrderData(purchases: PurchaseData[]) {
    // Group purchases by item and calculate monthly breakdowns
    const itemMap = new Map();
    
    purchases.forEach(purchase => {
      const month = purchase.date.toLocaleString('default', { month: 'long' });
      const key = purchase.item;
      
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item: purchase.item,
          unitPrice: purchase.unitPrice,
          timesPurchased: 0,
          monthlyBreakdown: {},
          totalSpent: 0
        });
      }
      
      const itemData = itemMap.get(key);
      itemData.timesPurchased += purchase.quantity;
      itemData.monthlyBreakdown[month] = (itemData.monthlyBreakdown[month] || 0) + purchase.quantity;
      itemData.totalSpent += purchase.unitPrice * purchase.quantity;
    });
    
    return Array.from(itemMap.values());
  }
}
