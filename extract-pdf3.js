const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfFiles = [
  'Features - Accute.pdf',
  'Features - Cyloid.pdf',
  'Features - EPI-Q.pdf',
  'Features - VAMN.pdf',
  'Features - Luca.pdf'
];

async function extractPDFs() {
  for (const file of pdfFiles) {
    const pdfPath = path.join(__dirname, file);
    
    if (!fs.existsSync(pdfPath)) {
      console.log(`\n❌ File not found: ${file}`);
      continue;
    }
    
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const parser = new PDFParse();
      const data = await parser.parseBuffer(dataBuffer);
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📄 ${file}`);
      console.log(`${'='.repeat(80)}`);
      console.log(data.text || JSON.stringify(data, null, 2));
      
      // Also save to markdown file
      const mdFileName = file.replace('.pdf', '.md');
      const content = data.text || JSON.stringify(data, null, 2);
      fs.writeFileSync(
        path.join(__dirname, mdFileName),
        `# ${file.replace('.pdf', '').replace('Features - ', '')}\n\n${content}`
      );
      console.log(`\n✅ Saved to ${mdFileName}`);
      
    } catch (error) {
      console.log(`\n❌ Error reading ${file}: ${error.message}`);
      console.log(error.stack);
    }
  }
}

extractPDFs();
