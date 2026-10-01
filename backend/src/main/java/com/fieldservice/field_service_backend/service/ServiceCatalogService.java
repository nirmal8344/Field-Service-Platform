package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.dto.ServiceCategoryDTO;
import com.fieldservice.field_service_backend.dto.ServiceTypeDTO;
import com.fieldservice.field_service_backend.dto.SkillDTO;
import com.fieldservice.field_service_backend.exception.BadRequestException;
import com.fieldservice.field_service_backend.exception.ResourceNotFoundException;
import com.fieldservice.field_service_backend.model.ServiceCategory;
import com.fieldservice.field_service_backend.model.ServiceType;
import com.fieldservice.field_service_backend.model.Skill;
import com.fieldservice.field_service_backend.repository.ServiceCategoryRepository;
import com.fieldservice.field_service_backend.repository.ServiceTypeRepository;
import com.fieldservice.field_service_backend.repository.SkillRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServiceCatalogService {

    private final ServiceCategoryRepository categoryRepository;
    private final ServiceTypeRepository typeRepository;
    private final SkillRepository skillRepository;

    public ServiceCatalogService(ServiceCategoryRepository categoryRepository,
                                 ServiceTypeRepository typeRepository,
                                 SkillRepository skillRepository) {
        this.categoryRepository = categoryRepository;
        this.typeRepository = typeRepository;
        this.skillRepository = skillRepository;
    }

    public List<ServiceCategoryDTO> getAllCategories() {
        return categoryRepository.findAll().stream().map(cat -> {
            ServiceCategoryDTO dto = new ServiceCategoryDTO(cat);
            List<ServiceTypeDTO> types = typeRepository.findByCategoryId(cat.getId()).stream()
                    .map(ServiceTypeDTO::new)
                    .collect(Collectors.toList());
            dto.setServiceTypes(types);
            return dto;
        }).collect(Collectors.toList());
    }

    public List<ServiceCategoryDTO> getActiveCategories() {
        return categoryRepository.findByActiveTrue().stream().map(cat -> {
            ServiceCategoryDTO dto = new ServiceCategoryDTO(cat);
            List<ServiceTypeDTO> types = typeRepository.findByCategoryIdAndActiveTrue(cat.getId()).stream()
                    .map(ServiceTypeDTO::new)
                    .collect(Collectors.toList());
            dto.setServiceTypes(types);
            return dto;
        }).collect(Collectors.toList());
    }

    public List<ServiceTypeDTO> getTypesByCategory(Long categoryId) {
        return typeRepository.findByCategoryId(categoryId).stream()
                .map(ServiceTypeDTO::new)
                .collect(Collectors.toList());
    }

    public List<SkillDTO> getAllSkills() {
        return skillRepository.findAll().stream()
                .map(SkillDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public SkillDTO createSkill(SkillDTO dto) {
        Skill skill = new Skill(dto.getName(), dto.getDescription(), dto.getCategory());
        skill = skillRepository.save(skill);
        return new SkillDTO(skill);
    }

    @Transactional
    public SkillDTO updateSkill(Long id, SkillDTO dto) {
        Skill skill = skillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + id));
        if (dto.getName() != null) skill.setName(dto.getName());
        if (dto.getDescription() != null) skill.setDescription(dto.getDescription());
        if (dto.getCategory() != null) skill.setCategory(dto.getCategory());
        skill = skillRepository.save(skill);
        return new SkillDTO(skill);
    }

    @Transactional
    public void deleteSkill(Long id) {
        Skill skill = skillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + id));
        skillRepository.delete(skill);
    }

    @Transactional
    public ServiceCategoryDTO createCategory(ServiceCategoryDTO dto) {
        ServiceCategory cat = new ServiceCategory(dto.getName(), dto.getCode(), dto.getIcon(), dto.getDescription());
        cat = categoryRepository.save(cat);
        return new ServiceCategoryDTO(cat);
    }

    @Transactional
    public ServiceCategoryDTO updateCategory(Long id, ServiceCategoryDTO dto) {
        ServiceCategory cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        if (dto.getName() != null) cat.setName(dto.getName());
        if (dto.getCode() != null) cat.setCode(dto.getCode());
        if (dto.getIcon() != null) cat.setIcon(dto.getIcon());
        if (dto.getDescription() != null) cat.setDescription(dto.getDescription());
        cat = categoryRepository.save(cat);
        return new ServiceCategoryDTO(cat);
    }

    @Transactional
    public ServiceCategoryDTO toggleCategoryActive(Long id) {
        ServiceCategory cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        cat.setActive(!cat.isActive());
        cat = categoryRepository.save(cat);
        return new ServiceCategoryDTO(cat);
    }

    @Transactional
    public ServiceTypeDTO createType(Long categoryId, ServiceTypeDTO dto) {
        ServiceCategory cat = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));
        ServiceType type = new ServiceType(cat, dto.getName(), dto.getCode(), dto.getEstimatedHours(), dto.getBasePrice(), dto.getDescription());
        type = typeRepository.save(type);
        return new ServiceTypeDTO(type);
    }

    @Transactional
    public ServiceTypeDTO updateType(Long id, ServiceTypeDTO dto) {
        ServiceType type = typeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service type not found: " + id));
        if (dto.getName() != null) type.setName(dto.getName());
        if (dto.getCode() != null) type.setCode(dto.getCode());
        if (dto.getEstimatedHours() != null) type.setEstimatedHours(dto.getEstimatedHours());
        if (dto.getBasePrice() != null) type.setBasePrice(dto.getBasePrice());
        if (dto.getDescription() != null) type.setDescription(dto.getDescription());
        type = typeRepository.save(type);
        return new ServiceTypeDTO(type);
    }

    @Transactional
    public ServiceTypeDTO toggleTypeActive(Long id) {
        ServiceType type = typeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service type not found: " + id));
        type.setActive(!type.isActive());
        type = typeRepository.save(type);
        return new ServiceTypeDTO(type);
    }
}
