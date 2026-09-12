import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { AuthSession, ChangePasswordInput, LoginCredentials } from "@/types";

export const authApi = {
  login(credentials: LoginCredentials): Promise<AuthSession> {
    return apiRequest<AuthSession>(endpoints.auth.login, {
      method: "POST",
      body: credentials,
      anonymous: true,
    });
  },

  changePassword(input: ChangePasswordInput): Promise<void> {
    return apiRequest<void>(endpoints.auth.changePassword, {
      method: "POST",
      body: input,
    });
  },
};
