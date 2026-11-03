export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Helper for the platform-module tables below: `Req` lists the columns that
// must be supplied on insert; every other column has a database default.
type Table<Row, Req extends keyof Row> = {
  Row: Row
  Insert: Pick<Row, Req> & Partial<Omit<Row, Req>>
  Update: Partial<Row>
  Relationships: []
}

export type AppRole = "admin" | "editor" | "support"
export type ContactStatus = "new" | "open" | "closed" | "spam"
export type CmsStatus = "draft" | "published" | "archived"
export type ChatStatus = "open" | "pending" | "closed"
export type ChatSender = "visitor" | "staff" | "system"
export type BookingStatus = "scheduled" | "canceled"

export type UserRoleRow = {
  user_id: string
  role: AppRole
  granted_by: string | null
  created_at: string
}
export type AuditLogRow = {
  id: number
  actor_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  meta: Json
  ip: string | null
  created_at: string
}
export type SiteSettingRow = {
  key: string
  value: Json
  updated_by: string | null
  updated_at: string
}
export type CmsPageRow = {
  id: string
  slug: string
  title: string
  body_md: string
  body_html: string
  excerpt: string | null
  seo_title: string | null
  seo_description: string | null
  status: CmsStatus
  published_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}
export type PostRow = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body_md: string
  body_html: string
  cover_image_url: string | null
  author_name: string | null
  tags: string[]
  seo_title: string | null
  seo_description: string | null
  status: CmsStatus
  published_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}
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
export type CrmContactRow = {
  id: string
  email: string | null
  name: string | null
  company: string | null
  phone: string | null
  user_id: string | null
  status: CrmStatus
  source: string | null
  owner_id: string | null
  tags: string[]
  notes: string | null
  last_activity_at: string
  created_at: string
  updated_at: string
}
export type CrmDealRow = {
  id: string
  contact_id: string
  title: string
  value_cents: number
  currency: string
  stage: DealStage
  owner_id: string | null
  expected_close: string | null
  created_at: string
  updated_at: string
}
export type CrmActivityRow = {
  id: number
  contact_id: string
  kind: CrmActivityKind
  body: string | null
  ref_type: string | null
  ref_id: string | null
  actor_id: string | null
  created_at: string
}
export type NewsletterSubscriberRow = {
  id: string
  email: string
  name: string | null
  status: "pending" | "confirmed" | "unsubscribed"
  confirm_token_hash: string | null
  unsubscribe_token_hash: string
  source: string | null
  created_at: string
  confirmed_at: string | null
  unsubscribed_at: string | null
}
export type CmsRevisionRow = {
  id: number
  page_id: string
  title: string
  body_md: string
  saved_by: string | null
  created_at: string
}
export type ChatConversationRow = {
  id: string
  user_id: string | null
  visitor_token_hash: string | null
  visitor_name: string | null
  visitor_email: string | null
  page_url: string | null
  status: ChatStatus
  assigned_to: string | null
  unread_by_staff: number
  unread_by_visitor: number
  last_message_at: string
  created_at: string
}
export type ChatMessageRow = {
  id: number
  conversation_id: string
  sender: ChatSender
  author_id: string | null
  body: string
  created_at: string
}
export type BookingRow = {
  id: string
  provider: "calendly"
  external_id: string
  event_uri: string | null
  event_name: string | null
  invitee_name: string | null
  invitee_email: string | null
  user_id: string | null
  start_time: string | null
  end_time: string | null
  status: BookingStatus
  cancel_reason: string | null
  cancel_url: string | null
  reschedule_url: string | null
  created_at: string
  updated_at: string
}
export type SubscriptionRow = {
  id: string
  user_id: string | null
  stripe_customer_id: string
  status: string
  price_id: string | null
  product_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}
export type AdminUserRow = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  full_name: string | null
  company_name: string | null
  roles: AppRole[]
  subscription_status: string | null
  total_count: number
}

export interface Database {
  public: {
    Tables: {
      contact_requests: {
        Row: {
          company_name: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          message_body: string | null
          phone: string | null
          updated_at: Date | null
          created_at: string
          status: ContactStatus
          admin_notes: string | null
          handled_by: string | null
        }
        Insert: {
          company_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message_body?: string | null
          phone?: string | null
          updated_at?: Date | null
          status?: ContactStatus
        }
        Update: {
          company_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message_body?: string | null
          phone?: string | null
          updated_at?: Date | null
          status?: ContactStatus
          admin_notes?: string | null
          handled_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          company_name: string | null
          website: string | null
          unsubscribed: boolean
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: Date | null
          company_name?: string | null
          website?: string | null
          unsubscribed: boolean
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          company_name?: string | null
          website?: string | null
          unsubscribed: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          stripe_customer_id: string
          updated_at: Date | null
          user_id: string
        }
        Insert: {
          stripe_customer_id: string
          updated_at?: Date | null
          user_id: string
        }
        Update: {
          stripe_customer_id?: string
          updated_at?: Date | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: Table<UserRoleRow, "user_id" | "role">
      audit_log: Table<AuditLogRow, "action">
      site_settings: Table<SiteSettingRow, "key" | "value">
      rate_limits: Table<
        { key: string; window_start: string; hits: number },
        "key" | "window_start" | "hits"
      >
      cms_pages: Table<CmsPageRow, "slug" | "title">
      posts: Table<PostRow, "slug" | "title">
      crm_contacts: Table<CrmContactRow, never>
      crm_deals: Table<CrmDealRow, "contact_id" | "title">
      crm_activities: Table<CrmActivityRow, "contact_id" | "kind">
      newsletter_subscribers: Table<
        NewsletterSubscriberRow,
        "email" | "unsubscribe_token_hash"
      >
      analytics_daily: Table<
        { day: string; path: string; views: number },
        "day" | "path"
      >
      analytics_referrers: Table<
        { day: string; host: string; views: number },
        "day" | "host"
      >
      cms_page_revisions: Table<CmsRevisionRow, "page_id" | "title" | "body_md">
      chat_conversations: Table<ChatConversationRow, never>
      chat_messages: Table<
        ChatMessageRow,
        "conversation_id" | "sender" | "body"
      >
      bookings: Table<BookingRow, "external_id">
      subscriptions: Table<
        SubscriptionRow,
        "id" | "stripe_customer_id" | "status"
      >
      stripe_events: Table<
        { id: string; type: string; received_at: string },
        "id" | "type"
      >
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { r: AppRole }; Returns: boolean }
      rate_limit_hit: {
        Args: { p_key: string; p_window_seconds: number; p_max: number }
        Returns: boolean
      }
      rate_limit_prune: { Args: Record<string, never>; Returns: undefined }
      analytics_hit: {
        Args: { p_path: string; p_host: string | null }
        Returns: undefined
      }
      admin_list_users: {
        Args: { p_search?: string | null; p_limit?: number; p_offset?: number }
        Returns: AdminUserRow[]
      }
    }
    Enums: {
      app_role: AppRole
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
