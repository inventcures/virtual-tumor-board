const pptxgen = require('pptxgenjs');
const html2pptx = require('/home/tp53/.claude/plugins/cache/claude-scientific-skills/scientific-skills/3a5f2e2227d6/scientific-skills/document-skills/pptx/scripts/html2pptx');
const path = require('path');

async function createPitchDeck() {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Virtual Tumor Board';
    pptx.title = 'Virtual Tumor Board - Blume Ventures Pitch';
    pptx.subject = 'Democratizing Expert Cancer Care in India';

    const slidesDir = path.join(__dirname, 'slides');

    // Slide 1: Cover
    await html2pptx(path.join(slidesDir, 'slide1-cover.html'), pptx);

    // Slide 2: The Story
    await html2pptx(path.join(slidesDir, 'slide2-story.html'), pptx);

    // Slide 3: The Problem
    await html2pptx(path.join(slidesDir, 'slide3-problem.html'), pptx);

    // Slide 4: What We Do
    await html2pptx(path.join(slidesDir, 'slide4-solution.html'), pptx);

    // Slide 5: Why Now
    await html2pptx(path.join(slidesDir, 'slide5-why-now.html'), pptx);

    // Slide 6: Impact
    await html2pptx(path.join(slidesDir, 'slide6-impact.html'), pptx);

    // Slide 7: Early Traction
    await html2pptx(path.join(slidesDir, 'slide7-traction.html'), pptx);

    // Slide 8: Vision
    await html2pptx(path.join(slidesDir, 'slide8-vision.html'), pptx);

    // Save presentation
    await pptx.writeFile({ fileName: path.join(__dirname, 'VTB-Blume-Pitch.pptx') });
    console.log('Presentation created: VTB-Blume-Pitch.pptx');
}

createPitchDeck().catch(err => {
    console.error('Error creating presentation:', err);
    process.exit(1);
});
