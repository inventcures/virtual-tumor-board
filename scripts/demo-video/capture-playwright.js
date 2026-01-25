/**
 * Virtual Tumor Board - Demo Video Capture with Playwright
 * 
 * Captures screenshots at each step, then uses ffmpeg to create video.
 * Much faster than full video recording and produces cleaner output.
 * 
 * Usage: node capture-playwright.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  appUrl: 'https://virtual-tumor-board-production.up.railway.app',
  docsFolder: '/Users/tp53/Documents/tp53_personal/bua__kanta-grover____29june2025/demo-video_journey_docs',
  outputFolder: '/Users/tp53/Documents/tp53_personal/bua__kanta-grover____29june2025/demo-video_journey_docs/demo-output',
  screenshotsFolder: '/Users/tp53/Documents/tp53_personal/bua__kanta-grover____29june2025/demo-video_journey_docs/demo-output/screenshots',
  
  viewport: { width: 1280, height: 720 },  // 720p for reasonable file size
  
  delays: {
    short: 500,
    medium: 1000,
    long: 2000,
    upload: 4000,
    deliberation: 3000,
  },
  
  maxDocs: 4,  // Fewer docs for faster demo
};

// Select key documents for demo
const DEMO_FILES = [
  'histopath____Mrs.KANTA GROVER.pdf',
  'Kanta Grover er:pr:her2:ki67 report.pdf',
  'mammogram_____ROH25066029.pdf',
  'aiims discharge summary.pdf',
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let screenshotCount = 0;

async function screenshot(page, name) {
  screenshotCount++;
  const filename = `${String(screenshotCount).padStart(3, '0')}_${name}.png`;
  await page.screenshot({ 
    path: path.join(CONFIG.screenshotsFolder, filename),
    fullPage: false,
  });
  console.log(`  Screenshot: ${filename}`);
}

async function captureDemo() {
  console.log('=== Virtual Tumor Board Demo Capture ===\n');
  
  // Create folders
  [CONFIG.outputFolder, CONFIG.screenshotsFolder].forEach(f => {
    if (!fs.existsSync(f)) fs.mkdirSync(f, { recursive: true });
  });
  
  // Clean old screenshots
  fs.readdirSync(CONFIG.screenshotsFolder).forEach(f => {
    fs.unlinkSync(path.join(CONFIG.screenshotsFolder, f));
  });
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100,  // Slow down for visibility
  });
  
  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    recordVideo: {
      dir: CONFIG.outputFolder,
      size: CONFIG.viewport,
    },
  });
  
  const page = await context.newPage();
  
  try {
    // ===== STEP 1: Landing Page =====
    console.log('Step 1: Landing page');
    await page.goto(CONFIG.appUrl);
    await sleep(CONFIG.delays.long);
    await screenshot(page, 'landing');
    
    // ===== STEP 2: Click Upload =====
    console.log('Step 2: Navigate to upload');
    await page.click('a[href="/upload"]');
    await sleep(CONFIG.delays.medium);
    await screenshot(page, 'user-type');
    
    // ===== STEP 3: Select Patient =====
    console.log('Step 3: Select Patient/Caregiver');
    await page.click('text=Patient');
    await sleep(CONFIG.delays.short);
    await screenshot(page, 'patient-selected');
    
    await page.click('button:has-text("Continue")');
    await sleep(CONFIG.delays.medium);
    await screenshot(page, 'cancer-info');
    
    // ===== STEP 4: Figure It Out =====
    console.log('Step 4: Click Figure It Out');
    const figureItOutBtn = page.locator('button', { hasText: 'Figure It Out' });
    if (await figureItOutBtn.count() > 0) {
      await figureItOutBtn.first().click();
      // Wait for AI to determine cancer type (this can take a few seconds)
      console.log('  Waiting for AI to analyze cancer type...');
      await sleep(CONFIG.delays.long * 3); // 6 seconds for AI processing
    }
    await screenshot(page, 'figure-it-out');
    
    // Wait for Continue button to be enabled
    console.log('  Waiting for Continue button to be enabled...');
    try {
      await page.waitForSelector('button:has-text("Continue"):not([disabled])', { timeout: 30000 });
    } catch (e) {
      console.log('  Continue button still disabled, trying to proceed anyway...');
    }
    
    await page.click('button:has-text("Continue")');
    await sleep(CONFIG.delays.medium);
    await screenshot(page, 'documents-page');
    
    // ===== STEP 5: Upload Documents =====
    console.log('Step 5: Upload documents');
    
    const fileInput = page.locator('input[type="file"]');
    const filePaths = DEMO_FILES
      .slice(0, CONFIG.maxDocs)
      .map(f => path.join(CONFIG.docsFolder, f))
      .filter(f => fs.existsSync(f));
    
    console.log(`  Uploading ${filePaths.length} files...`);
    
    if (filePaths.length > 0) {
      await fileInput.setInputFiles(filePaths);
      
      // Wait for processing
      for (let i = 0; i < filePaths.length; i++) {
        await sleep(CONFIG.delays.upload);
        await screenshot(page, `uploading-${i + 1}`);
      }
    }
    
    await sleep(CONFIG.delays.long);
    await screenshot(page, 'documents-uploaded');
    
    // ===== STEP 6: Continue to Auto-Stage =====
    console.log('Step 6: Continue to auto-stage');
    const continueBtn = page.locator('button:has-text("Continue")');
    if (await continueBtn.count() > 0) {
      await continueBtn.first().click();
    }
    await sleep(CONFIG.delays.long);
    await screenshot(page, 'auto-stage');
    
    // ===== STEP 7: Confirm and Continue =====
    console.log('Step 7: Confirm staging');
    const confirmBtn = page.locator('button', { hasText: /Continue|Confirm|Proceed/ });
    if (await confirmBtn.count() > 0) {
      await confirmBtn.first().click();
    }
    await sleep(CONFIG.delays.medium);
    await screenshot(page, 'review-page');
    
    // ===== STEP 8: Start Tumor Board =====
    console.log('Step 8: Start Tumor Board');
    const startBtn = page.locator('button', { hasText: /Start|Tumor Board/ });
    if (await startBtn.count() > 0) {
      await startBtn.first().click();
    }
    await sleep(CONFIG.delays.medium);
    await screenshot(page, 'deliberation-start');
    
    // ===== STEP 9: Wait for Deliberation =====
    console.log('Step 9: Waiting for deliberation...');
    
    // Wait for completion (max 5 minutes = 300 seconds)
    let complete = false;
    const maxWait = 300000;
    const startTime = Date.now();
    let captureCount = 0;
    
    while (!complete && (Date.now() - startTime) < maxWait) {
      await sleep(CONFIG.delays.deliberation);
      
      const pageText = await page.textContent('body');
      complete = pageText.includes('Deliberation Complete') || 
                 pageText.includes('Consensus Reached') ||
                 pageText.includes('Download Report');
      
      captureCount++;
      if (captureCount % 2 === 0) {
        await screenshot(page, `deliberation-${captureCount}`);
      }
      
      console.log(`  Waiting... (${Math.round((Date.now() - startTime) / 1000)}s)`);
    }
    
    await sleep(CONFIG.delays.long);
    await screenshot(page, 'deliberation-complete');
    
    // ===== STEP 10: Open PDF Modal =====
    console.log('Step 10: Open PDF download modal');
    const downloadBtn = page.locator('button', { hasText: /Download|Report/ });
    if (await downloadBtn.count() > 0) {
      await downloadBtn.first().click();
    }
    await sleep(CONFIG.delays.long);
    await screenshot(page, 'pdf-modal-standard');
    
    // ===== STEP 11: Switch Literacy Levels =====
    console.log('Step 11: Demonstrate literacy levels');
    
    // Simple
    const simpleBtn = page.locator('button', { hasText: /Easy|Simple/ });
    if (await simpleBtn.count() > 0) {
      await simpleBtn.first().click();
      await sleep(CONFIG.delays.long);
      await screenshot(page, 'pdf-modal-simple');
    }
    
    // Standard
    const standardBtn = page.locator('button', { hasText: 'Standard' });
    if (await standardBtn.count() > 0) {
      await standardBtn.first().click();
      await sleep(CONFIG.delays.long);
      await screenshot(page, 'pdf-modal-standard-2');
    }
    
    // Technical
    const techBtn = page.locator('button', { hasText: /Technical|Professional/ });
    if (await techBtn.count() > 0) {
      await techBtn.first().click();
      await sleep(CONFIG.delays.long);
      await screenshot(page, 'pdf-modal-technical');
    }
    
    // ===== STEP 12: Final =====
    console.log('Step 12: Final screenshot');
    await screenshot(page, 'final');
    
    await sleep(CONFIG.delays.long);
    
  } catch (error) {
    console.error('Error:', error);
    await screenshot(page, 'error');
  } finally {
    await context.close();
    await browser.close();
  }
  
  // ===== Create Video from Screenshots =====
  console.log('\n=== Creating video from screenshots ===');
  
  const videoPath = path.join(CONFIG.outputFolder, 'LATEST_____vtb-demo.mp4');
  const gifPath = path.join(CONFIG.outputFolder, 'LATEST_____vtb-demo.gif');
  
  try {
    // Create MP4 (2 fps for ~2 min total with ~240 frames possible, but we have fewer)
    // Adjust framerate based on screenshot count
    const fps = Math.max(1, Math.ceil(screenshotCount / 120));  // Target ~2 min
    
    execSync(`ffmpeg -y -framerate ${fps} -pattern_type glob -i "${CONFIG.screenshotsFolder}/*.png" -c:v libx264 -pix_fmt yuv420p -vf "scale=1280:720" "${videoPath}"`, {
      stdio: 'inherit'
    });
    console.log(`MP4 saved: ${videoPath}`);
    
    // Create GIF (lower quality for smaller size)
    execSync(`ffmpeg -y -i "${videoPath}" -vf "fps=5,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${gifPath}"`, {
      stdio: 'inherit'
    });
    console.log(`GIF saved: ${gifPath}`);
    
  } catch (error) {
    console.log('Video creation failed. Make sure ffmpeg is installed.');
    console.log('Screenshots are saved in:', CONFIG.screenshotsFolder);
  }
  
  console.log('\n=== Demo capture complete! ===');
  console.log(`Screenshots: ${CONFIG.screenshotsFolder}`);
  console.log(`Video: ${videoPath}`);
  console.log(`GIF: ${gifPath}`);
}

captureDemo().catch(console.error);
