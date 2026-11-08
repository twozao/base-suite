import type { ColumnType, Generated, Insertable, Selectable } from "kysely"

// One schema for every dialect. Timestamps are ISO-8601 strings, booleans are 0/1 integers and JSON
// is stored as text, so a row reads the same from SQLite and Postgres. Ids are app-generated UUIDs.
export type Timestamp = ColumnType<string, string | undefined, string>
export type AppRole = "admin" | "editor" | "author" | "contributor" | "support"
export type ContactStatus = "new" | "open" | "closed" | "spam"
export type CmsStatus = "draft" | "published" | "archived"
export type PageTemplate = "default" | "wide" | "landing"
export type ChatStatus = "open" | "pending" | "closed"
export type ChatSender = "visitor" | "staff" | "system"
export type BookingStatus = "scheduled" | "canceled" | "no_show"
export type CrmStatus = "lead" | "customer" | "archived"
export type DealStage = "new" | "qualified" | "proposal" | "won" | "lost"
export type CrmActivityKind =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "chat"
  | "contact_form"
  | "booking"
  | "signup"
  | "newsletter"
  | "deal"
  | "subscription"
export type NewsletterStatus = "pending" | "confirmed" | "unsubscribed"
export type TokenPurpose = "verify_email" | "reset_password"

export interface UsersTable {
  id: string
  email: string
  email_verified: Generated<number>
  password_hash: string | null
  created_at: Timestamp
  updated_at: Timestamp
  last_sign_in_at: string | null
}
export interface SessionsTable {
  id: string
  user_id: string
  expires_at: string
  created_at: Timestamp
  user_agent: string | null
  last_seen_at: string | null
  mfa: Generated<number>
}
export interface AuthTokensTable {
  token_hash: string
  user_id: string
  purpose: TokenPurpose
  expires_at: string
  created_at: Timestamp
}
export interface ProfilesTable {
  id: string
  full_name: string | null
  company_name: string | null
  website: string | null
  unsubscribed: Generated<number>
  updated_at: string | null
}
export interface UserRolesTable {
  user_id: string
  role: AppRole
  granted_by: string | null
  created_at: Timestamp
}
export interface AuditLogTable {
  id: Generated<number>
  actor_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  meta: Generated<string>
  ip: string | null
  created_at: Timestamp
}
export interface SiteSettingsTable {
  key: string
  value: string
  updated_by: string | null
  updated_at: Timestamp
}
export interface RateLimitsTable {
  key: string
  window_start: string
  hits: number
}
export interface ContactRequestsTable {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  company_name: string | null
  message_body: string | null
  topic: string | null
  preferred_contact: string | null
  source_path: string | null
  status: Generated<ContactStatus>
  admin_notes: string | null
  handled_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
}
export interface CmsPagesTable {
  id: string
  slug: string
  title: string
  body_md: Generated<string>
  body_html: Generated<string>
  excerpt: string | null
  seo_title: string | null
  seo_description: string | null
  status: Generated<CmsStatus>
  published_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
  blocks_json: string | null
  seo_noindex: Generated<number>
  og_image_url: string | null
  review_requested_at: string | null
  review_note: string | null
  template: Generated<PageTemplate>
}
export interface CmsPageRevisionsTable {
  id: Generated<number>
  page_id: string
  title: string
  body_md: string
  blocks_json: string | null
  saved_by: string | null
  created_at: Timestamp
}
export interface PostsTable {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body_md: Generated<string>
  body_html: Generated<string>
  cover_image_url: string | null
  author_name: string | null
  tags: Generated<string>
  seo_title: string | null
  seo_description: string | null
  status: Generated<CmsStatus>
  published_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
  blocks_json: string | null
  seo_noindex: Generated<number>
  og_image_url: string | null
  review_requested_at: string | null
  review_note: string | null
}
export interface ChatConversationsTable {
  id: string
  user_id: string | null
  visitor_token_hash: string | null
  visitor_name: string | null
  visitor_email: string | null
  page_url: string | null
  status: Generated<ChatStatus>
  assigned_to: string | null
  unread_by_staff: Generated<number>
  unread_by_visitor: Generated<number>
  last_message_at: Timestamp
  created_at: Timestamp
}
export interface ChatMessagesTable {
  id: Generated<number>
  conversation_id: string
  sender: ChatSender
  author_id: string | null
  body: string
  created_at: Timestamp
}
export interface BookingsTable {
  id: string
  provider: Generated<"calendly" | "native">
  external_id: string
  event_uri: string | null
  event_name: string | null
  invitee_name: string | null
  invitee_email: string | null
  user_id: string | null
  start_time: string | null
  end_time: string | null
  status: Generated<BookingStatus>
  cancel_reason: string | null
  cancel_url: string | null
  reschedule_url: string | null
  created_at: Timestamp
  updated_at: Timestamp
  event_type_id: string | null
  invitee_phone: string | null
  invitee_timezone: string | null
  answers: Generated<string>
  location: string | null
  admin_notes: string | null
  manage_token_hash: string | null
  block_start: string | null
  block_end: string | null
  reminder_sent_at: string | null
  sequence: Generated<number>
}

export interface BookingEventTypesTable {
  id: string
  slug: string
  name: string
  description: Generated<string>
  duration_minutes: number
  location_kind: Generated<string>
  location_detail: Generated<string>
  buffer_before: Generated<number>
  buffer_after: Generated<number>
  min_notice_minutes: Generated<number>
  max_days_ahead: Generated<number>
  slot_interval: Generated<number>
  daily_limit: number | null
  questions: Generated<string>
  active: Generated<number>
  sort_order: Generated<number>
  created_at: Timestamp
  updated_at: Timestamp
}

export interface BookingLockTable {
  id: number
  touched_at: string | null
}
export interface StripeCustomersTable {
  user_id: string
  stripe_customer_id: string
  updated_at: Timestamp
}
export interface SubscriptionsTable {
  id: string
  user_id: string | null
  stripe_customer_id: string
  status: string
  price_id: string | null
  product_id: string | null
  current_period_end: string | null
  cancel_at_period_end: Generated<number>
  created_at: Timestamp
  updated_at: Timestamp
}
export interface StripeEventsTable {
  id: string
  type: string
  received_at: Timestamp
}
export interface CrmContactsTable {
  id: string
  email: string | null
  name: string | null
  company: string | null
  phone: string | null
  user_id: string | null
  status: Generated<CrmStatus>
  source: string | null
  owner_id: string | null
  tags: Generated<string>
  notes: string | null
  last_activity_at: Timestamp
  created_at: Timestamp
  updated_at: Timestamp
}
export interface CrmDealsTable {
  id: string
  contact_id: string
  title: string
  value_cents: Generated<number>
  currency: Generated<string>
  stage: Generated<DealStage>
  owner_id: string | null
  expected_close: string | null
  created_at: Timestamp
  updated_at: Timestamp
}
export interface CrmActivitiesTable {
  id: Generated<number>
  contact_id: string
  kind: CrmActivityKind
  body: string | null
  ref_type: string | null
  ref_id: string | null
  actor_id: string | null
  created_at: Timestamp
}
export interface NewsletterSubscribersTable {
  id: string
  email: string
  name: string | null
  status: Generated<NewsletterStatus>
  confirm_token_hash: string | null
  unsubscribe_token_hash: string
  source: string | null
  created_at: Timestamp
  confirmed_at: string | null
  unsubscribed_at: string | null
}
export interface AnalyticsDailyTable {
  day: string
  path: string
  views: number
}
export interface AnalyticsReferrersTable {
  day: string
  host: string
  views: number
}

export interface OAuthAccountsTable {
  provider: string
  subject: string
  user_id: string
  created_at: Timestamp
}

export interface HelpdeskTicketsTable {
  id: Generated<number>
  subject: string
  status: Generated<"open" | "pending" | "resolved" | "closed">
  priority: Generated<"low" | "normal" | "high" | "urgent">
  requester_email: string
  requester_name: string | null
  user_id: string | null
  assignee_id: string | null
  source: Generated<"portal" | "contact" | "chat" | "email" | "manual">
  source_ref: string | null
  public_token: string
  first_response_due: string | null
  resolve_due: string | null
  first_responded_at: string | null
  resolved_at: string | null
  created_at: Timestamp
  updated_at: Timestamp
}
export interface HelpdeskMessagesTable {
  id: Generated<number>
  ticket_id: number
  author_kind: "customer" | "staff"
  author_id: string | null
  internal: Generated<number>
  body: string
  created_at: Timestamp
}
export interface HelpdeskCannedTable {
  id: string
  title: string
  body: string
  created_at: Timestamp
}
export interface KbCategoriesTable {
  id: string
  slug: string
  name: string
  description: Generated<string>
  sort_order: Generated<number>
}
export interface KbArticlesTable {
  id: string
  category_id: string | null
  slug: string
  title: string
  excerpt: Generated<string>
  body_md: Generated<string>
  body_html: Generated<string>
  status: Generated<"draft" | "published">
  helpful_yes: Generated<number>
  helpful_no: Generated<number>
  created_at: Timestamp
  updated_at: Timestamp
}
export interface FormsTable {
  id: string
  slug: string
  title: string
  description: Generated<string>
  fields: Generated<string>
  submit_label: Generated<string>
  success_message: Generated<string>
  notify_admin: Generated<number>
  active: Generated<number>
  created_at: Timestamp
  updated_at: Timestamp
}
export interface FormSubmissionsTable {
  id: string
  form_id: string
  answers: Generated<string>
  email: string | null
  status: Generated<"new" | "read" | "spam">
  created_at: Timestamp
}
export interface CampaignsTable {
  id: string
  subject: string
  preheader: Generated<string>
  body_md: Generated<string>
  body_html: Generated<string>
  status: Generated<"draft" | "scheduled" | "sending" | "sent">
  track: Generated<number>
  scheduled_at: string | null
  started_at: string | null
  finished_at: string | null
  public_origin: string | null
  created_at: Timestamp
  updated_at: Timestamp
}
export interface CampaignRecipientsTable {
  token: string
  campaign_id: string
  subscriber_id: string | null
  email: string
  name: string | null
  status: Generated<"pending" | "sending" | "sent" | "failed">
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
}
export interface CampaignLinksTable {
  id: Generated<number>
  campaign_id: string
  url: string
  clicks: Generated<number>
}
export interface ProjectsTable {
  id: string
  name: string
  description: Generated<string>
  contact_id: string | null
  owner_id: string | null
  status: Generated<"active" | "on_hold" | "done">
  due_date: string | null
  shared: Generated<number>
  created_at: Timestamp
  updated_at: Timestamp
}
export interface ProjectTasksTable {
  id: string
  project_id: string
  title: string
  description: Generated<string>
  status: Generated<"todo" | "doing" | "review" | "done">
  assignee_id: string | null
  due_date: string | null
  client_visible: Generated<number>
  sort_order: Generated<number>
  created_at: Timestamp
  updated_at: Timestamp
}
export interface TeamMembersTable {
  id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  job_title: string | null
  department: string | null
  start_date: string | null
  leave_allowance: Generated<number>
  is_booking_host: Generated<number>
  active: Generated<number>
  created_at: Timestamp
}
export interface LeaveRequestsTable {
  id: string
  member_id: string
  kind: Generated<"annual" | "sick" | "unpaid" | "other">
  start_date: string
  end_date: string
  days: number
  note: string | null
  status: Generated<"pending" | "approved" | "rejected" | "canceled">
  decided_by: string | null
  created_at: Timestamp
}
export interface TimeEntriesTable {
  id: string
  member_id: string
  project_id: string | null
  work_date: string
  minutes: number
  note: string | null
  status: Generated<"submitted" | "approved">
  created_at: Timestamp
}
export interface ExpensesTable {
  id: string
  spent_on: string
  merchant: string
  amount_cents: number
  currency: Generated<string>
  category: string
  note: string | null
  receipt_name: string | null
  project_id: string | null
  submitted_by: string | null
  status: Generated<"submitted" | "approved" | "rejected" | "reimbursed">
  decided_by: string | null
  created_at: Timestamp
}
export interface ContentTranslationsTable {
  kind: "page" | "post" | "kb"
  content_id: string
  locale: string
  title: string
  excerpt: string | null
  body_md: Generated<string>
  body_html: Generated<string>
  published: Generated<number>
  updated_at: Timestamp
}
export interface SiteTranslationsTable {
  locale: string
  area: "brand" | "navigation" | "home" | "ui"
  value: Generated<string>
}

export interface CmsBlocksTable {
  id: string
  name: string
  blocks_json: Generated<string>
  extension_id: string | null
  created_at: Timestamp
  updated_at: Timestamp
}
export interface ContentTypesTable {
  id: string
  slug: string
  name: string
  singular: string
  url_prefix: string
  description: string | null
  fields_json: Generated<string>
  has_archive: Generated<number>
  in_search: Generated<number>
  extension_id: string | null
  created_at: Timestamp
  updated_at: Timestamp
}
export interface ContentEntriesTable {
  id: string
  type_id: string
  slug: string
  title: string
  status: Generated<CmsStatus>
  fields_json: Generated<string>
  blocks_json: string | null
  body_md: Generated<string>
  body_html: Generated<string>
  excerpt: string | null
  seo_title: string | null
  seo_description: string | null
  seo_noindex: Generated<number>
  og_image_url: string | null
  sort_order: Generated<number>
  review_requested_at: string | null
  review_note: string | null
  published_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
}
export interface MediaTable {
  name: string
  alt: string | null
  width: number | null
  height: number | null
  focal_x: Generated<number>
  focal_y: Generated<number>
  variants: Generated<string>
  size: Generated<number>
  source_url: string | null
  created_at: Timestamp
}
export interface RedirectsTable {
  id: Generated<number>
  from_path: string
  to_url: string
  status_code: Generated<number>
  hits: Generated<number>
  extension_id: string | null
  created_at: Timestamp
}
export interface NotFoundLogTable {
  path: string
  hits: Generated<number>
  referrer: string | null
  last_seen: Timestamp
}
export interface UserTotpTable {
  user_id: string
  secret: string
  enabled_at: string | null
  last_step: Generated<number>
  created_at: Timestamp
}
export interface UserRecoveryCodesTable {
  id: Generated<number>
  user_id: string
  code_hash: string
  used_at: string | null
}
export interface MfaChallengesTable {
  token_hash: string
  user_id: string
  next_path: string | null
  attempts: Generated<number>
  expires_at: string
}
export interface UserPasskeysTable {
  id: string
  user_id: string
  public_key: string
  counter: Generated<number>
  transports: Generated<string>
  name: string
  created_at: Timestamp
  last_used_at: string | null
}
export interface PasskeyChallengesTable {
  token_hash: string
  challenge: string
  user_id: string | null
  purpose: "register" | "signin"
  expires_at: string
}
export interface WpImportsTable {
  id: Generated<number>
  origin: string
  filename: string | null
  counts_json: Generated<string>
  created_by: string | null
  created_at: Timestamp
}
export interface ApiTokensTable {
  id: string
  name: string
  token_hash: string
  scopes: Generated<string>
  app_id: string | null
  created_by: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: Timestamp
}
export interface WebhooksTable {
  id: string
  url: string
  secret: string
  events: Generated<string>
  active: Generated<number>
  app_id: string | null
  created_at: Timestamp
}
export interface WebhookDeliveriesTable {
  id: Generated<number>
  webhook_id: string
  event: string
  payload: string
  status: Generated<"pending" | "delivered" | "failed">
  attempts: Generated<number>
  response_code: number | null
  error: string | null
  next_attempt_at: Timestamp
  created_at: Timestamp
}
export interface ExtensionsTable {
  id: string
  name: string
  version: string
  manifest_json: string
  enabled: Generated<number>
  installed_by: string | null
  installed_at: Timestamp
}
export interface AppsTable {
  id: string
  name: string
  base_url: string
  admin_path: string | null
  secret: string
  scopes: Generated<string>
  blocks: Generated<string>
  enabled: Generated<number>
  created_by: string | null
  created_at: Timestamp
}
export interface CommentsTable {
  id: Generated<number>
  post_id: string
  parent_id: number | null
  author_name: string
  author_email: string | null
  user_id: string | null
  body: string
  status: Generated<"pending" | "approved" | "spam">
  ip_hash: string | null
  created_at: Timestamp
}

export interface Database {
  users: UsersTable
  helpdesk_tickets: HelpdeskTicketsTable
  helpdesk_messages: HelpdeskMessagesTable
  helpdesk_canned: HelpdeskCannedTable
  kb_categories: KbCategoriesTable
  kb_articles: KbArticlesTable
  forms: FormsTable
  form_submissions: FormSubmissionsTable
  campaigns: CampaignsTable
  campaign_recipients: CampaignRecipientsTable
  campaign_links: CampaignLinksTable
  projects: ProjectsTable
  project_tasks: ProjectTasksTable
  team_members: TeamMembersTable
  leave_requests: LeaveRequestsTable
  time_entries: TimeEntriesTable
  expenses: ExpensesTable
  content_translations: ContentTranslationsTable
  site_translations: SiteTranslationsTable
  oauth_accounts: OAuthAccountsTable
  sessions: SessionsTable
  auth_tokens: AuthTokensTable
  profiles: ProfilesTable
  user_roles: UserRolesTable
  audit_log: AuditLogTable
  site_settings: SiteSettingsTable
  rate_limits: RateLimitsTable
  contact_requests: ContactRequestsTable
  cms_pages: CmsPagesTable
  cms_page_revisions: CmsPageRevisionsTable
  posts: PostsTable
  chat_conversations: ChatConversationsTable
  chat_messages: ChatMessagesTable
  bookings: BookingsTable
  booking_event_types: BookingEventTypesTable
  booking_lock: BookingLockTable
  stripe_customers: StripeCustomersTable
  subscriptions: SubscriptionsTable
  stripe_events: StripeEventsTable
  crm_contacts: CrmContactsTable
  crm_deals: CrmDealsTable
  crm_activities: CrmActivitiesTable
  newsletter_subscribers: NewsletterSubscribersTable
  analytics_daily: AnalyticsDailyTable
  analytics_referrers: AnalyticsReferrersTable
  cms_blocks: CmsBlocksTable
  content_types: ContentTypesTable
  content_entries: ContentEntriesTable
  media: MediaTable
  redirects: RedirectsTable
  not_found_log: NotFoundLogTable
  user_totp: UserTotpTable
  user_recovery_codes: UserRecoveryCodesTable
  mfa_challenges: MfaChallengesTable
  user_passkeys: UserPasskeysTable
  passkey_challenges: PasskeyChallengesTable
  wp_imports: WpImportsTable
  api_tokens: ApiTokensTable
  webhooks: WebhooksTable
  webhook_deliveries: WebhookDeliveriesTable
  extensions: ExtensionsTable
  apps: AppsTable
  comments: CommentsTable
}

export type UserRow = Selectable<UsersTable>
export type ProfileRow = Selectable<ProfilesTable>
export type UserRoleRow = Selectable<UserRolesTable>
export type AuditLogRow = Selectable<AuditLogTable>
export type ContactRequestRow = Selectable<ContactRequestsTable>
export type CmsPageRow = Selectable<CmsPagesTable>
export type CmsRevisionRow = Selectable<CmsPageRevisionsTable>
export type PostRow = Selectable<PostsTable>
export type ChatConversationRow = Selectable<ChatConversationsTable>
export type ChatMessageRow = Selectable<ChatMessagesTable>
export type BookingRow = Selectable<BookingsTable>
export type SubscriptionRow = Selectable<SubscriptionsTable>
export type NewSubscription = Insertable<SubscriptionsTable>
export type CrmContactRow = Selectable<CrmContactsTable>
export type CrmDealRow = Selectable<CrmDealsTable>
export type CrmActivityRow = Selectable<CrmActivitiesTable>
export type NewsletterSubscriberRow = Selectable<NewsletterSubscribersTable>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export const ROLES: readonly AppRole[] = [
  "admin",
  "editor",
  "author",
  "contributor",
  "support",
]
