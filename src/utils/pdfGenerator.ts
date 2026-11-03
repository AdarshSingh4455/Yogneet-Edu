/**
 * Zero-dependency client-side PDF document generator for Yogneet Edu Practical Assessments.
 * Emits a valid PDF-1.4 binary document with:
 * - Professional header and Phoenix / YOGNEET EDU branding
 * - Assignment metadata (title, subject, module, deadline, marks)
 * - Structured sections (Problem Statement, Instructions, Topics, Deliverables, Rubric)
 * - Light branded watermark ("YOGNEET EDU")
 * - Page numbers and footer
 */

import { PracticalAssignment } from '../types';

interface TextLine {
  text: string;
  fontSize: number;
  isBold?: boolean;
  color?: [number, number, number]; // RGB 0..1
  indent?: number;
  lineGap?: number;
}

/**
 * Escapes characters for PDF string literals: (, ), \
 */
function escapePdfText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    // Clean up non-ASCII characters gracefully
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ');
}

/**
 * Wraps text to fit approximately within maxCharsPerLine.
 */
function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\r?\n/);

  for (const para of paragraphs) {
    if (para.trim().length === 0) {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxChars) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

export function buildAssignmentPdfBytes(assignment: PracticalAssignment): Uint8Array {
  // Page geometry: standard Letter / A4 (612 x 792 pt)
  const pageWidth = 612;
  const pageHeight = 792;
  const marginTop = 54;
  const marginBottom = 54;
  const marginLeft = 54;
  const contentWidth = pageWidth - marginLeft * 2;
  const usableHeight = pageHeight - marginTop - marginBottom;

  // Build sequential list of formatted lines
  const lines: TextLine[] = [];

  // Header Banner
  lines.push({ text: 'YOGNEET EDU — PRACTICAL ASSESSMENT', fontSize: 16, isBold: true, color: [0.04, 0.08, 0.2] });
  lines.push({ text: 'Curriculum & Technical Engineering Division', fontSize: 9, color: [0.4, 0.45, 0.55], lineGap: 12 });
  lines.push({ text: `TITLE: ${assignment.title.toUpperCase()}`, fontSize: 14, isBold: true, color: [0, 0.5, 0.75], lineGap: 4 });
  lines.push({ text: `Subject: ${assignment.subject}  |  Module: ${assignment.module || 'Core'}  |  Total Marks: ${assignment.totalMarks}`, fontSize: 10, isBold: true, color: [0.15, 0.2, 0.3], lineGap: 4 });
  if (assignment.deadline) {
    const d = new Date(assignment.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    lines.push({ text: `Submission Deadline: ${d}`, fontSize: 9, color: [0.85, 0.35, 0.1], lineGap: 8 });
  } else {
    lines.push({ text: 'Submission Deadline: Self-Paced / Immediate Submission', fontSize: 9, color: [0.3, 0.6, 0.3], lineGap: 8 });
  }

  // Section 1: Problem Statement
  lines.push({ text: '1. PROBLEM STATEMENT', fontSize: 12, isBold: true, color: [0.04, 0.08, 0.2], lineGap: 4 });
  const problemLines = wrapText(assignment.problemStatement, 85);
  for (const pl of problemLines) {
    lines.push({ text: pl, fontSize: 9.5, color: [0.2, 0.2, 0.25], indent: 8 });
  }
  lines.push({ text: '', fontSize: 6, lineGap: 6 });

  // Section 2: Instructions
  lines.push({ text: '2. DETAILED INSTRUCTIONS & REQUIREMENTS', fontSize: 12, isBold: true, color: [0.04, 0.08, 0.2], lineGap: 4 });
  const instructionLines = wrapText(assignment.instructions, 85);
  for (const il of instructionLines) {
    lines.push({ text: il, fontSize: 9.5, color: [0.2, 0.2, 0.25], indent: 8 });
  }
  lines.push({ text: '', fontSize: 6, lineGap: 6 });

  // Section 3: Topics & Skills Covered
  if (assignment.topics && assignment.topics.length > 0) {
    lines.push({ text: '3. TOPICS & TECHNICAL SKILLS TESTED', fontSize: 12, isBold: true, color: [0.04, 0.08, 0.2], lineGap: 4 });
    for (const t of assignment.topics) {
      lines.push({ text: `* ${t}`, fontSize: 9.5, color: [0.2, 0.2, 0.25], indent: 14 });
    }
    lines.push({ text: '', fontSize: 6, lineGap: 6 });
  }

  // Section 4: Deliverables
  if (assignment.deliverables && assignment.deliverables.length > 0) {
    lines.push({ text: '4. REQUIRED DELIVERABLES', fontSize: 12, isBold: true, color: [0.04, 0.08, 0.2], lineGap: 4 });
    for (const d of assignment.deliverables) {
      lines.push({ text: `* ${d}`, fontSize: 9.5, color: [0.2, 0.2, 0.25], indent: 14 });
    }
    lines.push({ text: '', fontSize: 6, lineGap: 6 });
  }

  // Section 5: Evaluation Criteria & Rubric
  if (assignment.rubric && assignment.rubric.length > 0) {
    lines.push({ text: '5. EVALUATION CRITERIA & RUBRIC', fontSize: 12, isBold: true, color: [0.04, 0.08, 0.2], lineGap: 4 });
    for (const item of assignment.rubric) {
      lines.push({
        text: `* ${item.criteria} (${item.marks} Marks)${item.description ? ` — ${item.description}` : ''}`,
        fontSize: 9.5,
        color: [0.2, 0.2, 0.25],
        indent: 14,
      });
    }
    lines.push({ text: '', fontSize: 6, lineGap: 6 });
  }

  // Distribute lines into pages
  const pages: TextLine[][] = [];
  let currentPageLines: TextLine[] = [];
  let currentY = 0;

  for (const item of lines) {
    const itemHeight = (item.fontSize || 10) * 1.35 + (item.lineGap || 2);
    if (currentY + itemHeight > usableHeight && currentPageLines.length > 0) {
      pages.push(currentPageLines);
      currentPageLines = [];
      currentY = 0;
    }
    currentPageLines.push(item);
    currentY += itemHeight;
  }
  if (currentPageLines.length > 0) {
    pages.push(currentPageLines);
  }
  if (pages.length === 0) {
    pages.push([]);
  }

  const totalPages = pages.length;

  // Build PDF Objects
  // 1 0 obj: Catalog
  // 2 0 obj: Pages
  // 3 0 obj: Font Regular (Helvetica)
  // 4 0 obj: Font Bold (Helvetica-Bold)
  // 5..(4 + N): Page objects
  // (5 + N)..(4 + 2N): Content stream objects
  const objects: string[] = [];
  const pageObjIds: number[] = [];

  for (let i = 0; i < totalPages; i++) {
    pageObjIds.push(5 + i);
  }

  // Object 1: Catalog
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  // Object 2: Pages
  objects[2] = `<< /Type /Pages /Kids [ ${pageObjIds.map(id => `${id} 0 R`).join(' ')} ] /Count ${totalPages} >>`;

  // Object 3: Helvetica
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

  // Object 4: Helvetica-Bold
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  // Create Page & Content Stream objects
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageNum = pageIdx + 1;
    const pageLines = pages[pageIdx];
    const streamObjId = 5 + totalPages + pageIdx;
    const pageObjId = 5 + pageIdx;

    // Page Object
    objects[pageObjId] = `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${pageWidth} ${pageHeight} ] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamObjId} 0 R >>`;

    // Content Stream commands
    const streamParts: string[] = [];

    // 1. Decorative Header Rule & Cyan Bar
    streamParts.push('q');
    streamParts.push('0.04 0.08 0.2 rg'); // Yogneet Navy
    streamParts.push(`0 ${pageHeight - 8} ${pageWidth} 8 re f`);
    streamParts.push('0 0.78 0.91 rg'); // Yogneet Cyan
    streamParts.push(`0 ${pageHeight - 12} ${pageWidth} 4 re f`);
    streamParts.push('Q');

    // 2. Light Branded Diagonal Watermark in Center
    streamParts.push('q');
    streamParts.push('0.93 0.95 0.97 rg'); // Very light watermark gray-cyan
    streamParts.push('BT');
    streamParts.push('/F2 42 Tf');
    // Rotate 35 degrees around page center
    // cos(35 deg) = 0.819, sin(35 deg) = 0.574
    streamParts.push(`0.819 0.574 -0.574 0.819 ${pageWidth / 2 - 140} ${pageHeight / 2 - 60} Tm`);
    streamParts.push(`(${escapePdfText('YOGNEET EDU')}) Tj`);
    streamParts.push('ET');
    streamParts.push('Q');

    // 3. Render Page Text Lines
    let yPos = pageHeight - marginTop;

    for (const line of pageLines) {
      if (!line.text) {
        yPos -= (line.fontSize || 10) * 1.35 + (line.lineGap || 2);
        continue;
      }

      const fontTag = line.isBold ? '/F2' : '/F1';
      const rgb = line.color || [0, 0, 0];
      const xPos = marginLeft + (line.indent || 0);

      streamParts.push('q');
      streamParts.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} rg`);
      streamParts.push('BT');
      streamParts.push(`${fontTag} ${line.fontSize} Tf`);
      streamParts.push(`${xPos} ${yPos - line.fontSize} Td`);
      streamParts.push(`(${escapePdfText(line.text)}) Tj`);
      streamParts.push('ET');
      streamParts.push('Q');

      yPos -= line.fontSize * 1.35 + (line.lineGap || 2);
    }

    // 4. Footer & Page Number
    streamParts.push('q');
    streamParts.push('0.8 0.85 0.9 rg');
    streamParts.push(`${marginLeft} ${marginBottom - 10} ${contentWidth} 0.5 re f`);
    streamParts.push('0.4 0.45 0.5 rg');
    streamParts.push('BT');
    streamParts.push('/F1 8 Tf');
    streamParts.push(`${marginLeft} ${marginBottom - 24} Td`);
    streamParts.push(`(${escapePdfText('Yogneet Edu Platform  |  Official Practical Assessment Document')}) Tj`);
    streamParts.push('ET');
    streamParts.push('BT');
    streamParts.push('/F1 8 Tf');
    streamParts.push(`${pageWidth - marginLeft - 60} ${marginBottom - 24} Td`);
    streamParts.push(`(${escapePdfText(`Page ${pageNum} of ${totalPages}`)}) Tj`);
    streamParts.push('ET');
    streamParts.push('Q');

    const streamContent = streamParts.join('\n');
    const streamLength = new TextEncoder().encode(streamContent).length;
    objects[streamObjId] = `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`;
  }

  // Assemble Complete PDF File
  const totalObjects = 4 + totalPages * 2;
  let pdfOutput = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const xrefOffsets: number[] = [0];

  for (let i = 1; i <= totalObjects; i++) {
    xrefOffsets[i] = new TextEncoder().encode(pdfOutput).length;
    pdfOutput += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = new TextEncoder().encode(pdfOutput).length;
  pdfOutput += `xref\n0 ${totalObjects + 1}\n`;
  pdfOutput += '0000000000 65535 f \n';

  for (let i = 1; i <= totalObjects; i++) {
    const offsetStr = xrefOffsets[i].toString().padStart(10, '0');
    pdfOutput += `${offsetStr} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return new TextEncoder().encode(pdfOutput);
}

/**
 * Triggers a download of the assignment as a branded PDF file in the browser.
 */
export function downloadAssignmentPdf(assignment: PracticalAssignment): void {
  const bytes = buildAssignmentPdfBytes(assignment);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const filename = `${assignment.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-assignment.pdf`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
