import Schema from '@deepseek-ai/schemastery';

export const name = 'nav-fold';
export const Config = Schema.object({
  workspaceViewsEnabled: Schema.boolean().default(false).volatile(),
  hideBrandEnabled: Schema.boolean().default(false).volatile(),
});

export function apply() {}
