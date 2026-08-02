const income = [
    ['gaji', 'Gaji'],
    ['bonus', 'Bonus'],
    ['usaha', 'Usaha'],
    ['freelance', 'Freelance'],
    ['hadiah', 'Hadiah'],
    ['investasi', 'Investasi'],
    ['lainnya-pemasukan', 'Lainnya'],
];

const expense = [
    ['makanan', 'Makanan'],
    ['belanja-rumah', 'Belanja Rumah'],
    ['transportasi', 'Transportasi'],
    ['pendidikan', 'Pendidikan'],
    ['kesehatan', 'Kesehatan'],
    ['tagihan', 'Tagihan'],
    ['cicilan', 'Cicilan'],
    ['hiburan', 'Hiburan'],
    ['donasi', 'Donasi'],
    ['anak', 'Anak'],
    ['orang-tua', 'Orang Tua'],
    ['pulsa-internet', 'Pulsa & Internet'],
    ['lainnya-pengeluaran', 'Lainnya'],
];

export const DEFAULT_CATEGORIES = [
    ...income.map(([slug, name]) => ({ slug: `income-${slug}`, name, type: 'income' })),
    ...expense.map(([slug, name]) => ({ slug: `expense-${slug}`, name, type: 'expense' })),
];
