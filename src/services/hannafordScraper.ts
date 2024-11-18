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
    console.log('Navigating to login page...');
    await this.page.goto('https://www.hannaford.com/login', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    // Wait for Okta redirect
    await this.page.waitForTimeout(5000);
    console.log('Current URL:', await this.page.url());
    
    // Wait for Okta login form
    console.log('Waiting for Okta login form...');
    try {
      await this.page.waitForSelector('#okta-signin-username', { timeout: 30000 });
    } catch (error) {
      console.error('Okta login form not found, dumping page content...');
      const content = await this.page.content();
      console.log(content);
      throw new Error('Okta login form not found - check page structure');
    }
    
    // Find the username and password fields
    const usernameSelector = await this.page.waitForSelector('#okta-signin-username');
    const passwordSelector = await this.page.waitForSelector('#okta-signin-password');
    
    // Type credentials
    console.log('Entering credentials...');
    await usernameSelector.type(credentials.username);
    await passwordSelector.type(credentials.password);
    
    // Find and click the sign in button
    console.log('Looking for Okta sign in button...');
    const signInButton = await this.page.waitForSelector('#okta-signin-submit');
    
    // Click sign in button and wait for navigation
    console.log('Submitting Okta login form...');
    await Promise.all([
      this.page.waitForNavigation({ 
        waitUntil: 'networkidle0',
        timeout: 60000 
      }),
      signInButton.click()
    ]);

    // Handle potential MFA challenge
    try {
      const mfaPresent = await this.page.waitForSelector('#input-mfa', { timeout: 5000 });
      if (mfaPresent) {
        console.log('MFA challenge detected - manual intervention required');
        throw new Error('MFA challenge detected - cannot proceed automatically');
      }
    } catch (error) {
      if (!error.message.includes('MFA challenge detected')) {
        console.log('No MFA challenge detected, proceeding...');
      } else {
        throw error;
      }
    }

    // Verify login was successful
    console.log('Verifying login status...');
    try {
      await Promise.race([
        this.page.waitForSelector('.account-nav', { timeout: 20000 }),
        this.page.waitForSelector('.my-account', { timeout: 20000 }),
        this.page.waitForSelector('[data-testid="account-menu"]', { timeout: 20000 })
      ]);
      console.log('Login successful');
    } catch (error) {
      console.error('Login verification failed');
      const content = await this.page.content();
      console.log('Page content after login attempt:', content);
      throw new Error('Login failed - could not verify successful login');
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
