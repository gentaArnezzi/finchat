import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { query } from '../db.js';

const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const getTransactionsForExport = async (userId, filters = {}) => {
  let sql = `
    SELECT t.*, c.name as category_name, c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1 AND t.is_deleted IS NOT TRUE
  `;
  const params = [userId];
  let paramCount = 1;

  if (filters.startDate) {
    paramCount++;
    sql += ` AND t.date >= $${paramCount}`;
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    paramCount++;
    sql += ` AND t.date <= $${paramCount}`;
    params.push(filters.endDate);
  }
  if (filters.category) {
    paramCount++;
    sql += ` AND c.name = $${paramCount}`;
    params.push(filters.category);
  }

  sql += ` ORDER BY t.date DESC, t.created_at DESC`;
  const result = await query(sql, params);
  return result.rows;
};

export const exportPDF = async (userId, filters, res) => {
  const transactions = await getTransactionsForExport(userId, filters);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=finchat-laporan-${new Date().toISOString().split('T')[0]}.pdf`);
  doc.pipe(res);

  // Header
  doc.fontSize(24).font('Helvetica-Bold').text('FinChat', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Laporan Keuangan', { align: 'center' });
  doc.moveDown();

  // Period
  const periodText = filters.startDate && filters.endDate
    ? `Periode: ${filters.startDate} s/d ${filters.endDate}`
    : `Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`;
  doc.fontSize(10).text(periodText, { align: 'center' });
  doc.moveDown(2);

  // Summary
  doc.fontSize(14).font('Helvetica-Bold').text('Ringkasan');
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Total Pemasukan: ${formatRupiah(totalIncome)}`);
  doc.text(`Total Pengeluaran: ${formatRupiah(totalExpense)}`);
  doc.text(`Saldo Bersih: ${formatRupiah(totalIncome - totalExpense)}`);
  doc.text(`Jumlah Transaksi: ${transactions.length}`);
  doc.moveDown(2);

  // Table header
  doc.fontSize(14).font('Helvetica-Bold').text('Riwayat Transaksi');
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const colWidths = [80, 150, 100, 70, 95];
  const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah'];

  doc.fontSize(9).font('Helvetica-Bold');
  let x = 50;
  headers.forEach((header, i) => {
    doc.text(header, x, tableTop, { width: colWidths[i] });
    x += colWidths[i];
  });

  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

  // Table rows
  let y = tableTop + 20;
  doc.font('Helvetica').fontSize(8);

  transactions.forEach((tx) => {
    if (y > 750) {
      doc.addPage();
      y = 50;
    }

    x = 50;
    const date = new Date(tx.date).toLocaleDateString('id-ID');
    const desc = (tx.description || '-').substring(0, 25);
    const cat = (tx.category_name || 'Lainnya').substring(0, 18);
    const type = tx.type === 'income' ? 'Masuk' : 'Keluar';
    const amount = formatRupiah(parseFloat(tx.amount));

    doc.text(date, x, y, { width: colWidths[0] }); x += colWidths[0];
    doc.text(desc, x, y, { width: colWidths[1] }); x += colWidths[1];
    doc.text(cat, x, y, { width: colWidths[2] }); x += colWidths[2];
    doc.text(type, x, y, { width: colWidths[3] }); x += colWidths[3];
    doc.text(amount, x, y, { width: colWidths[4], align: 'right' });

    y += 15;
  });

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#999').text(
    `Dibuat oleh FinChat pada ${new Date().toLocaleString('id-ID')}`,
    { align: 'center' }
  );

  doc.end();
};

export const exportExcel = async (userId, filters, res) => {
  const transactions = await getTransactionsForExport(userId, filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FinChat';
  workbook.created = new Date();

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Ringkasan');
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  summarySheet.addRow(['FinChat - Laporan Keuangan']);
  summarySheet.addRow([]);
  summarySheet.addRow(['Total Pemasukan', totalIncome]);
  summarySheet.addRow(['Total Pengeluaran', totalExpense]);
  summarySheet.addRow(['Saldo Bersih', totalIncome - totalExpense]);
  summarySheet.addRow(['Jumlah Transaksi', transactions.length]);

  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 20;
  summarySheet.getRow(1).font = { bold: true, size: 14 };

  // Transactions sheet
  const txSheet = workbook.addWorksheet('Transaksi');
  txSheet.columns = [
    { header: 'Tanggal', key: 'date', width: 15 },
    { header: 'Deskripsi', key: 'description', width: 30 },
    { header: 'Kategori', key: 'category', width: 20 },
    { header: 'Tipe', key: 'type', width: 12 },
    { header: 'Jumlah', key: 'amount', width: 18 },
  ];

  txSheet.getRow(1).font = { bold: true };
  txSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' }
  };
  txSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  transactions.forEach((tx) => {
    txSheet.addRow({
      date: new Date(tx.date).toLocaleDateString('id-ID'),
      description: tx.description || '-',
      category: tx.category_name || 'Lainnya',
      type: tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      amount: parseFloat(tx.amount),
    });
  });

  // Format amount column as currency
  txSheet.getColumn('amount').numFmt = '#,##0';

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=finchat-laporan-${new Date().toISOString().split('T')[0]}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
};
