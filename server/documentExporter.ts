import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";

export interface ExportOptions {
  title: string;
  content: string;
  schoolName?: string;
  format: "docx" | "pdf";
}

export async function exportToDocx(options: ExportOptions): Promise<Buffer> {
  const { title, content, schoolName } = options;
  
  const paragraphs: Paragraph[] = [];
  
  if (schoolName) {
    paragraphs.push(
      new Paragraph({
        text: schoolName,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }
  
  paragraphs.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );
  
  paragraphs.push(
    new Paragraph({
      children: [],
      spacing: { after: 200 },
      border: {
        bottom: {
          color: "cccccc",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    })
  );
  
  const contentLines = content.split("\n");
  for (const line of contentLines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.substring(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        })
      );
    } else if (trimmedLine.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.substring(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 250, after: 120 },
        })
      );
    } else if (trimmedLine.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.substring(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("• ")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "• " + trimmedLine.substring(2),
            }),
          ],
          indent: { left: 720 },
          spacing: { after: 80 },
        })
      );
    } else if (trimmedLine.match(/^\d+\.\s/)) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
            }),
          ],
          indent: { left: 720 },
          spacing: { after: 80 },
        })
      );
    } else if (trimmedLine === "") {
      paragraphs.push(
        new Paragraph({
          children: [],
          spacing: { after: 150 },
        })
      );
    } else {
      const runs: TextRun[] = [];
      let currentText = trimmedLine;
      
      const boldPattern = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      
      while ((match = boldPattern.exec(currentText)) !== null) {
        if (match.index > lastIndex) {
          runs.push(new TextRun({ text: currentText.substring(lastIndex, match.index) }));
        }
        runs.push(new TextRun({ text: match[1], bold: true }));
        lastIndex = boldPattern.lastIndex;
      }
      
      if (lastIndex < currentText.length) {
        runs.push(new TextRun({ text: currentText.substring(lastIndex) }));
      }
      
      if (runs.length === 0) {
        runs.push(new TextRun({ text: currentText }));
      }
      
      paragraphs.push(
        new Paragraph({
          children: runs,
          spacing: { after: 100 },
        })
      );
    }
  }
  
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export async function exportToPdf(options: ExportOptions): Promise<Buffer> {
  // @ts-ignore - html-pdf-node doesn't have types
  const htmlPdf = await import("html-pdf-node");
  
  const { title, content, schoolName } = options;
  
  const contentHtml = content
    .split("\n")
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return `<h1>${trimmed.substring(2)}</h1>`;
      } else if (trimmed.startsWith("## ")) {
        return `<h2>${trimmed.substring(3)}</h2>`;
      } else if (trimmed.startsWith("### ")) {
        return `<h3>${trimmed.substring(4)}</h3>`;
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        return `<li>${trimmed.substring(2)}</li>`;
      } else if (trimmed.match(/^\d+\.\s/)) {
        return `<li>${trimmed}</li>`;
      } else if (trimmed === "") {
        return "<br>";
      } else {
        return `<p>${trimmed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
      }
    })
    .join("\n");

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      margin: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .school-name {
      font-size: 14pt;
      color: #666;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 18pt;
      margin: 10px 0;
    }
    h2 {
      font-size: 14pt;
      margin-top: 20px;
      margin-bottom: 10px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    h3 {
      font-size: 12pt;
      margin-top: 15px;
      margin-bottom: 8px;
    }
    p {
      margin: 8px 0;
      text-align: justify;
    }
    li {
      margin-left: 20px;
      margin-bottom: 5px;
    }
    .content {
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${schoolName ? `<div class="school-name">${schoolName}</div>` : ""}
    <h1>${title}</h1>
  </div>
  <div class="content">
    ${contentHtml}
  </div>
</body>
</html>
`;

  const file = { content: html };
  const pdfOptions = {
    format: "A4" as const,
    margin: {
      top: "20mm",
      right: "20mm",
      bottom: "20mm",
      left: "20mm",
    },
  };

  const pdfBuffer = await htmlPdf.default.generatePdf(file, pdfOptions);
  return pdfBuffer;
}
