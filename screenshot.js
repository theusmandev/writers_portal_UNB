import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Need to set localStorage before navigating? 
  // We can just navigate, set localStorage, and reload.
  console.log('Navigating to localhost:5174...');
  await page.goto('http://localhost:5174/');
  await page.evaluate(() => {
    localStorage.removeItem('unb_notification_dismissed_v1');
  });
  await page.reload();
  
  // Wait for notification bar to appear (it should be immediate, but wait for bg-accent)
  await page.waitForSelector('.bg-accent');
  
  // 1. Mobile Screenshot
  console.log('Taking mobile screenshot...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500); // allow resize layout to settle
  await page.screenshot({ path: 'mobile_single_row.png' });
  
  // 2. Desktop Screenshot
  console.log('Taking desktop screenshot...');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'desktop_single_row.png' });
  
  // 3. Other pages (to verify gradient regression)
  console.log('Checking /submit page...');
  await page.goto('http://localhost:5174/submit');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'submit_page_desktop.png' });
  
  await browser.close();
  console.log('Screenshots saved.');
})();
