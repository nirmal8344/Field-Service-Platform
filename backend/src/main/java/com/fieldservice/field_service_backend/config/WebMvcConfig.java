package com.fieldservice.field_service_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://field-service-platform-gilt.vercel.app,https://*.vercel.app}")
    private String allowedOrigins;

    public WebMvcConfig(AuthInterceptor authInterceptor) {
        this.authInterceptor = authInterceptor;
    }

    private List<String> parseAllowedOrigins() {
        if (allowedOrigins == null || allowedOrigins.trim().isEmpty()) {
            return List.of("*");
        }
        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        List<String> origins = parseAllowedOrigins();
        for (String origin : origins) {
            config.addAllowedOriginPattern(origin);
        }
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        config.setMaxAge(3600L);
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = parseAllowedOrigins();
        registry.addMapping("/**")
                .allowedOriginPatterns(origins.toArray(new String[0]))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/upload/files/**",
                        "/api/health",
                        "/api/seed",
                        "/error"
                );
    }
}
