import { describe, expect, it } from 'vitest';
import { financialInsight, habitInsight, plannerInsight, productivityInsight } from '../../resources/js/services/insight-service';

describe('personal insights', () => {
    it('guides an empty planner without showing fake progress', () => {
        expect(plannerInsight(0, 0).title).toContain('Satu langkah kecil');
    });

    it('celebrates a completed planner without pressuring the user', () => {
        const insight = plannerInsight(3, 3);
        expect(insight.eyebrow).toBe('Hari ini tuntas');
        expect(insight.detail).toContain('Tidak perlu');
    });

    it('uses the strongest habit as a personal monthly insight', () => {
        const insight = habitInsight({
            completedTotal: 7,
            scheduledTotal: 10,
            percentage: 70,
            rows: [{ name: 'Membaca', icon: '📖', percentage: 80, streak: 3, scheduled_count: 5 }],
        });
        expect(insight.detail).toContain('Membaca');
    });

    it('warns gently when cashflow is negative', () => {
        const insight = financialInsight({ income: 100, expense: 200, net_cashflow: -100, budget_percentage: 50, saving_goals: [] });
        expect(insight.title).toMatch(/Pengeluaran|Selisih/);
        expect(insight.detail.length).toBeGreaterThan(20);
    });

    it('prioritizes an exhausted budget over generic cashflow advice', () => {
        const insight = financialInsight({ income: 100, expense: 200, net_cashflow: -100, budget_percentage: 100, saving_goals: [] });
        expect(insight.eyebrow).toBe('Batas budget tercapai');
        expect(insight.title).toContain('habis');
    });

    it('recognizes a dominant spending category', () => {
        const insight = financialInsight({ income: 1_000, expense: 500, net_cashflow: 500, budget_percentage: 20, saving_goals: [], expense_by_category: [{ name: 'Belanja', amount: 400 }] });
        expect(`${insight.title} ${insight.detail}`).toContain('Belanja');
    });

    it('combines tasks and habits for dashboard productivity', () => {
        const insight = productivityInsight({ tasks_total: 2, tasks_completed: 1, habits_total: 2, habits_completed: 1 });
        expect(insight.title).toContain('2 dari 4');
    });
});
