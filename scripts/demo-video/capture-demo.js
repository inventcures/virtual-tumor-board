/**
 * Virtual Tumor Board - Demo Video Capture Script
 * 
 * Uses Puppeteer to automate the UI flow and capture screen recording.
 * Requires: puppeteer, puppeteer-screen-recorder
 * 
 * Usage: node capture-demo.js
 */

const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  appUrl: 'https://virtual-tumor-board-production.up.railway.app',
  // Use local if testing: 'http://localhost:3333',
  
  docsFolder: '/Users/tp53/Documents/tp53_personal/bua__kanta-grover____29june2025/demo-video_journey_docs',
  outputFolder: '/Users/tp53/Documents/tp53_personal/bua__kanta-grover____29june2025/demo-video_journey_docs/demo-output',
  
  viewport: { width: 1920, height: 1080 },
  
  // Timing (in ms) - adjust for pacing
  delays: {
    pageLoad: 2000,
    afterClick: 800,
    afterUpload: 3000,
    showResult: 2000,
    deliberation: 5000,  // Wait for AI deliberation
    pdfPreview: 1500,
    literacySwitch: 2000,
  },
  
  // Limit docs to upload (for faster demo)
  maxDocs: 5,
};

// Files to upload (select key documents for demo)
const DEMO_FILES = [
  'histopath____Mrs.KANTA GROVER.pdf',
  'Kanta Grover er:pr:her2:ki67 report.pdf',
  'mammogram_____ROH25066029.pdf',
  '04july2025______pet-ct-scanned.pdf',
  'aiims discharge summary.pdf',
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureDemo() {
  console.log('Starting Virtual Tumor Board Demo Capture...\n');
  
  // Ensure output folder exists
  if (!fs.existsSync(CONFIG.outputFolder)) {
    fs.mkdirSync(CONFIG.outputFolder, { recursive: true });
  }
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,  // Show browser for debugging
    defaultViewport: CONFIG.viewport,
    args: [
      `--window-size=${CONFIG.viewport.width},${CONFIG.viewport.height}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  
  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport);
  
  // Setup screen recorder
  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: false,
    fps: 30,
    videoFrame: {
      width: CONFIG.viewport.width,
      height: CONFIG.viewport.height,
    },
    videoCrf: 18,  // Quality (lower = better, 18-28 is good)
    videoCodec: 'libx264',
    videoPreset: 'ultrafast',
    aspectRatio: '16:9',
  });
  
  const videoPath = path.join(CONFIG.outputFolder, 'vtb-demo.mp4');
  
  try {
    // Start recording
    await recorder.start(videoPath);
    console.log('Recording started...\n');
    
    // ========== STEP 1: Landing Page ==========
    console.log('Step 1: Navigate to landing page');
    await page.goto(CONFIG.appUrl, { waitUntil: 'networkidle2' });
    await sleep(CONFIG.delays.pageLoad);
    
    // ========== STEP 2: Click "Upload Your Records" ==========
    console.log('Step 2: Click Upload Your Records');
    await page.click('a[href="/upload"]');
    await sleep(CONFIG.delays.pageLoad);
    
    // ========== STEP 3: Select User Type (Patient/Caregiver) ==========
    console.log('Step 3: Select Patient/Caregiver');
    await page.click('button:has-text("Patient")');
    await sleep(CONFIG.delays.afterClick);
    
    // Click Continue
    await page.click('button:has-text("Continue")');
    await sleep(CONFIG.delays.pageLoad);
    
    // ========== STEP 4: Cancer Info - Click "Figure It Out" ==========
    console.log('Step 4: Click "Figure It Out For Me"');
    // Look for the gradient button with "Figure It Out" text
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Figure It Out')) {
          btn.click();
          return;
        }
      }
    });
    await sleep(CONFIG.delays.afterClick);
    
    // Click Continue
    await page.click('button:has-text("Continue")');
    await sleep(CONFIG.delays.pageLoad);
    
    // ========== STEP 5: Upload Documents ==========
    console.log('Step 5: Upload documents');
    
    // Get the file input
    const fileInput = await page.$('input[type="file"]');
    
    if (fileInput) {
      // Prepare file paths
      const filePaths = DEMO_FILES
        .slice(0, CONFIG.maxDocs)
        .map(f => path.join(CONFIG.docsFolder, f))
        .filter(f => fs.existsSync(f));
      
      console.log(`  Uploading ${filePaths.length} files...`);
      
      // Upload files
      await fileInput.uploadFile(...filePaths);
      
      // Wait for processing (this takes time)
      console.log('  Waiting for document processing...');
      await sleep(CONFIG.delays.afterUpload * filePaths.length);
    }
    
    // Click Continue to Review
    console.log('Step 6: Continue to Review');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Continue') || btn.textContent.includes('Review')) {
          btn.click();
          return;
        }
      }
    });
    await sleep(CONFIG.delays.pageLoad);
    
    // ========== STEP 6: Auto-Stage Confirmation ==========
    console.log('Step 7: Auto-stage confirmation');
    await sleep(CONFIG.delays.showResult);
    
    // Click Continue/Confirm
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Continue') || btn.textContent.includes('Confirm') || btn.textContent.includes('Proceed')) {
          btn.click();
          return;
        }
      }
    });
    await sleep(CONFIG.delays.pageLoad);
    
    // ========== STEP 7: Review Page ==========
    console.log('Step 8: Review page');
    await sleep(CONFIG.delays.showResult);
    
    // Click Start Tumor Board
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Start') || btn.textContent.includes('Tumor Board')) {
          btn.click();
          return;
        }
      }
    });
    
    // ========== STEP 8: Deliberation - Wait for completion ==========
    console.log('Step 9: Watching deliberation...');
    
    // Wait for deliberation to complete (watch for "Complete" status)
    let deliberationComplete = false;
    const maxWaitTime = 120000; // 2 minutes max
    const startTime = Date.now();
    
    while (!deliberationComplete && (Date.now() - startTime) < maxWaitTime) {
      await sleep(3000);
      
      deliberationComplete = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Deliberation Complete') || text.includes('Consensus Reached');
      });
      
      console.log('  Waiting for deliberation...');
    }
    
    console.log('  Deliberation complete!');
    await sleep(CONFIG.delays.showResult);
    
    // ========== STEP 9: Click Download Report ==========
    console.log('Step 10: Click Download Report');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Download') || btn.textContent.includes('Report')) {
          btn.click();
          return;
        }
      }
    });
    await sleep(CONFIG.delays.pdfPreview);
    
    // ========== STEP 10: Switch Literacy Levels ==========
    console.log('Step 11: Demonstrate literacy level switching');
    
    // Click "Easy to Understand"
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Easy')) {
          btn.click();
          return;
        }
      }
    });
    await sleep(CONFIG.delays.literacySwitch);
    
    // Click "Standard"
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Standard')) {
          btn.click();
          return;
        }
      }
    });
    await sleep(CONFIG.delays.literacySwitch);
    
    // Click "Medical Professional"
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Professional') || btn.textContent.includes('Technical')) {
          btn.click();
          return;
        }
      }
    });
    await sleep(CONFIG.delays.literacySwitch);
    
    // ========== STEP 11: Download PDF ==========
    console.log('Step 12: Download PDF');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Download') && btn.textContent.includes('PDF')) {
          btn.click();
          return;
        }
      }
    });
    await sleep(CONFIG.delays.showResult);
    
    // Final pause
    await sleep(2000);
    
    // Stop recording
    await recorder.stop();
    console.log('\nRecording stopped.');
    console.log(`Video saved to: ${videoPath}`);
    
    // Generate GIF (using ffmpeg if available)
    console.log('\nGenerating GIF...');
    const gifPath = path.join(CONFIG.outputFolder, 'vtb-demo.gif');
    
    const { exec } = require('child_process');
    exec(`ffmpeg -i "${videoPath}" -vf "fps=10,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${gifPath}"`, (error) => {
      if (error) {
        console.log('GIF generation failed (ffmpeg may not be installed)');
      } else {
        console.log(`GIF saved to: ${gifPath}`);
      }
    });
    
  } catch (error) {
    console.error('Error during capture:', error);
    await recorder.stop();
  } finally {
    await browser.close();
  }
  
  console.log('\nDemo capture complete!');
}

// Run
captureDemo().catch(console.error);
