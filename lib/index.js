import Schema from '@deepseek-ai/schemastery';

export const name = 'nav-fold';
export const Config = Schema.object({
  workspaceViewsEnabled: Schema.boolean().default(false).volatile(),
  navigationEnabled: Schema.boolean().default(true).volatile(),
  hideBrandEnabled: Schema.boolean().default(false).volatile(),
  activityPreferences: Schema.string().default('').volatile(),
});

export function apply() {}
