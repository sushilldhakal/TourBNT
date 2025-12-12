import { useMutation } from '@tanstack/react-query';
import { login, register, verifyEmail, forgotPassword, resetPassword } from '../api/authApi';

/**
 * Hook for user login
 */
export const useLogin = () => {
    return useMutation({
        mutationFn: login,
    });
};

/**
 * Hook for user registration
 */
export const useRegister = () => {
    return useMutation({
        mutationFn: register,
    });
};

/**
 * Hook for email verification
 */
export const useVerifyEmail = () => {
    return useMutation({
        mutationFn: verifyEmail,
    });
};

/**
 * Hook for forgot password
 */
export const useForgotPassword = () => {
    return useMutation({
        mutationFn: forgotPassword,
    });
};

/**
 * Hook for reset password
 */
export const useResetPassword = () => {
    return useMutation({
        mutationFn: resetPassword,
    });
};
