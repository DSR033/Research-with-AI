// Permission catalog — the single source of truth for what a role can be granted.
// Keys are stable strings stored in roles.permissions (jsonb array). Never rename a
// key once it ships; add a new one and migrate instead.

export interface Permission {
  key: string
  label: string
  desc: string
}

export interface PermissionGroup {
  key: string
  label: string
  icon: string
  perms: Permission[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'surveys',
    label: 'Surveys',
    icon: '📋',
    perms: [
      { key: 'surveys.view',      label: 'View surveys',       desc: 'See all surveys in the workspace' },
      { key: 'surveys.create',    label: 'Create surveys',     desc: 'Start new surveys from scratch or a template' },
      { key: 'surveys.edit',      label: 'Edit surveys',       desc: 'Change questions, logic, theme and settings' },
      { key: 'surveys.publish',   label: 'Publish & close',    desc: 'Make a survey live or take it offline' },
      { key: 'surveys.delete',    label: 'Delete surveys',     desc: 'Permanently remove a survey and its responses' },
    ],
  },
  {
    key: 'responses',
    label: 'Responses',
    icon: '💬',
    perms: [
      { key: 'responses.view',    label: 'View responses',     desc: 'Read individual submitted responses' },
      { key: 'responses.export',  label: 'Export responses',   desc: 'Download responses as CSV or Excel' },
      { key: 'responses.delete',  label: 'Delete responses',   desc: 'Remove individual responses' },
    ],
  },
  {
    key: 'insights',
    label: 'Insights & AI',
    icon: '📊',
    perms: [
      { key: 'insights.view',     label: 'View insights',      desc: 'See charts, summaries and analytics' },
      { key: 'insights.run_ai',   label: 'Run AI analysis',    desc: 'Trigger AI insight generation (consumes quota)' },
      { key: 'insights.export',   label: 'Export reports',     desc: 'Download insight reports as PDF' },
      { key: 'expert.run',        label: 'Run Expert Review',  desc: 'Trigger an AI expert review of a survey' },
    ],
  },
  {
    key: 'media',
    label: 'Media Library',
    icon: '🖼️',
    perms: [
      { key: 'media.view',        label: 'View media',         desc: 'Browse files in the shared media library' },
      { key: 'media.upload',      label: 'Upload media',       desc: 'Add images and files to the library' },
      { key: 'media.delete',      label: 'Delete media',       desc: 'Remove files from the library' },
    ],
  },
  {
    key: 'team',
    label: 'Team',
    icon: '👥',
    perms: [
      { key: 'team.view',         label: 'View team',          desc: 'See the member list and their roles' },
      { key: 'team.invite',       label: 'Invite members',     desc: 'Send workspace invitations' },
      { key: 'team.assign_role',  label: 'Assign roles',       desc: 'Change which role a member has' },
      { key: 'team.remove',       label: 'Remove members',     desc: 'Revoke a member from the workspace' },
    ],
  },
  {
    key: 'roles',
    label: 'Roles & Permissions',
    icon: '🔑',
    perms: [
      { key: 'roles.view',        label: 'View roles',         desc: 'See roles and what each one grants' },
      { key: 'roles.manage',      label: 'Manage roles',       desc: 'Create, edit and delete custom roles' },
    ],
  },
  {
    key: 'billing',
    label: 'Billing',
    icon: '💳',
    perms: [
      { key: 'billing.view',      label: 'View billing',       desc: 'See the current plan, usage and invoices' },
      { key: 'billing.manage',    label: 'Manage subscription', desc: 'Upgrade, downgrade or change payment details' },
    ],
  },
  {
    key: 'org',
    label: 'Organisation',
    icon: '⚙️',
    perms: [
      { key: 'org.view',          label: 'View org settings',  desc: 'See workspace name, branding and defaults' },
      { key: 'org.edit',          label: 'Edit org settings',  desc: 'Change workspace name, logo and defaults' },
      { key: 'org.gdpr',          label: 'Privacy & data',     desc: 'Handle data export and deletion requests' },
    ],
  },
]

/** Every permission key in the catalog, flattened. */
export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.key))

/** Look up a permission's label without walking the groups by hand. */
export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap(g => g.perms.map(p => [p.key, p.label]))
)

// ─── System roles ────────────────────────────────────────────────────────────
// These four ship with every workspace. They can't be renamed or deleted, and
// Owner can't be edited at all — it always holds every permission, including any
// added in future releases.

export type SystemRoleSlug = 'owner' | 'admin' | 'member' | 'viewer'

export interface RolePreset {
  slug: SystemRoleSlug
  name: string
  description: string
  color: string
  permissions: string[]
}

const MEMBER_PERMISSIONS = [
  'surveys.view', 'surveys.create', 'surveys.edit', 'surveys.publish',
  'responses.view', 'responses.export',
  'insights.view', 'insights.run_ai', 'insights.export', 'expert.run',
  'media.view', 'media.upload',
  'team.view',
]

const VIEWER_PERMISSIONS = [
  'surveys.view',
  'responses.view',
  'insights.view',
  'media.view',
  'team.view',
]

export const SYSTEM_ROLES: RolePreset[] = [
  {
    slug: 'owner',
    name: 'Owner',
    description: 'Full access to everything, including billing and workspace deletion.',
    color: '#b45309',
    permissions: ALL_PERMISSIONS,
  },
  {
    slug: 'admin',
    name: 'Admin',
    description: 'Manages the team, roles and workspace settings. No billing access.',
    color: '#4f46e5',
    // Everything except paying for things.
    permissions: ALL_PERMISSIONS.filter(p => p !== 'billing.manage'),
  },
  {
    slug: 'member',
    name: 'Member',
    description: 'Builds and runs surveys, and reads the results.',
    color: '#16a34a',
    permissions: MEMBER_PERMISSIONS,
  },
  {
    slug: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to surveys, responses and insights.',
    color: '#64748b',
    permissions: VIEWER_PERMISSIONS,
  },
]

export const SYSTEM_ROLE_SLUGS = SYSTEM_ROLES.map(r => r.slug) as string[]

/** Fallback colour for custom roles, cycled by index so they stay visually distinct. */
export const CUSTOM_ROLE_COLORS = ['#db2777', '#0891b2', '#7c3aed', '#ea580c', '#0d9488', '#c026d3']

export function roleColorFor(slug: string, index: number): string {
  return SYSTEM_ROLES.find(r => r.slug === slug)?.color
    ?? CUSTOM_ROLE_COLORS[index % CUSTOM_ROLE_COLORS.length]
}

/** True when the given permission set covers everything the catalog offers. */
export function hasFullAccess(permissions: string[]): boolean {
  return ALL_PERMISSIONS.every(p => permissions.includes(p))
}

/** Turn a role name into a URL/DB-safe slug. */
export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
