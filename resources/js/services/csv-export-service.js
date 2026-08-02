function protectSpreadsheetFormula(value) {
    const text = String(value ?? '');
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
    return `"${protectSpreadsheetFormula(value).replace(/"/g, '""')}"`;
}

export function createTransactionCsv(rows) {
    const headers = ['Tanggal', 'Tipe', 'Judul', 'Akun', 'Akun Tujuan', 'Kategori', 'Nominal', 'Status', 'Catatan'];
    const lines = rows.map((row) => [
        row.transaction_date, row.type_label, row.title, row.account_name, row.destination_account_name,
        row.category_name, row.amount, row.status, row.description,
    ].map(csvCell).join(','));
    return `\uFEFF${headers.map(csvCell).join(',')}\r\n${lines.join('\r\n')}`;
}

export function downloadTransactionCsv(rows, filename) {
    const url = URL.createObjectURL(new Blob([createTransactionCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
