package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.dto.ServiceCategoryDTO;
import com.fieldservice.field_service_backend.dto.ServiceTypeDTO;
import com.fieldservice.field_service_backend.dto.SkillDTO;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.service.ServiceCatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ServiceCatalogController {

    private final ServiceCatalogService catalogService;

    public ServiceCatalogController(ServiceCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/categories")
    public ResponseEntity<List<ServiceCategoryDTO>> getCategories() {
        return ResponseEntity.ok(catalogService.getActiveCategories());
    }

    @GetMapping("/categories/all")
    public ResponseEntity<List<ServiceCategoryDTO>> getAllCategories() {
        return ResponseEntity.ok(catalogService.getAllCategories());
    }

    @PostMapping("/categories")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<ServiceCategoryDTO> createCategory(@RequestBody ServiceCategoryDTO dto) {
        return ResponseEntity.ok(catalogService.createCategory(dto));
    }

    @PutMapping("/categories/{id}")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<ServiceCategoryDTO> updateCategory(@PathVariable Long id, @RequestBody ServiceCategoryDTO dto) {
        return ResponseEntity.ok(catalogService.updateCategory(id, dto));
    }

    @PutMapping("/categories/{id}/toggle-active")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<ServiceCategoryDTO> toggleCategoryActive(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.toggleCategoryActive(id));
    }

    @GetMapping("/categories/{categoryId}/types")
    public ResponseEntity<List<ServiceTypeDTO>> getTypesByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(catalogService.getTypesByCategory(categoryId));
    }

    @PostMapping("/categories/{categoryId}/types")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<ServiceTypeDTO> createType(@PathVariable Long categoryId, @RequestBody ServiceTypeDTO dto) {
        return ResponseEntity.ok(catalogService.createType(categoryId, dto));
    }

    @PutMapping("/categories/types/{id}")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<ServiceTypeDTO> updateType(@PathVariable Long id, @RequestBody ServiceTypeDTO dto) {
        return ResponseEntity.ok(catalogService.updateType(id, dto));
    }

    @PutMapping("/categories/types/{id}/toggle-active")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<ServiceTypeDTO> toggleTypeActive(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.toggleTypeActive(id));
    }

    @GetMapping("/skills")
    public ResponseEntity<List<SkillDTO>> getSkills() {
        return ResponseEntity.ok(catalogService.getAllSkills());
    }

    @PostMapping("/skills")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<SkillDTO> createSkill(@RequestBody SkillDTO dto) {
        return ResponseEntity.ok(catalogService.createSkill(dto));
    }

    @PutMapping("/skills/{id}")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<SkillDTO> updateSkill(@PathVariable Long id, @RequestBody SkillDTO dto) {
        return ResponseEntity.ok(catalogService.updateSkill(id, dto));
    }

    @DeleteMapping("/skills/{id}")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<Void> deleteSkill(@PathVariable Long id) {
        catalogService.deleteSkill(id);
        return ResponseEntity.noContent().build();
    }
}
