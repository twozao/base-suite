import type { ColumnType, Generated, Insertable, Selectable } from "kysely"

// One schema for every dialect. Timestamps are ISO-8601 strings, booleans are 0/1 integers and JSON
// is stored as text, so a row reads the same from SQLite and Postgres. Ids are app-generated UUIDs.
export type Timestamp = ColumnType<string, string | undefined, string>
export type AppRole = "admin" | "editor" | "support"
export type ContactStatus = "new" | "open" | "closed" | "spam"
export type CmsStatus = "draft" | "published" | "archived"
export type ChatStatus = "open" | "pending" | "closed"
export type ChatSender = "visitor" | "staff" | "system"
export type BookingStatus = "scheduled" | "canceled"
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
}
export interface CmsPageRevisionsTable {
  id: Generated<number>
  page_id: string
  title: string
  body_md: string
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
  provider: Generated<"calendly">
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

export interface Database {
  users: UsersTable
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
  stripe_customers: StripeCustomersTable
  subscriptions: SubscriptionsTable
  stripe_events: StripeEventsTable
  crm_contacts: CrmContactsTable
  crm_deals: CrmDealsTable
  crm_activities: CrmActivitiesTable
  newsletter_subscribers: NewsletterSubscribersTable
  analytics_daily: AnalyticsDailyTable
  analytics_referrers: AnalyticsReferrersTable
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

export const ROLES: readonly AppRole[] = ["admin", "editor", "support"]
