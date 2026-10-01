package com.fieldservice.field_service_backend.config;

import com.fieldservice.field_service_backend.model.Role;

public class UserContext {

    private static final ThreadLocal<AuthenticatedUser> current = new ThreadLocal<>();

    public static void set(AuthenticatedUser user) {
        current.set(user);
    }

    public static AuthenticatedUser get() {
        return current.get();
    }

    public static void clear() {
        current.remove();
    }

    public static Long getCurrentUserId() {
        AuthenticatedUser u = current.get();
        return u != null ? u.getId() : null;
    }

    public static String getCurrentUserEmail() {
        AuthenticatedUser u = current.get();
        return u != null ? u.getEmail() : null;
    }

    public static Role getCurrentUserRole() {
        AuthenticatedUser u = current.get();
        return u != null ? u.getRole() : null;
    }

    public static class AuthenticatedUser {
        private final Long id;
        private final String email;
        private final Role role;

        public AuthenticatedUser(Long id, String email, Role role) {
            this.id = id;
            this.email = email;
            this.role = role;
        }

        public Long getId() {
            return id;
        }

        public String getEmail() {
            return email;
        }

        public Role getRole() {
            return role;
        }
    }
}
