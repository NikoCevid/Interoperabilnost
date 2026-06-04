// ─── Tag ─────────────────────────────────────────────────────────────────────
export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  dateCreated: string;
}

export interface CreateTagPayload {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagPayload {
  name: string;
  color: string;
  description?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TagQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

// ─── SOAP ─────────────────────────────────────────────────────────────────────
export interface SoapSearchResponse {
  tags: SoapTag[];
  searchTerm: string;
  totalFound: number;
  xmlValid: boolean;
  validationErrors: string[];
}

export interface SoapTag {
  id: string;
  name: string;
  color: string;
  description: string;
  dateCreated: string;
}

// ─── Weather / gRPC ───────────────────────────────────────────────────────────
export interface WeatherResult {
  cityName: string;
  results: WeatherEntry[];
}

export interface WeatherEntry {
  city: string;
  temperature: string;
  humidity: string;
  wind: string;
}

// ─── Import ───────────────────────────────────────────────────────────────────
export interface ImportResult {
  message: string;
  tags: Tag[];
}

export interface ImportError {
  message: string;
  format: string;
  errors: string[];
}

// ─── GraphQL ──────────────────────────────────────────────────────────────────
export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}
