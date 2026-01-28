import { useState, RefObject } from "react";
import html2pdf from "html2pdf.js";
import "./PDFDownloadButton.css";

interface PDFDownloadButtonProps {
  contentRef: RefObject<HTMLDivElement>;
  fileName?: string;
  disabled?: boolean;
}

const PDFDownloadButton = ({
  contentRef,
  fileName = "document",
  disabled = false,
}: PDFDownloadButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!contentRef?.current) {
      alert("문서 내용이 없습니다.");
      return;
    }

    setIsLoading(true);

    try {
      const element = contentRef.current;

      const options = {
        margin: 0,
        filename: `${fileName}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          windowWidth: 794, // A4 width in px at 96dpi
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait" as const,
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          before: ".page-break-before",
          after: ".page-break-after",
          avoid: ["tr", "td", ".no-break"],
        },
      };

      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error("PDF 생성 오류:", error);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`pdf-download-btn ${isLoading ? "loading" : ""}`}
      onClick={handleDownload}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <span className="spinner" />
          <span>생성 중...</span>
        </>
      ) : (
        <>
          <span className="icon">📄</span>
          <span>PDF</span>
        </>
      )}
    </button>
  );
};

export default PDFDownloadButton;
