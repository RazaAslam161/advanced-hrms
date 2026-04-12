import PDFDocument from 'pdfkit';
import { env } from '../../config/env';

export const createDocumentBuffer = async (
  render: (doc: PDFKit.PDFDocument) => void,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    render(doc);
    doc.end();
  });

export const renderBrandedHeader = (doc: PDFKit.PDFDocument, title: string): void => {
  doc.fillColor(env.COMPANY_PRIMARY_COLOR).fontSize(20).text(env.COMPANY_NAME);
  doc.moveDown(0.25);
  doc.fillColor('black').fontSize(14).text(title);
  doc.moveDown(1);
};
