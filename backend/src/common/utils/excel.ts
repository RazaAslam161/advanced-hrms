import ExcelJS from 'exceljs';

export const loadWorkbookFromBuffer = async (buffer: Buffer): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  const loaderInput = buffer as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(loaderInput);
  return workbook;
};

export const createWorkbookBuffer = async (builder: (workbook: ExcelJS.Workbook) => void): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  builder(workbook);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(new Uint8Array(arrayBuffer as ArrayBuffer));
};
