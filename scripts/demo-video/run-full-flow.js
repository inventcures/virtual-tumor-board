/**
 * Virtual Tumor Board - Full Flow Runner with PDF Download
 * 
 * Runs the complete flow: upload docs -> auto-stage -> deliberation -> download PDF
 * Opens the PDF when complete.
 * 
 * Usage: node run-full-flow.js
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
  pdfPrefix: 'latest_v7______',
  
  viewport: { width: 1400, height: 900 },
  
  delays: {
    short: 500,
    medium: 1000,
    long: 2000,
    upload: 5000,
    deliberation: 5000,
  },
  
  maxDocs: 4,
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

async function runFullFlow() {
  console.log('=== Virtual Tumor Board - Full Pipeline Run ===\n');
  console.log(`Output folder: ${CONFIG.outputFolder}`);
  console.log(`PDF prefix: ${CONFIG.pdfPrefix}`);
  
  // Create output folder
  if (!fs.existsSync(CONFIG.outputFolder)) {
    fs.mkdirSync(CONFIG.outputFolder, { recursive: true });
  }
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50,
  });
  
  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    acceptDownloads: true,
  });
  
  const page = await context.newPage();
  let pdfPath = null;
  
  try {
    // ===== STEP 1: Landing Page =====
    console.log('\n[1/10] Loading landing page...');
    await page.goto(CONFIG.appUrl);
    await sleep(CONFIG.delays.long);
    console.log('  Done.');
    
    // ===== STEP 2: Click Upload =====
    console.log('[2/10] Navigating to upload...');
    await page.click('a[href="/upload"]');
    await sleep(CONFIG.delays.medium);
    console.log('  Done.');
    
    // ===== STEP 3: Select Patient and Check Consent =====
    console.log('[3/10] Selecting Patient/Caregiver and accepting consent...');
    
    // The user type selection has clickable button cards
    // Select the first card which is "Patient / Caregiver"
    const patientCard = page.locator('button').filter({ hasText: 'Patient / Caregiver' });
    if (await patientCard.count() > 0) {
      await patientCard.first().click();
      console.log('  Selected Patient card');
    } else {
      // Fallback: click any button containing "Patient"
      await page.locator('button').filter({ hasText: 'Patient' }).first().click();
      console.log('  Selected Patient (fallback)');
    }
    await sleep(CONFIG.delays.short);
    
    // Check the consent checkbox by clicking the label (checkbox is sr-only/hidden)
    // The label contains text about "AI-generated advice"
    const consentLabel = page.locator('label').filter({ hasText: 'I understand' });
    if (await consentLabel.count() > 0) {
      await consentLabel.first().click();
      console.log('  Clicked consent label');
    } else {
      // Fallback: try to click the checkbox wrapper div
      const checkboxDiv = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'I understand' });
      if (await checkboxDiv.count() > 0) {
        await checkboxDiv.first().click();
        console.log('  Clicked consent div');
      }
    }
    await sleep(CONFIG.delays.short);
    
    // Now the Continue button should be enabled
    try {
      await page.waitForSelector('button:has-text("Continue"):not([disabled])', { timeout: 5000 });
      await page.click('button:has-text("Continue")');
      await sleep(CONFIG.delays.medium);
      console.log('  Done.');
    } catch (e) {
      console.log('  Error: Continue button still disabled');
      // Take a screenshot for debugging
      await page.screenshot({ path: path.join(CONFIG.outputFolder, 'debug-step3.png') });
      throw new Error('Could not proceed past user selection');
    }
    
    // ===== STEP 4: Auto-Detect (Figure It Out) =====
    console.log('[4/10] Clicking Auto-Detect button...');
    
    // The button says "Upload Documents & Auto-Detect"
    const autoDetectBtn = page.locator('button').filter({ hasText: 'Auto-Detect' });
    if (await autoDetectBtn.count() > 0) {
      await autoDetectBtn.first().click();
      console.log('  Clicked Auto-Detect button, navigating to documents page...');
      await sleep(CONFIG.delays.medium);
    } else {
      // Fallback: try looking for button with "Figure It Out" or just continue with breast cancer
      const figureItOutBtn = page.locator('button').filter({ hasText: 'Figure It Out' });
      if (await figureItOutBtn.count() > 0) {
        await figureItOutBtn.first().click();
        console.log('  Clicked Figure It Out button');
        await sleep(CONFIG.delays.medium);
      } else {
        // Select Breast cancer and continue manually
        console.log('  Auto-detect not found, selecting Breast cancer...');
        const breastCancerBtn = page.locator('button').filter({ hasText: 'Breast' });
        if (await breastCancerBtn.count() > 0) {
          await breastCancerBtn.first().click();
          await sleep(CONFIG.delays.short);
          await page.click('button:has-text("Continue")');
        }
      }
    }
    await sleep(CONFIG.delays.medium);
    console.log('  Done.');
    
    // ===== STEP 5: Upload Documents =====
    console.log('[5/10] Uploading documents...');
    
    const fileInput = page.locator('input[type="file"]');
    const filePaths = DEMO_FILES
      .slice(0, CONFIG.maxDocs)
      .map(f => path.join(CONFIG.docsFolder, f))
      .filter(f => fs.existsSync(f));
    
    console.log(`  Found ${filePaths.length} files to upload:`);
    filePaths.forEach(f => console.log(`    - ${path.basename(f)}`));
    
    if (filePaths.length > 0) {
      await fileInput.setInputFiles(filePaths);
      
      // Wait for all documents to process
      console.log('  Processing documents...');
      for (let i = 0; i < filePaths.length; i++) {
        await sleep(CONFIG.delays.upload);
        console.log(`    Processed ${i + 1}/${filePaths.length}`);
      }
    }
    
    await sleep(CONFIG.delays.long);
    console.log('  Done.');
    
    // ===== STEP 6: Continue to Auto-Stage =====
    console.log('[6/10] Running auto-staging...');
    const continueBtn = page.locator('button:has-text("Continue")');
    if (await continueBtn.count() > 0) {
      await continueBtn.first().click();
    }
    
    // Wait for auto-staging to complete
    await sleep(CONFIG.delays.long * 3);
    console.log('  Done.');
    
    // ===== STEP 7: Confirm and Continue to Review =====
    console.log('[7/10] Confirming staging and going to review...');
    const confirmBtn = page.locator('button', { hasText: /Continue|Confirm|Proceed/ });
    if (await confirmBtn.count() > 0) {
      await confirmBtn.first().click();
    }
    await sleep(CONFIG.delays.long);
    console.log('  Done.');
    
    // ===== STEP 8: Start Tumor Board =====
    console.log('[8/10] Starting Tumor Board deliberation...');
    const startBtn = page.locator('button', { hasText: /Start|Tumor Board/ });
    if (await startBtn.count() > 0) {
      await startBtn.first().click();
    }
    await sleep(CONFIG.delays.medium);
    console.log('  Deliberation started.');
    
    // ===== STEP 9: Wait for Deliberation =====
    console.log('[9/10] Waiting for deliberation to complete...');
    
    let complete = false;
    const maxWait = 300000; // 5 minutes
    const startTime = Date.now();
    
    while (!complete && (Date.now() - startTime) < maxWait) {
      await sleep(CONFIG.delays.deliberation);
      
      const pageText = await page.textContent('body');
      complete = pageText.includes('Deliberation Complete') || 
                 pageText.includes('Consensus Reached') ||
                 pageText.includes('Download Report') ||
                 pageText.includes('Generate Report');
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r  Elapsed: ${elapsed}s...`);
    }
    
    console.log('\n  Deliberation complete!');
    await sleep(CONFIG.delays.long);
    
    // ===== STEP 10: Navigate to Results and Download PDF =====
    console.log('[10/10] Navigating to results and downloading PDF...');
    
    // We might still be on auto-stage page, need to click "Confirm & Continue" 
    const confirmContinueBtn = page.locator('button').filter({ hasText: 'Confirm & Continue' });
    if (await confirmContinueBtn.count() > 0) {
      console.log('  Clicking Confirm & Continue to go to review page...');
      await confirmContinueBtn.first().click();
      await sleep(CONFIG.delays.long);
    }
    
    // Now check if we need to start the tumor board from review page
    const startTumorBoardBtn = page.locator('button').filter({ hasText: /Start.*Tumor Board|Begin.*Deliberation/ });
    if (await startTumorBoardBtn.count() > 0) {
      console.log('  Starting Tumor Board deliberation...');
      await startTumorBoardBtn.first().click();
      await sleep(CONFIG.delays.long);
      
      // Wait for deliberation to complete (again if needed)
      let complete = false;
      const maxWait = 300000;
      const startTime = Date.now();
      
      while (!complete && (Date.now() - startTime) < maxWait) {
        await sleep(CONFIG.delays.deliberation);
        const pageText = await page.textContent('body');
        complete = pageText.includes('Deliberation Complete') || 
                   pageText.includes('Consensus Reached') ||
                   pageText.includes('Download Report') ||
                   pageText.includes('Generate Report');
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        process.stdout.write(`\r  Waiting for deliberation: ${elapsed}s...`);
      }
      console.log('\n  Deliberation complete!');
    }
    
    await sleep(CONFIG.delays.long);
    
    // Take a screenshot to see current state
    const stateScreenshot = path.join(CONFIG.outputFolder, `${CONFIG.pdfPrefix}current-state.png`);
    await page.screenshot({ path: stateScreenshot, fullPage: true });
    console.log(`  State screenshot saved: ${stateScreenshot}`);
    
    // Look for Download Report / Generate Report button
    const reportBtn = page.locator('button').filter({ hasText: /Download.*Report|Generate.*Report|View.*Report/ });
    if (await reportBtn.count() > 0) {
      console.log('  Clicking report button to open PDF modal...');
      await reportBtn.first().click();
      await sleep(CONFIG.delays.long * 3); // Wait for PDF to generate
    }
    
    // Now look for the actual Download PDF button in the modal
    await sleep(CONFIG.delays.long * 2);
    
    const pdfDownloadBtn = page.locator('button').filter({ hasText: /Download.*PDF/ });
    console.log('  Looking for Download PDF button...');
    const btnCount = await pdfDownloadBtn.count();
    console.log(`  Found ${btnCount} matching buttons`);
    
    if (btnCount > 0) {
      console.log('  Setting up download handler and clicking Download PDF button...');
      
      // Take screenshot of modal before download
      const modalScreenshot = path.join(CONFIG.outputFolder, `${CONFIG.pdfPrefix}pdf-modal.png`);
      await page.screenshot({ path: modalScreenshot });
      console.log(`  Modal screenshot saved: ${modalScreenshot}`);
      
      // Set up download listener
      try {
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
        await pdfDownloadBtn.first().click();
        
        const download = await downloadPromise;
        
        // Save the file with our prefix
        const timestamp = Date.now();
        const pdfFilename = `${CONFIG.pdfPrefix}tumor-board-report-${timestamp}.pdf`;
        pdfPath = path.join(CONFIG.outputFolder, pdfFilename);
        
        await download.saveAs(pdfPath);
        console.log(`  PDF saved to: ${pdfPath}`);
      } catch (downloadError) {
        console.log('  Download event not captured, PDF may have been saved via blob URL...');
        console.log('  Checking Downloads folder...');
        
        // Wait for browser to complete download
        await sleep(CONFIG.delays.long * 2);
        
        // Check for recently downloaded PDFs
        try {
          const downloadsFolder = path.join(require('os').homedir(), 'Downloads');
          const files = fs.readdirSync(downloadsFolder)
            .filter(f => f.endsWith('.pdf') && f.includes('tumor-board'))
            .map(f => ({
              name: f,
              path: path.join(downloadsFolder, f),
              time: fs.statSync(path.join(downloadsFolder, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);
          
          if (files.length > 0 && (Date.now() - files[0].time) < 60000) {
            // Found a recent PDF, move it
            const destPath = path.join(CONFIG.outputFolder, `${CONFIG.pdfPrefix}${files[0].name}`);
            fs.copyFileSync(files[0].path, destPath);
            pdfPath = destPath;
            console.log(`  Found and copied PDF to: ${pdfPath}`);
          }
        } catch (e) {
          console.log('  Could not check Downloads folder');
        }
      }
    } else {
      console.log('  Download PDF button not found, listing all buttons...');
      const allButtons = await page.locator('button').all();
      console.log(`  Found ${allButtons.length} total buttons on page`);
      
      for (let i = 0; i < Math.min(allButtons.length, 15); i++) {
        const text = await allButtons[i].textContent();
        console.log(`    Button ${i}: "${text?.substring(0, 60)}"`);
      }
    }
    
    await sleep(CONFIG.delays.long);
    
  } catch (error) {
    console.error('\nError:', error.message);
  } finally {
    await sleep(CONFIG.delays.long);
    await context.close();
    await browser.close();
  }
  
  // ===== Open PDF =====
  if (pdfPath && fs.existsSync(pdfPath)) {
    console.log('\n=== Opening PDF ===');
    console.log(`File: ${pdfPath}`);
    
    try {
      // macOS: open with default PDF viewer
      execSync(`open "${pdfPath}"`);
      console.log('PDF opened successfully!');
    } catch (error) {
      console.log('Could not auto-open PDF. Please open manually:', pdfPath);
    }
  } else {
    console.log('\nPDF was not downloaded. Check the browser console for errors.');
  }
  
  console.log('\n=== Pipeline Complete! ===');
}

runFullFlow().catch(console.error);
