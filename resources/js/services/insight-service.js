export function plannerInsight(total, completed, isToday = true) {
    const remaining = Math.max(total - completed, 0);
    if (!total) return { icon: '✦', eyebrow: isToday ? 'Mulai dengan ringan' : 'Hari yang masih lapang', title: isToday ? 'Satu langkah kecil sudah cukup untuk memulai.' : 'Belum ada agenda di hari ini.', detail: isToday ? 'Tambahkan satu aktivitas yang paling berarti buatmu hari ini.' : 'Kamu bisa menjadikannya hari istirahat atau menyiapkan agenda lebih awal.' };
    if (!remaining) return { icon: '✨', eyebrow: 'Hari ini tuntas', title: 'Bagus, semua yang kamu rencanakan sudah selesai.', detail: 'Nikmati progresnya. Tidak perlu menambah kesibukan hanya untuk merasa produktif.' };
    if (completed) return { icon: '↗', eyebrow: 'Ritmemu sudah terbentuk', title: `${completed} aktivitas selesai, tinggal ${remaining} lagi.`, detail: remaining === 1 ? 'Sedikit lagi. Selesaikan saat energimu masih terjaga.' : 'Pilih satu yang paling penting, lalu lanjutkan tanpa terburu-buru.' };
    return { icon: '▷', eyebrow: 'Siap saat kamu siap', title: `${total} aktivitas menantimu.`, detail: 'Mulai dari yang paling mudah untuk membangun momentum.' };
}

export function habitInsight({ rows = [], completedTotal = 0, scheduledTotal = 0, percentage = 0 }) {
    const best = [...rows].filter((item) => item.scheduled_count).sort((a, b) => b.percentage - a.percentage || b.streak - a.streak)[0];
    if (!rows.length) return { icon: '✿', eyebrow: 'Mulai dari yang kecil', title: 'Pilih satu kebiasaan yang ingin kamu jaga.', detail: 'Konsistensi tumbuh lebih mudah saat targetnya sederhana dan terasa masuk akal.' };
    if (!scheduledTotal) return { icon: '◌', eyebrow: 'Bulan yang masih terbuka', title: `${rows.length} habit siap menemani rutinitasmu.`, detail: 'Checklist akan muncul sesuai hari aktif yang kamu pilih.' };
    if (percentage >= 90) return { icon: '✨', eyebrow: 'Konsistensi luar biasa', title: `${completedTotal} checklist berhasil kamu jaga.`, detail: 'Ritme ini sudah kuat. Pertahankan tanpa harus mengejar kesempurnaan.' };
    if (percentage >= 60) return { icon: '↗', eyebrow: 'Ritmemu makin kuat', title: `${percentage}% rutinitas bulan ini sudah terjaga.`, detail: best ? `${best.icon} ${best.name} menjadi habit paling konsisten. Teruskan pelan-pelan.` : 'Teruskan pelan-pelan; progres yang stabil lebih penting dari sempurna.' };
    if (completedTotal) return { icon: '✱', eyebrow: 'Progres tetaplah progres', title: `Kamu sudah menepati ${completedTotal} dari ${scheduledTotal} kesempatan.`, detail: 'Kalau sempat terlewat, mulai lagi hari ini tanpa menyalahkan diri sendiri.' };
    return { icon: '▷', eyebrow: 'Kesempatan baru', title: `${scheduledTotal} momen kecil bisa kamu mulai bulan ini.`, detail: 'Centang satu saja hari ini untuk membangun momentum.' };
}

function dailyPick(options, seed = 0) {
    const now = new Date();
    const daySeed = Number(`${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`);
    return options[Math.abs(daySeed + Math.round(seed)) % options.length];
}

export function financialInsight(summary) {
    const income = Number(summary.income) || 0; const expense = Number(summary.expense) || 0; const net = Number(summary.net_cashflow) || 0; const budget = Number(summary.budget_percentage) || 0; const balance = Number(summary.total_balance) || 0;
    const goals = summary.saving_goals || []; const categories = summary.expense_by_category || []; const topCategory = categories[0]; const topShare = expense && topCategory ? topCategory.amount / expense : 0;
    if (!income && !expense && !summary.account_summaries?.length) return dailyPick([
        { icon: '◇', eyebrow: 'Mulai dari sini', title: 'Keuanganmu siap ditata dari awal.', detail: 'Tambahkan akun, lalu catat transaksi pertama tanpa perlu terburu-buru.' },
        { icon: '✱', eyebrow: 'Lembar yang masih bersih', title: 'Belum ada angka yang perlu dikhawatirkan.', detail: 'Mulai dengan mencatat saldo yang benar agar langkah berikutnya lebih mudah.' },
    ]);
    if (!income && !expense) return dailyPick([
        { icon: '⌕', eyebrow: 'Bulan baru, catatan baru', title: 'Belum ada transaksi bulan ini.', detail: balance > 0 ? 'Saldomu sudah tercatat. Lanjutkan saat uang mulai masuk atau keluar.' : 'Catat saat ada uang masuk atau keluar agar polanya mulai terlihat.' },
        { icon: '◌', eyebrow: 'Masih tenang', title: 'Arus uang bulan ini belum bergerak.', detail: 'Tidak perlu mengisi apa pun sampai benar-benar ada transaksi.' },
    ], balance);
    if (budget >= 100) return { icon: '!', eyebrow: budget > 100 ? 'Budget sudah terlewati' : 'Batas budget tercapai', title: budget > 100 ? `${Math.round(budget)}% budget sudah terpakai.` : 'Budget bulan ini sudah habis.', detail: 'Fokus pada kebutuhan utama dan cek kategori yang paling banyak menyerap pengeluaran.' };
    if (budget >= 85) return dailyPick([
        { icon: '◔', eyebrow: 'Jaga sisa budget', title: `${Math.round(budget)}% batas belanja sudah terpakai.`, detail: 'Sedikit lebih selektif sekarang bisa membuat akhir bulan terasa lebih lega.' },
        { icon: '⌖', eyebrow: 'Dekati batas dengan tenang', title: 'Ruang budget mulai menipis.', detail: 'Cek kebutuhan yang bisa menunggu sebelum membuat pengeluaran berikutnya.' },
    ], budget);
    if (net < 0 && expense >= Math.max(income * 1.5, 1)) return dailyPick([
        { icon: '↘', eyebrow: 'Mari atur ulang ritmenya', title: 'Pengeluaran sedang melaju cukup jauh.', detail: topCategory ? `${topCategory.name} paling besar bulan ini. Mulai evaluasi dari sana.` : 'Coba pilih satu pengeluaran yang masih bisa diringankan.' },
        { icon: '⌖', eyebrow: 'Lampu kuning bulan ini', title: 'Selisih pengeluaran perlu sedikit perhatian.', detail: 'Tidak perlu memangkas semuanya—cukup mulai dari satu pos yang kurang penting.' },
    ], expense);
    if (net < 0) return dailyPick([
        { icon: '≈', eyebrow: 'Masih bisa diseimbangkan', title: 'Pengeluaran sedikit di atas pemasukan.', detail: 'Jaga transaksi berikutnya tetap seperlunya agar selisihnya tidak melebar.' },
        { icon: '◇', eyebrow: 'Sedikit penyesuaian', title: 'Arus kas sedang minus tipis.', detail: topCategory ? `Coba lihat kembali pengeluaran ${topCategory.name}.` : 'Satu keputusan hemat sudah bisa membantu menahan selisih.' },
    ], expense);
    if (topShare >= 0.5) return dailyPick([
        { icon: '◉', eyebrow: 'Pola yang menonjol', title: `${topCategory.name} mendominasi pengeluaranmu.`, detail: `${Math.round(topShare * 100)}% pengeluaran bulan ini ada di kategori tersebut.` },
        { icon: '⌕', eyebrow: 'Satu kategori terlihat jelas', title: `${topCategory.name} jadi pengeluaran terbesar.`, detail: 'Kalau memang prioritas, tidak masalah. Yang penting kamu menyadari polanya.' },
    ], topCategory.amount);
    if (net > 0 && goals.length) return dailyPick([
        { icon: '↗', eyebrow: 'Ada ruang untuk tujuanmu', title: 'Arus kas positif bisa ikut mendekatkan target.', detail: `Sisihkan sebagian selisih ke ${goals[0].name} bila kondisi memungkinkan.` },
        { icon: '✱', eyebrow: 'Selisih yang berarti', title: 'Pemasukan masih unggul bulan ini.', detail: `${goals[0].name} bisa mendapat tambahan kecil tanpa memaksa.` },
    ], net);
    if (net > 0) return dailyPick([
        { icon: '↗', eyebrow: 'Ritme keuangan sehat', title: 'Pemasukan masih lebih tinggi dari pengeluaran.', detail: 'Pertahankan ruang ini untuk kebutuhan mendadak atau tujuan berikutnya.' },
        { icon: '✦', eyebrow: 'Ada napas lebih', title: 'Arus kasmu masih positif bulan ini.', detail: 'Nikmati progresnya, lalu simpan sebagian jika memang memungkinkan.' },
        { icon: '◇', eyebrow: 'Sejauh ini terkendali', title: 'Pengeluaran masih berada di bawah pemasukan.', detail: 'Lanjutkan kebiasaan mencatat agar posisi ini tetap terlihat jelas.' },
    ], net);
    return dailyPick([
        { icon: '≈', eyebrow: 'Sedang seimbang', title: 'Pemasukan dan pengeluaran berimbang.', detail: 'Jaga transaksi berikutnya tetap sadar agar keseimbangannya bertahan.' },
        { icon: '◎', eyebrow: 'Pas di tengah', title: 'Arus uangmu sedang berada di titik impas.', detail: 'Tidak buruk—ini saat yang baik untuk mengamati pola berikutnya.' },
    ]);
}

export function productivityInsight(planner) {
    const total = planner.tasks_total + planner.habits_total;
    const completed = planner.tasks_completed + planner.habits_completed;
    if (!total) return { icon: '✿', eyebrow: 'Buat ruang untuk dirimu', title: 'Hari ini belum punya agenda atau habit terjadwal.', detail: 'Satu aktivitas penting dan satu kebiasaan ringan sudah cukup untuk memulai.' };
    if (completed === total) return { icon: '✨', eyebrow: 'Ritme hari ini lengkap', title: 'Semua aktivitas dan habit hari ini sudah selesai.', detail: 'Kerja bagus. Sisakan waktu untuk berhenti dan menikmati harimu.' };
    if (completed) return { icon: '↗', eyebrow: 'Momentum sudah ada', title: `${completed} dari ${total} langkah hari ini sudah selesai.`, detail: 'Lanjutkan satu per satu—kamu tidak perlu menyelesaikan semuanya sekaligus.' };
    return { icon: '▷', eyebrow: 'Mulai tanpa tekanan', title: `${total} langkah kecil sudah menunggu hari ini.`, detail: 'Pilih yang paling ringan untuk membuat langkah pertama terasa mudah.' };
}
