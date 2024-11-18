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
  private abortSignal: AbortSignal | undefined;

  constructor(signal?: AbortSignal) {
    this.abortSignal = signal;
  }

  async initialize() {
    // Check if already aborted
    if (this.abortSignal?.aborted) {
      throw new Error('Operation cancelled');
    }
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
    const checkAborted = () => {
      if (this.abortSignal?.aborted) {
        this.close(); // Clean up browser resources
        throw new Error('Operation cancelled');
      }
    };
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
      checkAborted(); // Check for cancellation before each iteration
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
        
        // Wait for the items to load
        await detailsPage.waitForSelector('.item-wrapper', { timeout: 30000 });
        
        // Extract items from the order
        const items = await detailsPage.$$('.item-wrapper');
        console.log(`Found ${items.length} items in this order`);
        for (const item of items) {
          const itemData = await item.evaluate((el: Element) => {
            const nameEl = el.querySelector('.productName');
            const qtyEl = el.querySelector('.qty');
            const priceEl = el.querySelector('.item-price');
            
            if (!nameEl || !qtyEl || !priceEl) return null;
            
            const name = nameEl.textContent?.trim() || '';
            const quantityText = qtyEl.textContent?.trim() || '0';
            const priceText = priceEl.getAttribute('value') || '0';
            
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
          // Get the current index for the next page
          const currentIndex = await this.page.evaluate(() => {
            return window.ordersPaginationEventData?.nextIndex || 0;
          });

          // Make the AJAX request directly
          const response = await this.page.evaluate(async (index) => {
            const response = await fetch('/account/my-orders/in-store', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `ajaxRefresh=true&currentIndex=${index}`
            });
            return response.text();
          }, currentIndex);

          // Parse the HTML response
          const parser = new DOMParser();
          const htmlDoc = parser.parseFromString(response, 'text/html');
          
          // Update the page content
          await this.page.evaluate((htmlContent) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            // Update the order history wrapper
            const existingWrapper = document.getElementById('orderHistoryWrapper');
            if (existingWrapper) {
              existingWrapper.innerHTML = tempDiv.querySelector('#orderHistoryWrapper').innerHTML;
            }
            
            // Update pagination data if present
            const scriptContent = tempDiv.querySelector('script:not([src])');
            if (scriptContent && scriptContent.textContent.includes('ordersPaginationEventData')) {
              eval(scriptContent.textContent);
            }
          }, response);

          await this.page.waitForTimeout(1000); // Short wait for DOM update
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
