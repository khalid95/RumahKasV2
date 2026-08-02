export const DATABASE_NAME = 'rumahkas';
export const DATABASE_VERSION = 4;

export const schemaV1 = {
    settings: '&key, updated_at',
    profiles: '&id, name, created_at, updated_at',
    financial_accounts: '&id, profile_id, type, is_active, created_at, updated_at',
    categories: '&id, &slug, type, parent_id, is_default, is_active, created_at, updated_at',
    transactions: '&id, profile_id, financial_account_id, destination_account_id, category_id, type, status, transaction_date, created_at, updated_at, deleted_at, [profile_id+transaction_date]',
    budgets: '&id, profile_id, category_id, year, month, created_at, updated_at, [profile_id+year+month]',
    audit_logs: '&id, entity_type, entity_id, action, created_at, [entity_type+entity_id]',
};

export const schemaV2 = { ...schemaV1, auth: '&key, updated_at' };
export const schemaV3 = {
    ...schemaV2,
    saving_goals: '&id, profile_id, status, target_date, created_at, updated_at, [profile_id+status]',
};
export const schemaV4 = {
    ...schemaV3,
    planner_tasks: '&id, profile_id, task_date, day_period, is_completed, sort_order, created_at, updated_at, [profile_id+task_date]',
    habits: '&id, profile_id, is_active, sort_order, created_at, updated_at',
    habit_logs: '&id, habit_id, log_date, is_completed, created_at, updated_at, &[habit_id+log_date]',
};
