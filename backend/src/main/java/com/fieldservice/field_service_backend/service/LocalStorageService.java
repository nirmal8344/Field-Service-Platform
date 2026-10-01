package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class LocalStorageService implements StorageService {

    private final Path uploadPath;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/jpg"
    );

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    public LocalStorageService(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize upload directory: " + this.uploadPath, e);
        }
    }

    @Override
    public String storeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Cannot upload empty file");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File exceeds 10MB limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Invalid file type. Allowed: JPEG, PNG, WEBP, GIF");
        }

        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
            // Sanitize extension
            if (!extension.matches("^\\.[a-zA-Z0-9]+$")) {
                extension = ".jpg";
            }
        } else {
            extension = ".jpg";
        }

        String uniqueFilename = UUID.randomUUID().toString().replace("-", "") + extension;
        Path targetLocation = this.uploadPath.resolve(uniqueFilename).normalize();
        if (!targetLocation.startsWith(this.uploadPath)) {
            throw new BadRequestException("Invalid path sequence in filename");
        }

        try {
            Files.copy(file.getInputStream(), targetLocation);
            return "/api/upload/files/" + uniqueFilename;
        } catch (IOException e) {
            throw new BadRequestException("Failed to store file: " + e.getMessage());
        }
    }

    @Override
    public byte[] loadFile(String filename) {
        try {
            Path filePath = this.uploadPath.resolve(filename).normalize();
            if (!filePath.startsWith(this.uploadPath)) {
                throw new BadRequestException("Invalid path traversal attempt");
            }
            if (!Files.exists(filePath)) {
                throw new BadRequestException("File not found: " + filename);
            }
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new BadRequestException("Failed to read file: " + e.getMessage());
        }
    }

    @Override
    public String getContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        return "image/jpeg";
    }

    @Override
    public boolean fileExists(String filename) {
        if (filename == null || filename.trim().isEmpty()) return false;
        try {
            Path filePath = this.uploadPath.resolve(filename.trim()).normalize();
            return filePath.startsWith(this.uploadPath) && Files.exists(filePath);
        } catch (Exception e) {
            return false;
        }
    }
}
