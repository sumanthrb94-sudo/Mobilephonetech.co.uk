export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          model: string;
          brand: string;
          category: string;
          storage: string | null;
          price: number;
          original_price: number;
          grade: 'Pristine' | 'Excellent' | 'Good' | 'Fair' | 'New';
          battery_health: number | null;
          warranty_months: number;
          return_days: number;
          image_url: string | null;
          gallery_images: string[] | null;
          is_certified: boolean;
          stock: number;
          specs: Json | null;
          description: string | null;
          condition_description: string | null;
          color_options: string[] | null;
          storage_options: string[] | null;
          condition_options: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          color: string | null;
          storage: string | null;
          condition: 'Pristine' | 'Excellent' | 'Good' | 'Fair' | 'New' | null;
          price: number;
          original_price: number;
          stock: number;
          battery_health: number | null;
          image_url: string | null;
          gallery_images: string[] | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['product_variants']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          address: Json | null;
          avatar_url: string | null;
          role: 'customer' | 'admin';
          created_at: string;
          updated_at: string;
        };
        // `role` is readable but not writable from the client: a database
        // trigger rejects any change to it that is not made with the service
        // role, so leaving it out here surfaces that as a type error rather
        // than a runtime one.
        Insert: Pick<Database['public']['Tables']['profiles']['Row'], 'id'> &
          Partial<Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'role' | 'created_at' | 'updated_at'>>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          selected_color: string | null;
          selected_storage: string | null;
          selected_condition: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cart_items']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cart_items']['Insert']>;
      };
      wishlist_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['wishlist_items']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          guest_email: string | null;
          status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal: number;
          delivery_cost: number;
          discount: number;
          total: number;
          delivery_address: Json | null;
          billing_address: Json | null;
          payment_intent_id: string | null;
          payment_method: string | null;
          tracking_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          model: string;
          brand: string;
          selected_color: string | null;
          selected_storage: string | null;
          selected_condition: string | null;
          price: number;
          original_price: number;
          quantity: number;
          image_url: string | null;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id'>;
        Update: never;
      };
      trade_in_quotes: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          device_brand: string;
          device_model: string;
          device_storage: string | null;
          device_condition: string;
          issues: string[] | null;
          estimated_value: number | null;
          status: 'pending' | 'quoted' | 'accepted' | 'rejected' | 'completed';
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trade_in_quotes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['trade_in_quotes']['Insert']>;
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          is_active: boolean;
          subscribed_at: string;
        };
        Insert: Omit<Database['public']['Tables']['newsletter_subscribers']['Row'], 'id' | 'subscribed_at'>;
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>;
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string | null;
          order_id: string | null;
          rating: number;
          title: string | null;
          comment: string | null;
          user_name: string;
          is_verified: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
