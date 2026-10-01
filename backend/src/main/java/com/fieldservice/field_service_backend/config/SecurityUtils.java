package com.fieldservice.field_service_backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.Base64;

@Component
public class SecurityUtils {

    private static final long DEFAULT_EXPIRATION_MS = 24L * 60 * 60 * 1000; // 24 hours
    private static final BCryptPasswordEncoder BCRYPT_ENCODER = new BCryptPasswordEncoder(12);

    private static String secretKey;
    private static String salt;

    @Autowired
    public SecurityUtils(
            @Value("${app.jwt.secret:}") String configuredSecret,
            @Value("${app.jwt.salt:}") String configuredSalt,
            Environment env) {
        
        String envSecret = System.getenv("JWT_SECRET");
        String finalSecret = (envSecret != null && !envSecret.isBlank()) ? envSecret.trim() : configuredSecret.trim();

        String envSalt = System.getenv("JWT_SALT");
        String finalSalt = (envSalt != null && !envSalt.isBlank()) ? envSalt.trim() : configuredSalt.trim();

        boolean isDevOrTest = false;
        if (env != null && env.getActiveProfiles() != null) {
            isDevOrTest = Arrays.stream(env.getActiveProfiles())
                    .anyMatch(p -> p.equalsIgnoreCase("dev") || p.equalsIgnoreCase("test"));
        }

        // If running in production (default) without explicit profiles, fail fast if secrets are empty
        if (finalSecret.isEmpty()) {
            if (!isDevOrTest) {
                // In production, require explicit secret
                throw new IllegalStateException("FATAL: JWT_SECRET environment variable is missing for production deployment. Refusing to start with insecure configuration.");
            }
            finalSecret = "DevSecretKey_FieldServicePlatform_2026_SecureKey!";
        }

        if (finalSalt.isEmpty()) {
            if (!isDevOrTest) {
                // In production, require explicit salt
                throw new IllegalStateException("FATAL: JWT_SALT environment variable is missing for production deployment. Refusing to start with insecure configuration.");
            }
            finalSalt = "DevSalt_FieldServicePlatform_2026!";
        }

        SecurityUtils.secretKey = finalSecret;
        SecurityUtils.salt = finalSalt;
    }

    public static String getSalt() {
        if (salt != null && !salt.isBlank()) return salt;
        String envSalt = System.getenv("JWT_SALT");
        if (envSalt != null && !envSalt.trim().isEmpty()) return envSalt.trim();
        String propSalt = System.getProperty("app.jwt.salt");
        if (propSalt != null && !propSalt.trim().isEmpty()) return propSalt.trim();
        
        throw new IllegalStateException("JWT_SALT is not configured. Production environment variable required.");
    }

    public static String getSecretKey() {
        if (secretKey != null && !secretKey.isBlank()) return secretKey;
        String envKey = System.getenv("JWT_SECRET");
        if (envKey != null && !envKey.trim().isEmpty()) return envKey.trim();
        String propKey = System.getProperty("app.jwt.secret");
        if (propKey != null && !propKey.trim().isEmpty()) return propKey.trim();
        
        throw new IllegalStateException("JWT_SECRET is not configured. Production environment variable required.");
    }

    public static void setSecretKeyAndSaltForTesting(String testSecret, String testSalt) {
        SecurityUtils.secretKey = testSecret;
        SecurityUtils.salt = testSalt;
    }

    /**
     * Hashes a raw password using industry-standard BCrypt (work factor 12).
     */
    public static String hashPassword(String rawPassword) {
        if (rawPassword == null || rawPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("Password cannot be empty");
        }
        return BCRYPT_ENCODER.encode(rawPassword);
    }

    /**
     * Verifies a raw password strictly against a BCrypt hash.
     */
    public static boolean checkPassword(String rawPassword, String hashedPassword) {
        if (rawPassword == null || hashedPassword == null || rawPassword.trim().isEmpty() || hashedPassword.trim().isEmpty()) {
            return false;
        }
        if (!hashedPassword.startsWith("$2a$") && !hashedPassword.startsWith("$2b$") && !hashedPassword.startsWith("$2y$")) {
            return false; // Reject non-BCrypt / legacy hashes
        }
        return BCRYPT_ENCODER.matches(rawPassword, hashedPassword);
    }

    public static String generateToken(Long userId, String email, String role) {
        if (userId == null || email == null || role == null) {
            throw new IllegalArgumentException("Cannot generate token with null identity fields");
        }
        long timestamp = System.currentTimeMillis();
        String payload = userId + ":" + email + ":" + role + ":" + timestamp;
        String signature = sign(payload);
        String fullToken = payload + "||" + signature;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(fullToken.getBytes(StandardCharsets.UTF_8));
    }

    public static String[] parseToken(String token) {
        try {
            if (token == null || token.trim().isEmpty()) return null;
            if (token.startsWith("Bearer ")) {
                token = token.substring(7).trim();
            }
            if (token.isEmpty()) return null;
            byte[] decoded = Base64.getUrlDecoder().decode(token);
            String tokenStr = new String(decoded, StandardCharsets.UTF_8);
            
            String[] parts = tokenStr.split("\\|\\|");
            if (parts.length != 2) {
                return null; // Malformed token
            }
            String payload = parts[0];
            String sig = parts[1];
            if (!MessageDigest.isEqual(sign(payload).getBytes(StandardCharsets.UTF_8), sig.getBytes(StandardCharsets.UTF_8))) {
                return null; // Tampered token or invalid signature
            }
            String[] userParts = payload.split(":");
            if (userParts.length < 4) {
                return null; // Incomplete payload
            }
            try {
                long tokenTimestamp = Long.parseLong(userParts[3]);
                if (System.currentTimeMillis() - tokenTimestamp > DEFAULT_EXPIRATION_MS) {
                    return null; // Expired token
                }
            } catch (NumberFormatException e) {
                return null; // Invalid timestamp
            }
            return userParts;
        } catch (Exception e) {
            return null;
        }
    }

    private static String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(getSecretKey().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hmacBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to sign token", e);
        }
    }
}
