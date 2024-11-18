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
    await this.page.goto('https://www.hannaford.com/account/my-orders/in-store');
    
    const purchases: PurchaseData[] = [];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    let hasMoreOrders = true;
    
    while (hasMoreOrders) {
      // Wait for orders to load
      await this.page.waitForSelector('.order-summary');
      
      // Get all order items on current page
      const orders = await this.page.$$('.order-summary');
      console.log(`Found ${orders.length} orders on current page`);
      
      for (const order of orders) {
        // Get order date and ID
        const dateText = await order.$eval('.order-date', (el: any) => el.textContent.trim());
        const orderDate = new Date(dateText);
        console.log(`Processing order from ${orderDate.toLocaleDateString()}`);
        
        // Stop if order is older than a year
        if (orderDate < oneYearAgo) {
          hasMoreOrders = false;
          break;
        }

        // Get the order details URL
        const orderDetailsUrl = await order.$eval('a.view-details', (el: any) => el.href);
        
        // Navigate to order details page
        const detailsPage = await this.browser.newPage();
        await detailsPage.goto(orderDetailsUrl);
        
        // Wait for the items table to load
        await detailsPage.waitForSelector('table.order-items');
        
        // Extract items from the order
        const items = await detailsPage.$$('table.order-items tr:not(.header-row)');
        console.log(`Found ${items.length} items in this order`);
        for (const item of items) {
          const itemData = await item.evaluate((el: any) => {
            const columns = el.querySelectorAll('td');
            if (columns.length < 4) return null; // Skip if not a valid item row
            
            const name = columns[0].textContent.trim();
            const quantityText = columns[1].textContent.trim();
            const priceText = columns[3].textContent.trim().replace('$', '');
            
            return {
              name,
              price: parseFloat(priceText),
              quantity: parseInt(quantityText)
            };
          });
          
          if (itemData) {
            console.log(`  - ${itemData.name}: ${itemData.quantity} @ $${itemData.price}`);
            purchases.push({
              item: itemData.name,
              unitPrice: itemData.price,
              quantity: itemData.quantity,
              date: orderDate
            });
          }
        }
        
        // Close the details page
        await detailsPage.close();
      }
      
      // Check for and click next page button if it exists
      const nextButton = await this.page.$('a.next:not(.disabled)');
      if (nextButton && hasMoreOrders) {
        console.log('Moving to next page...');
        await nextButton.click();
        await this.page.waitForTimeout(2000); // Wait for page transition
      } else {
        hasMoreOrders = false;
      }
    }
    
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
