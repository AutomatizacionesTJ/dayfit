// Tipos de la base de datos. Regenera con:
//   npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
// (o --project-id <id> contra tu proyecto remoto)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          full_name: string;
          id: string;
          is_private: boolean;
          timezone: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          is_private?: boolean;
          timezone?: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          is_private?: boolean;
          timezone?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
