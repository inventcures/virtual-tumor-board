const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SITE_URL = 'https://virtual-tumor-board-production.up.railway.app';

async function captureScreenshots() {
  const assetsDir = path.join(__dirname, 'src', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  
  // Set viewport to match video dimensions
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });

  console.log(`Navigating to ${SITE_URL}...`);
  await page.goto(SITE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for page to fully render
  await page.waitForSelector('button', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Screenshot 1: Full page hero
  console.log('Capturing hero screenshot...');
  await page.screenshot({
    path: path.join(assetsDir, 'screenshot-hero.png'),
    clip: { x: 0, y: 0, width: 1080, height: 1080 },
  });

  // Screenshot 2: Case summary (scroll down a bit)
  console.log('Capturing case summary screenshot...');
  await page.evaluate(() => window.scrollTo(0, 100));
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({
    path: path.join(assetsDir, 'screenshot-case.png'),
    clip: { x: 0, y: 0, width: 1080, height: 1080 },
  });

  // Screenshot 3: Biomarkers section
  console.log('Capturing biomarkers screenshot...');
  await page.evaluate(() => window.scrollTo(0, 400));
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({
    path: path.join(assetsDir, 'screenshot-biomarkers.png'),
    clip: { x: 0, y: 0, width: 1080, height: 1080 },
  });

  // Screenshot 4: Button hover state
  console.log('Capturing button screenshot...');
  await page.evaluate(() => window.scrollTo(0, 600));
  await new Promise(resolve => setTimeout(resolve, 500));
  const button = await page.$('button');
  if (button) {
    await button.hover();
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  await page.screenshot({
    path: path.join(assetsDir, 'screenshot-button.png'),
    clip: { x: 0, y: 0, width: 1080, height: 1080 },
  });

  // Wide screenshot for 16:9
  console.log('Capturing wide screenshots...');
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  await page.goto(SITE_URL, { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await page.screenshot({
    path: path.join(assetsDir, 'screenshot-wide-hero.png'),
  });

  await page.evaluate(() => window.scrollTo(0, 200));
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({
    path: path.join(assetsDir, 'screenshot-wide-case.png'),
  });

  await browser.close();
  console.log('Screenshots saved to src/assets/');
}

captureScreenshots().catch(console.error);
