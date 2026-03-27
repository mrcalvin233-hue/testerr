const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const exceljs = require('exceljs');
const PDFDocument = require('pdfkit');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const monthFilter = req.query.month || new Date().toISOString().slice(0, 7); 
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  const startDate = new Date(monthFilter + '-01').toISOString();
  const endDateObj = new Date(monthFilter + '-01');
  endDateObj.setMonth(endDateObj.getMonth() + 1);
  const endDate = endDateObj.toISOString();

  const { data: monthTx } = await req.supabase.from('transactions')
    .select('*')
    .eq('user_id', req.user.id)
    .gte('created_at', startDate)
    .lt('created_at', endDate)
    .order('created_at', { ascending: false });

  const allTx = monthTx || [];
  
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};
  
  allTx.forEach(t => {
    if (t.type === 'income') totalIncome += parseFloat(t.amount);
    if (t.type === 'expense') {
        totalExpense += parseFloat(t.amount);
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
    }
  });

  const totalPages = Math.ceil(allTx.length / limit) || 1;
  const pagedTransactions = allTx.slice((page - 1) * limit, page * limit);

  res.render('dashboard', { 
    transactions: pagedTransactions, 
    allMonthTx: allTx,
    totalIncome, 
    totalExpense, 
    categoryTotals,
    monthFilter,
    page,
    totalPages,
    budget: req.user.monthly_budget || 0
  });
});

router.post('/add', async (req, res) => {
  const { type, amount, category, description } = req.body;
  await req.supabase.from('transactions').insert([{
    user_id: req.user.id,
    type,
    amount,
    category,
    description
  }]);
  res.redirect('/dashboard');
});

router.post('/delete/:id', async (req, res) => {
  await req.supabase.from('transactions').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  res.redirect('/dashboard');
});

router.get('/edit/:id', async (req, res) => {
  const { data: t } = await req.supabase.from('transactions').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!t) return res.redirect('/dashboard');
  res.render('edit-transaction', { t });
});

router.post('/edit/:id', async (req, res) => {
  const { type, amount, category, description, created_at } = req.body;
  await req.supabase.from('transactions')
    .update({ type, amount, category, description, created_at })
    .eq('id', req.params.id).eq('user_id', req.user.id);
  res.redirect('/dashboard');
});

router.get('/export/pdf', async (req, res) => {
  const { data: transactions } = await req.supabase.from('transactions').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=laporan-keuangan.pdf');
  doc.pipe(res);

  const txs = transactions || [];
  let income = 0, expense = 0;
  txs.forEach(t => {
    if (t.type === 'income') income += parseFloat(t.amount);
    else expense += parseFloat(t.amount);
  });
  const balance = income - expense;
  const fmtRp = (v) => 'Rp ' + v.toLocaleString('id-ID');
  const pageW = doc.page.width - 80;

  // === HEADER BANNER ===
  doc.rect(0, 0, doc.page.width, 100).fill('#1e1b4b');
  doc.fill('#818cf8').fontSize(28).font('Helvetica-Bold').text('KeuanganKu', 40, 25, { width: pageW });
  doc.fill('#94a3b8').fontSize(11).font('Helvetica').text('Laporan Keuangan Pribadi', 40, 58);
  doc.fill('#e2e8f0').fontSize(10).text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}`, 40, 75);

  // === SUMMARY CARDS ===
  const cardY = 120;
  const cardW = (pageW - 20) / 3;

  // Income Card
  doc.roundedRect(40, cardY, cardW, 60, 6).fill('#f0fdf4');
  doc.fill('#15803d').fontSize(9).font('Helvetica-Bold').text('PEMASUKAN', 50, cardY + 12, { width: cardW - 20 });
  doc.fill('#166534').fontSize(16).font('Helvetica-Bold').text(fmtRp(income), 50, cardY + 30, { width: cardW - 20 });

  // Expense Card
  doc.roundedRect(50 + cardW, cardY, cardW, 60, 6).fill('#fef2f2');
  doc.fill('#b91c1c').fontSize(9).font('Helvetica-Bold').text('PENGELUARAN', 60 + cardW, cardY + 12, { width: cardW - 20 });
  doc.fill('#991b1b').fontSize(16).font('Helvetica-Bold').text(fmtRp(expense), 60 + cardW, cardY + 30, { width: cardW - 20 });

  // Balance Card
  doc.roundedRect(60 + cardW * 2, cardY, cardW, 60, 6).fill('#eef2ff');
  doc.fill('#4338ca').fontSize(9).font('Helvetica-Bold').text('SALDO BERSIH', 70 + cardW * 2, cardY + 12, { width: cardW - 20 });
  doc.fill('#312e81').fontSize(16).font('Helvetica-Bold').text(fmtRp(balance), 70 + cardW * 2, cardY + 30, { width: cardW - 20 });

  // === TABLE ===
  let tableY = 205;
  const cols = [40, 130, 210, 310, 395]; // x positions
  const colW = [90, 80, 100, 85, pageW - 355 + 40]; // widths

  // Table Header
  doc.rect(40, tableY, pageW, 25).fill('#1e1b4b');
  doc.fill('#e2e8f0').fontSize(9).font('Helvetica-Bold');
  const headers = ['TANGGAL', 'TIPE', 'KATEGORI', 'JUMLAH', 'DESKRIPSI'];
  headers.forEach((h, i) => doc.text(h, cols[i] + 6, tableY + 8, { width: colW[i] - 12 }));

  tableY += 25;

  // Table Rows
  txs.forEach((t, idx) => {
    if (tableY > 720) {
      doc.addPage();
      tableY = 40;
    }
    const rowH = 22;
    const bgColor = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.rect(40, tableY, pageW, rowH).fill(bgColor);

    doc.fill('#334155').fontSize(9).font('Helvetica');
    doc.text(new Date(t.created_at).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}), cols[0] + 6, tableY + 6, { width: colW[0] - 12 });

    const typeColor = t.type === 'income' ? '#15803d' : '#b91c1c';
    const typeLabel = t.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    doc.fill(typeColor).font('Helvetica-Bold').text(typeLabel, cols[1] + 6, tableY + 6, { width: colW[1] - 12 });

    doc.fill('#334155').font('Helvetica').text(t.category, cols[2] + 6, tableY + 6, { width: colW[2] - 12 });

    const sign = t.type === 'income' ? '+' : '-';
    doc.fill(typeColor).font('Helvetica-Bold').text(sign + ' ' + fmtRp(parseFloat(t.amount)), cols[3] + 6, tableY + 6, { width: colW[3] - 12 });

    doc.fill('#64748b').font('Helvetica').text(t.description || '-', cols[4] + 6, tableY + 6, { width: colW[4] - 12 });

    tableY += rowH;
  });

  // Bottom line
  doc.moveTo(40, tableY + 5).lineTo(40 + pageW, tableY + 5).strokeColor('#cbd5e1').lineWidth(1).stroke();

  // === FOOTER ===
  tableY += 20;
  if (tableY > 740) { doc.addPage(); tableY = 40; }
  doc.fill('#94a3b8').fontSize(9).font('Helvetica').text(
    `Total ${txs.length} transaksi tercatat. Laporan ini digenerate secara otomatis oleh KeuanganKu App.`,
    40, tableY, { width: pageW, align: 'center' }
  );

  doc.end();
});

router.get('/export/excel', async (req, res) => {
  const { data: transactions } = await req.supabase.from('transactions').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  
  const workbook = new exceljs.Workbook();
  workbook.creator = 'KeuanganKu App';
  const ws = workbook.addWorksheet('Laporan KeuanganKu');
  
  // Title row
  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'KeuanganKu - Laporan Keuangan Pribadi';
  ws.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF818CF8' } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 35;

  // Date row
  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `Dicetak: ${new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}`;
  ws.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF94A3B8' } };
  ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  // Summary row
  const txs = transactions || [];
  let income = 0, expense = 0;
  txs.forEach(t => { if (t.type === 'income') income += parseFloat(t.amount); else expense += parseFloat(t.amount); });
  
  ws.getRow(3).values = ['', 'Total Pemasukan', income, '', 'Total Pengeluaran', expense];
  ws.getRow(3).font = { bold: true, size: 11 };
  ws.getCell('B3').font = { bold: true, color: { argb: 'FF15803D' } };
  ws.getCell('C3').numFmt = '#,##0';
  ws.getCell('C3').font = { bold: true, color: { argb: 'FF15803D' } };
  ws.getCell('E3').font = { bold: true, color: { argb: 'FFB91C1C' } };
  ws.getCell('F3').numFmt = '#,##0';
  ws.getCell('F3').font = { bold: true, color: { argb: 'FFB91C1C' } };

  // Table header
  const headerRow = ws.getRow(5);
  headerRow.values = ['No', 'Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah (Rp)'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 22;

  ws.columns = [
    { key: 'no', width: 6 },
    { key: 'date', width: 18 },
    { key: 'type', width: 14 },
    { key: 'category', width: 22 },
    { key: 'desc', width: 30 },
    { key: 'amount', width: 18 }
  ];

  // Data rows
  txs.forEach((t, i) => {
    const row = ws.addRow({
      no: i + 1,
      date: new Date(t.created_at).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}),
      type: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      category: t.category,
      desc: t.description || '-',
      amount: parseFloat(t.amount)
    });
    row.getCell('amount').numFmt = '#,##0';
    const typeColor = t.type === 'income' ? 'FF15803D' : 'FFB91C1C';
    row.getCell('type').font = { bold: true, color: { argb: typeColor } };
    row.getCell('amount').font = { bold: true, color: { argb: typeColor } };
    
    if (i % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=laporan-keuanganku.xlsx');
  
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = router;
