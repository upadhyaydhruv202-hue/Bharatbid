export const PDF_GENERATE_JOB = 'pdf.generate';
export const REPORT_GENERATE_JOB = 'report.generate';

export interface PdfSection {
  heading?: string;
  lines: string[];
}

export interface GeneratePdfInput {
  title: string;
  sections?: PdfSection[];
  filename?: string;
  async?: boolean;
}

export interface GeneratedPdf {
  key: string;
  size: number;
  contentType: 'application/pdf';
  filename: string;
}
