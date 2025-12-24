/**
 * Public user shape shared across services & frontend
 */
export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
}

/**
 * Auth signup response
 */

export interface SignupResponse {
  user: UserDTO;
}

/**
 * Auth login response
 */
export interface LoginResponse {
  token: string;
  user: UserDTO;
}

/**
 * JWT payload shape (what other service will trust )
 */
export interface JwtPayload {
  userId: string;
  email: string;
  fullName: string;
}