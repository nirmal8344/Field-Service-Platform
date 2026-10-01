package com.fieldservice.field_service_backend.service;

import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    String storeFile(MultipartFile file);
    byte[] loadFile(String filename);
    String getContentType(String filename);
    boolean fileExists(String filename);
}
