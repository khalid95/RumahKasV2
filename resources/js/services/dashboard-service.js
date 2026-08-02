import { BalanceService } from './balance-service';
import { BudgetService } from './budget-service';

export class DashboardService {
    constructor(database) {
        this.database = database;
        this.balanceService = new BalanceService(database);
    }

    async summary(period = this.currentPeriod()) {
        const [totalBalance, transactions, accounts, categories, savingGoals] = await Promise.all([
            this.balanceService.total('default-profile'),
            this.periodTransactions(period),
            this.database.financial_accounts.toArray(),
            this.database.categories.toArray(),
            this.database.saving_goals.toArray(),
        ]);

        const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
        const expense = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
        const budgets = await new BudgetService(this.database).list(period.year, period.month);
        const budgetAmount = budgets.reduce((sum, item) => sum + item.amount, 0);
        const budgetSpent = budgets.reduce((sum, item) => sum + item.spent, 0);
        const today = new Date().toLocaleDateString('en-CA'); const weekday = new Date(`${today}T12:00:00`).getDay();
        const [todayTasks, activeHabits, todayHabitLogs] = await Promise.all([this.database.planner_tasks.where('[profile_id+task_date]').equals(['default-profile', today]).toArray(), this.database.habits.where('is_active').equals(1).toArray(), this.database.habit_logs.where('log_date').equals(today).toArray()]);
        const todayHabits = activeHabits.filter((habit) => habit.selected_days.includes(weekday)); const completedHabitIds = new Set(todayHabitLogs.filter((log) => log.is_completed).map((log) => log.habit_id));

        return {
            period,
            total_balance: totalBalance,
            income,
            expense,
            net_cashflow: income - expense,
            budget_amount: budgetAmount,
            budget_spent: budgetSpent,
            budget_percentage: budgetAmount ? (budgetSpent / budgetAmount) * 100 : 0,
            recent_transactions: await this.recentTransactions(5),
            daily_cashflow: this.dailyCashflow(transactions, period),
            expense_by_category: this.expenseByCategory(transactions, categories),
            accounts: Object.fromEntries(accounts.map((account) => [account.id, account.name])),
            account_summaries: await Promise.all(accounts.filter((account) => account.is_active).map(async (account) => ({ ...account, current_balance: await this.balanceService.calculate(account.id) }))),
            categories: Object.fromEntries(categories.map((category) => [category.id, category.name])),
            saving_goals: savingGoals.map((goal) => ({ ...goal, percentage: goal.target_amount ? Math.min((goal.saved_amount / goal.target_amount) * 100, 100) : 0, remaining: Math.max(goal.target_amount - goal.saved_amount, 0) })).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
            saving_saved: savingGoals.reduce((sum, goal) => sum + goal.saved_amount, 0),
            saving_target: savingGoals.reduce((sum, goal) => sum + goal.target_amount, 0),
            planner_today: { tasks_total: todayTasks.length, tasks_completed: todayTasks.filter((item) => item.is_completed).length, habits_total: todayHabits.length, habits_completed: todayHabits.filter((habit) => completedHabitIds.has(habit.id)).length, next_tasks: todayTasks.filter((item) => !item.is_completed).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')).slice(0, 2) },
        };
    }

    currentPeriod(date = new Date()) {
        return { year: date.getFullYear(), month: date.getMonth() + 1 };
    }

    async periodTransactions({ year, month }) {
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        return (await this.database.transactions.where('transaction_date').startsWith(prefix).toArray())
            .filter((item) => item.profile_id === 'default-profile' && item.status === 'posted' && !item.deleted_at);
    }

    async recentTransactions(limit = 5) {
        return (await this.database.transactions.orderBy('transaction_date').reverse().toArray())
            .filter((item) => item.profile_id === 'default-profile' && !item.deleted_at)
            .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at))
            .slice(0, limit);
    }

    dailyCashflow(transactions, { year, month }) {
        const days = new Date(year, month, 0).getDate();
        const result = Array.from({ length: days }, (_, index) => ({ day: index + 1, income: 0, expense: 0 }));
        for (const transaction of transactions) {
            const day = Number(transaction.transaction_date.slice(8, 10));
            if (transaction.type === 'income') result[day - 1].income += transaction.amount;
            if (transaction.type === 'expense') result[day - 1].expense += transaction.amount;
        }
        return result;
    }

    expenseByCategory(transactions, categories) {
        const names = Object.fromEntries(categories.map((category) => [category.id, category.name]));
        const totals = new Map();
        for (const transaction of transactions.filter((item) => item.type === 'expense')) {
            totals.set(transaction.category_id, (totals.get(transaction.category_id) || 0) + transaction.amount);
        }
        return [...totals.entries()]
            .map(([categoryId, amount]) => ({ category_id: categoryId, name: names[categoryId] || 'Tanpa Kategori', amount }))
            .sort((a, b) => b.amount - a.amount);
    }
}
