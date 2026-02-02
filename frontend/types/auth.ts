export interface AuthState {
    isAuthenticated: boolean;
    isHydrated: boolean;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface SignupPayload extends LoginPayload {
    name: string;
}
