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
    
    // Wait for page load
    await this.page.waitForTimeout(5000);
    console.log('Current URL:', await this.page.url());
    
    // Wait for login form
    console.log('Waiting for login form...');
    try {
      await this.page.waitForSelector('#userName', { timeout: 30000 });
    } catch (error) {
      console.error('Login form not found, dumping page content...');
      const content = await this.page.content();
      console.log(content);
      throw new Error('Login form not found - check page structure');
    }
    
    // Find the username and password fields
    const usernameSelector = await this.page.waitForSelector('#userName');
    const passwordSelector = await this.page.waitForSelector('#passwordField6');
    
    // Type credentials
    console.log('Entering credentials...');
    await usernameSelector.type(credentials.username);
    await passwordSelector.type(credentials.password);
    
    // Submit the login form by calling the registerUserLoyalty function directly
    console.log('Submitting login form...');
    try {
      await Promise.all([
        this.page.waitForNavigation({ 
          waitUntil: 'networkidle0',
          timeout: 60000 
        }),
        this.page.evaluate(() => {
          // Call the login function with the correct form and index
          if (typeof registerUserLoyalty === 'function') {
            const form = document.forms['registerUserLoyaltyForm6'];
            if (!form) {
              throw new Error('Login form not found');
            }
            registerUserLoyalty(form, 6);
          } else {
            throw new Error('registerUserLoyalty function not found');
          }
        })
      ]);
    } catch (error) {
      console.error('Error during login submission:', error);
      const buttonVisible = await this.page.evaluate(() => {
        const button = document.querySelector('button.btn.btn-primary');
        if (!button) return 'Button not found';
        const style = window.getComputedStyle(button);
        return {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          position: style.position,
          isVisible: button.offsetParent !== null
        };
      });
      console.log('Button visibility state:', buttonVisible);
      throw error;
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
    console.log('Navigating to orders page...');
    await this.page.goto('https://www.hannaford.com/account/my-orders/in-store', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    const purchases: PurchaseData[] = [];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    let hasMoreOrders = true;
    
    while (hasMoreOrders) {
      // Wait for orders table to load
      console.log('Waiting for orders to load...');
      try {
        await this.page.waitForSelector('.store-purchase-table', { timeout: 30000 });
      } catch (error) {
        console.error('Failed to find orders table. Current URL:', await this.page.url());
        const content = await this.page.content();
        console.log('Page content:', content);
        throw new Error('Could not find orders table - check page structure');
      }
      
      // Get all order rows on current page
      const orders = await this.page.$$('.store-purchase-table tbody tr:not(:last-child)');
      console.log(`Found ${orders.length} orders on current page`);
      
      for (const order of orders) {
        // Get order date and details URL
        const [dateText, detailsUrl] = await order.evaluate((row: Element) => {
          const dateCell = row.querySelector('.store-date');
          const detailsLink = row.querySelector('.view-details-link');
          return [
            dateCell?.textContent?.trim() || '',
            detailsLink?.getAttribute('href') || ''
          ];
        });

        const orderDate = new Date(dateText);
        console.log(`Processing order from ${orderDate.toLocaleDateString()}`);
        
        // Stop if order is older than a year
        if (orderDate < oneYearAgo) {
          hasMoreOrders = false;
          break;
        }

        // Construct full URL for order details
        const orderDetailsUrl = new URL(detailsUrl, 'https://www.hannaford.com').href;
        
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
      
      // Check if there are more orders to load
      const hasMoreOrdersToFetch = await this.page.evaluate(() => {
        const paginationData = window.ordersPaginationEventData;
        return paginationData && paginationData.displaySeeMoreButton;
      });

      if (hasMoreOrdersToFetch && hasMoreOrders) {
        console.log('Loading more orders...');
        try {
          await Promise.all([
            this.page.evaluate(() => {
              window.fetchMoreOrders(window.ordersPaginationEventData);
            }),
            this.page.waitForResponse(response => 
              response.url().includes('/user/instore_orderhistory.jsp'), 
              { timeout: 30000 }
            )
          ]);
          await this.page.waitForTimeout(2000); // Wait for DOM update
        } catch (error) {
          console.error('Failed to load more orders:', error);
          hasMoreOrders = false;
        }
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
