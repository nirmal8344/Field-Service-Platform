package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.exception.BadRequestException;
import com.fieldservice.field_service_backend.exception.UnauthorizedException;
import com.fieldservice.field_service_backend.service.StorageService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    private final StorageService storageService;

    public FileUploadController(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping(value = "/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadPhoto(@RequestParam("file") MultipartFile file) {
        if (UserContext.getCurrentUserId() == null) {
            throw new UnauthorizedException("Authentication required to upload photos");
        }

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No image file provided in multipart request");
        }

        String path = storageService.storeFile(file);

        Map<String, String> response = new HashMap<>();
        response.put("url", path);
        response.put("filename", file.getOriginalFilename());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<byte[]> getFile(@PathVariable String filename) {
        byte[] fileBytes = storageService.loadFile(filename);
        String contentType = storageService.getContentType(filename);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(fileBytes);
    }
}
