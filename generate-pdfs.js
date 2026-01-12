/**
 * PDF Generator Script
 * Generates PDFs from HTML and Markdown files using Puppeteer
 * Uses system fonts to avoid Unicode issues
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Convert Markdown to HTML (basic conversion)
function markdownToHtml(markdown) {
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```[\w]*\n([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  
  // Tables - convert markdown tables to HTML
  const tableRegex = /\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (match, header, body) => {
    const headers = header.split('|').filter(h => h.trim()).map(h => `<th>${h.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });
  
  // Checkboxes
  html = html.replace(/- \[x\] (.*)/gim, '<li class="checked">$1</li>');
  html = html.replace(/- \[ \] (.*)/gim, '<li class="unchecked">$1</li>');
  
  // Lists
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');
  
  // Paragraphs and line breaks
  html = html.replace(/\n\n/gim, '</p><p>');
  html = html.replace(/^---$/gim, '<hr>');
  
  return html;
}

// HTML template with safe fonts
function wrapHtml(content, title) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 30px;
      font-size: 11px;
    }
    h1 {
      font-size: 24px;
      color: #0a0e27;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 8px;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 16px;
      color: #1e293b;
      margin-top: 25px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #f1f5f9;
      border-left: 3px solid #6366f1;
    }
    h3 {
      font-size: 13px;
      color: #334155;
      margin-top: 15px;
      margin-bottom: 8px;
    }
    p { margin-bottom: 8px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
    }
    code {
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 10px;
    }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 9px;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
    ul, ol {
      margin-left: 20px;
      margin-bottom: 12px;
    }
    li { margin-bottom: 4px; }
    li.checked::before { content: "[x] "; color: #10b981; font-weight: bold; }
    li.unchecked::before { content: "[ ] "; color: #94a3b8; }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 25px 0;
    }
    a { color: #6366f1; text-decoration: none; }
    .header-meta {
      color: #64748b;
      font-size: 10px;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 600;
    }
    .badge.green { background: #dcfce7; color: #166534; }
    .badge.blue { background: #dbeafe; color: #1e40af; }
    @page {
      margin: 1cm;
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

async function generatePDF(inputPath, outputPath, isHtml = false) {
  console.log(`Generating PDF: ${outputPath}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  let htmlContent;
  
  if (isHtml) {
    // Read HTML file directly
    htmlContent = fs.readFileSync(inputPath, 'utf-8');
  } else {
    // Convert Markdown to HTML
    const markdown = fs.readFileSync(inputPath, 'utf-8');
    const title = path.basename(inputPath, '.md').replace(/_/g, ' ');
    const convertedHtml = markdownToHtml(markdown);
    htmlContent = wrapHtml(convertedHtml, title);
  }
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  });
  
  await browser.close();
  console.log(`PDF generated: ${outputPath}`);
}

async function main() {
  const baseDir = __dirname;
  
  // Generate SEO Roadmap PDF
  await generatePDF(
    path.join(baseDir, 'docs/seo-marketing/SEO_ROADMAP.md'),
    path.join(baseDir, 'docs/SEO_ROADMAP.pdf'),
    false
  );
  
  // Generate SuperAdmin E2E Test Guide PDF
  await generatePDF(
    path.join(baseDir, 'SuperAdmin_E2E_Test_Guide.html'),
    path.join(baseDir, 'SuperAdmin_E2E_Test_Guide.pdf'),
    true
  );
  
  console.log('\nAll PDFs generated successfully!');
}

main().catch(console.error);
