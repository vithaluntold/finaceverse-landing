const fs = require('fs');
const path = require('path');

async function extractPDFs() {
  // Dynamic import for ES module
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const pdfFiles = [
    'Features - Accute.pdf',
    'Features - Cyloid.pdf',
    'Features - EPI-Q.pdf',
    'Features - VAMN.pdf',
    'Features - Luca.pdf'
  ];

  for (const file of pdfFiles) {
    const pdfPath = path.join(__dirname, file);
    
    if (!fs.existsSync(pdfPath)) {
      console.log(`\n❌ File not found: ${file}`);
      continue;
    }
    
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const uint8Array = new Uint8Array(dataBuffer);
      
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📄 ${file} (${pdf.numPages} pages)`);
      console.log(`${'='.repeat(80)}`);
      console.log(fullText);
      
      // Save to markdown file
      const mdFileName = file.replace('.pdf', '.md');
      fs.writeFileSync(
        path.join(__dirname, mdFileName),
        `# ${file.replace('.pdf', '').replace('Features - ', '')}\n\n${fullText}`
      );
      console.log(`\n✅ Saved to ${mdFileName}`);
      
    } catch (error) {
      console.log(`\n❌ Error reading ${file}: ${error.message}`);
    }
  }
}

extractPDFs();
