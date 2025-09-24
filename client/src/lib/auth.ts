import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  country: string;
}

export const login = async (username: string, password: string): Promise<AuthUser> => {
  const response = await apiRequest("POST", "/api/auth/login", { username, password });
  return response.json();
};

export const register = async (userData: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
}): Promise<AuthUser> => {
  const response = await apiRequest("POST", "/api/auth/register", userData);
  return response.json();
};

export const logout = async (): Promise<void> => {
  await apiRequest("POST", "/api/auth/logout");
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  } catch (error) {
    return null;
  }
};
