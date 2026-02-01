declare module 'pdf-parse' {
  interface PDFInfo {
    Title?: string;
    Author?: string;
    [key: string]: unknown;
  }

  interface PDFData {
    numpages: number;
    text: string;
    info: PDFInfo;
  }

  function pdfParse(buffer: Buffer): Promise<PDFData>;
  export default pdfParse;
}
