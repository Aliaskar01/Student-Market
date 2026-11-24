export interface User {
  student_id: number;
  full_name: string;
  university_email: string;
  university: string;
  telegram_handle: string | null;
  phone_number: string | null;
  auth_provider: string;
  role: string;
  is_active: boolean;
  created_at?: string | null;
}

export interface AuthConfig {
  provider: 'local' | 'keycloak' | string;
  allow_registration: boolean;
  password_min_length: number;
  keycloak: {
    url: string;
    realm: string;
    client_id: string;
    issuer: string;
  } | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface UserSession {
  session_id: number;
  auth_provider: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  is_current: boolean;
}

export interface Category {
  category_id: number;
  name: string;
  slug?: string | null;
}

export interface ListingPhoto {
  photo_id: number;
  listing_id: number;
  image_reference: string;
  position: number;
}

export interface SellerPublicInfo {
  student_id: number;
  full_name: string;
  university: string;
}

export interface SellerContactInfo {
  university_email: string;
  telegram_handle: string | null;
  phone_number: string | null;
}

export interface Listing {
  listing_id: number;
  seller_id: number;
  category_id: number;
  category_name: string;
  title: string;
  description: string | null;
  price: number | string;
  usage_state: string | null;
  condition: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  photos: ListingPhoto[];
  seller: SellerPublicInfo;
  is_favorited: boolean;
}

export interface ListingDetail extends Listing {
  seller_contact: SellerContactInfo | null;
  contact_requires_auth: boolean;
}
