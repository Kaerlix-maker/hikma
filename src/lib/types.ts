// Types for supabase/migrations/0001_init.sql

export type Assistant = {
  id: string; owner_id: string; name: string; bot_name: string; welcome: string; brand_color: string;
  knowledge: string; allowed_domains: string[]; created_at: string; updated_at: string;
};
export type Question = { id: number; assistant_id: string; question: string; answer: string; answered: boolean; sources: string[]; created_at: string };
export type Lead = { id: number; assistant_id: string; email: string; question: string; handled: boolean; created_at: string };
type AiRequest = { id: number; key_hash: string; assistant_id: string | null; created_at: string };

type Rel<Col extends string, Ref extends string> = {
  foreignKeyName: `${string}_${Col}_fkey`; columns: [Col]; isOneToOne: false; referencedRelation: Ref; referencedColumns: ["id"];
};
type Table<Row, Required extends keyof Row, R extends unknown[] = []> = {
  Row: Row; Insert: Pick<Row, Required> & Partial<Row>; Update: Partial<Row>; Relationships: R;
};

export type Database = {
  public: {
    Tables: {
      assistants: Table<Assistant, "owner_id" | "name">;
      questions: Table<Question, "assistant_id" | "question" | "answer" | "answered", [Rel<"assistant_id", "assistants">]>;
      leads: Table<Lead, "assistant_id" | "email" | "question", [Rel<"assistant_id", "assistants">]>;
      ai_requests: Table<AiRequest, "key_hash">;
    };
    Views: Record<string, never>;
    Functions: {
      ai_allow: { Args: { p_key: string; p_assistant: string; p_per_hour?: number; p_per_assistant_day?: number; p_global_day?: number }; Returns: boolean };
      assistant_stats: { Args: { a: string }; Returns: { questions_30d: number; answered_pct: number; leads_open: number }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
