package com.fieldservice.field_service_backend.config;

import com.fieldservice.field_service_backend.exception.ForbiddenException;
import com.fieldservice.field_service_backend.exception.UnauthorizedException;
import com.fieldservice.field_service_backend.model.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        // Public endpoints
        if (path.startsWith("/api/auth/login") || 
            path.startsWith("/api/auth/register") || 
            path.startsWith("/api/health") ||
            path.startsWith("/error")) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || authHeader.trim().isEmpty()) {
            throw new UnauthorizedException("Authentication token is required for this endpoint");
        }

        String[] parsed = SecurityUtils.parseToken(authHeader);
        if (parsed == null || parsed.length < 3) {
            throw new UnauthorizedException("Invalid, tampered, or expired authentication token");
        }

        try {
            Long userId = Long.parseLong(parsed[0]);
            String email = parsed[1];
            Role role = Role.valueOf(parsed[2]);

            UserContext.set(new UserContext.AuthenticatedUser(userId, email, role));
            request.setAttribute("authenticatedUser", UserContext.get());

            // Check role authorization annotation if present
            if (handler instanceof HandlerMethod handlerMethod) {
                RequireRole methodRole = handlerMethod.getMethodAnnotation(RequireRole.class);
                RequireRole classRole = handlerMethod.getBeanType().getAnnotation(RequireRole.class);
                RequireRole target = methodRole != null ? methodRole : classRole;

                if (target != null) {
                    boolean allowed = Arrays.asList(target.value()).contains(role);
                    if (!allowed) {
                        throw new ForbiddenException("Access Denied: User with role " + role + " cannot access this resource.");
                    }
                }
            }

            return true;
        } catch (IllegalArgumentException e) {
            throw new UnauthorizedException("Invalid token payload");
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }
}
