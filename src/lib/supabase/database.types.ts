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
      conversations: {
        Row: {
          a_read_at: string;
          b_read_at: string;
          created_at: string;
          id: string;
          last_message_at: string | null;
          user_a: string;
          user_b: string;
        };
        Insert: {
          a_read_at?: string;
          b_read_at?: string;
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          user_a: string;
          user_b: string;
        };
        Update: {
          a_read_at?: string;
          b_read_at?: string;
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          user_a?: string;
          user_b?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_fkey";
            columns: ["user_a"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_user_b_fkey";
            columns: ["user_b"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      can_message: {
        Args: { p_other: string };
        Returns: boolean;
      };
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
      get_or_create_conversation: {
        Args: { p_other: string };
        Returns: string;
      };
      home_feed: {
        Args: { p_before_at?: string; p_before_id?: string; p_limit?: number };
        Returns: Database["public"]["CompositeTypes"]["feed_item"][];
      };
      is_conversation_member: {
        Args: { p_conversation: string; p_user: string };
        Returns: boolean;
      };
      mark_conversation_read: {
        Args: { p_conversation: string };
        Returns: undefined;
      };
      my_conversations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          other_id: string;
          username: string;
          full_name: string;
          avatar_url: string | null;
          last_message_at: string;
          last_body: string | null;
          last_sender_id: string | null;
          unread: number;
        }[];
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
      unread_conversations: {
        Args: Record<PropertyKey, never>;
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
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type ConversationSummary = Database["public"]["Functions"]["my_conversations"]["Returns"][number];
