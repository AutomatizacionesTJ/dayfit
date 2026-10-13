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
          current_streak: number;
          full_name: string;
          id: string;
          is_private: boolean;
          last_post_date: string | null;
          max_streak: number;
          timezone: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          current_streak?: number;
          last_post_date?: string | null;
          max_streak?: number;
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
          current_streak?: number;
          last_post_date?: string | null;
          max_streak?: number;
          full_name?: string;
          id?: string;
          is_private?: boolean;
          timezone?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
          status: "pending" | "accepted";
        };
        Insert: {
          created_at?: string;
          follower_id?: string;
          following_id: string;
          status?: "pending" | "accepted";
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
          status?: "pending" | "accepted";
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      outfits: {
        Row: {
          caption: string | null;
          created_at: string;
          id: string;
          image_path: string;
          post_date: string;
          user_id: string;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          image_path: string;
          post_date?: string;
          user_id?: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          image_path?: string;
          post_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outfits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_view_outfits: {
        Args: { p_owner: string };
        Returns: boolean;
      };
      discover_feed: {
        Args: { p_before_at?: string; p_before_id?: string; p_limit?: number };
        Returns: Database["public"]["CompositeTypes"]["feed_item"][];
      };
      follow_counts: {
        Args: { p_user: string };
        Returns: { followers: number; following: number }[];
      };
      home_feed: {
        Args: { p_before_at?: string; p_before_id?: string; p_limit?: number };
        Returns: Database["public"]["CompositeTypes"]["feed_item"][];
      };
      search_profiles: {
        Args: { p_query: string; p_limit?: number };
        Returns: {
          id: string;
          username: string;
          full_name: string;
          avatar_url: string | null;
          is_private: boolean;
        }[];
      };
      streak: {
        Args: { p: Database["public"]["Tables"]["profiles"]["Row"] };
        Returns: number;
      };
      user_today: {
        Args: { p_user: string };
        Returns: string;
      };
      username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      feed_item: {
        id: string;
        user_id: string;
        image_path: string;
        caption: string | null;
        post_date: string;
        created_at: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
        streak: number;
      };
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Outfit = Database["public"]["Tables"]["outfits"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];
export type FollowStatus = Follow["status"];
export type FeedRow = Database["public"]["CompositeTypes"]["feed_item"];
export type ProfileHit = Database["public"]["Functions"]["search_profiles"]["Returns"][number];
