package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.config.SecurityUtils;
import com.fieldservice.field_service_backend.dto.TechnicianDTO;
import com.fieldservice.field_service_backend.dto.TechnicianStatusUpdateDTO;
import com.fieldservice.field_service_backend.exception.BadRequestException;
import com.fieldservice.field_service_backend.exception.ConflictException;
import com.fieldservice.field_service_backend.exception.ResourceNotFoundException;
import com.fieldservice.field_service_backend.model.*;
import com.fieldservice.field_service_backend.repository.SkillRepository;
import com.fieldservice.field_service_backend.repository.TechnicianRepository;
import com.fieldservice.field_service_backend.repository.UserRepository;
import com.fieldservice.field_service_backend.repository.WorkOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TechnicianService {

    private final TechnicianRepository technicianRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final WorkOrderRepository workOrderRepository;
    private final AuditLogService auditLogService;

    public TechnicianService(TechnicianRepository technicianRepository,
                             UserRepository userRepository,
                             SkillRepository skillRepository,
                             WorkOrderRepository workOrderRepository,
                             AuditLogService auditLogService) {
        this.technicianRepository = technicianRepository;
        this.userRepository = userRepository;
        this.skillRepository = skillRepository;
        this.workOrderRepository = workOrderRepository;
        this.auditLogService = auditLogService;
    }

    public List<TechnicianDTO> getAllTechnicians() {
        return technicianRepository.findAll().stream()
                .map(this::mapToDTOWithLiveWorkload)
                .collect(Collectors.toList());
    }

    public List<TechnicianDTO> getAvailableTechnicians() {
        return technicianRepository.findByAvailabilityAndStatus(TechnicianAvailability.AVAILABLE, TechnicianStatus.ACTIVE)
                .stream()
                .map(this::mapToDTOWithLiveWorkload)
                .collect(Collectors.toList());
    }

    public TechnicianDTO getTechnicianById(Long id) {
        Technician tech = technicianRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + id));
        return mapToDTOWithLiveWorkload(tech);
    }

    public TechnicianDTO getTechnicianByUserId(Long userId) {
        Technician tech = technicianRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
                    Technician t = new Technician();
                    t.setUser(user);
                    t.setEmployeeCode("TECH-" + (100 + user.getId()));
                    t.setDepartment("Field Services");
                    t.setExperienceYears(3);
                    t.setAvailability(TechnicianAvailability.AVAILABLE);
                    t.setStatus(TechnicianStatus.ACTIVE);
                    return technicianRepository.save(t);
                });
        return mapToDTOWithLiveWorkload(tech);
    }

    private TechnicianDTO mapToDTOWithLiveWorkload(Technician tech) {
        int activeJobs = workOrderRepository.countActiveJobsByTechnician(tech.getId());
        tech.setCurrentWorkload(activeJobs);
        return new TechnicianDTO(tech);
    }

    @Transactional
    public TechnicianDTO createTechnician(TechnicianDTO dto) {
        if (userRepository.existsByEmail(dto.getEmail().toLowerCase().trim())) {
            throw new ConflictException("Email already exists: " + dto.getEmail());
        }

        User user = new User();
        user.setEmail(dto.getEmail().toLowerCase().trim());
        user.setPassword(SecurityUtils.hashPassword("tech123")); // Default initial password
        user.setFullName(dto.getFullName());
        user.setPhoneNumber(dto.getPhone());
        user.setRole(Role.TECHNICIAN);
        user = userRepository.save(user);

        Technician tech = new Technician();
        tech.setUser(user);
        tech.setEmployeeCode(dto.getEmployeeCode() != null ? dto.getEmployeeCode() : "TECH-" + (System.currentTimeMillis() % 10000));
        tech.setDepartment(dto.getDepartment() != null ? dto.getDepartment() : "Field Services");
        tech.setExperienceYears(dto.getExperienceYears() != null ? dto.getExperienceYears() : 1);
        tech.setAvailability(dto.getAvailability() != null ? dto.getAvailability() : TechnicianAvailability.AVAILABLE);
        tech.setStatus(dto.getStatus() != null ? dto.getStatus() : TechnicianStatus.ACTIVE);

        if (dto.getSkillIds() != null && !dto.getSkillIds().isEmpty()) {
            Set<Skill> skills = new HashSet<>(skillRepository.findAllById(dto.getSkillIds()));
            tech.setSkills(skills);
        }

        tech = technicianRepository.save(tech);
        auditLogService.log(user.getEmail(), "ADMINISTRATOR", "TECHNICIAN_CREATED", "Technician", tech.getId().toString(), "Created technician: " + tech.getEmployeeCode());

        return mapToDTOWithLiveWorkload(tech);
    }

    @Transactional
    public TechnicianDTO updateTechnicianStatus(Long technicianId, TechnicianStatusUpdateDTO dto) {
        Technician tech = technicianRepository.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + technicianId));

        if (dto.getAvailability() != null) {
            tech.setAvailability(dto.getAvailability());
        }
        if (dto.getStatus() != null) {
            tech.setStatus(dto.getStatus());
        }

        tech = technicianRepository.save(tech);
        auditLogService.log(tech.getUser().getEmail(), "TECHNICIAN", "STATUS_UPDATED", "Technician", tech.getId().toString(), "Updated availability=" + tech.getAvailability() + ", status=" + tech.getStatus());

        return mapToDTOWithLiveWorkload(tech);
    }

    @Transactional
    public TechnicianDTO updateTechnician(Long technicianId, TechnicianDTO dto) {
        Technician tech = technicianRepository.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + technicianId));

        if (dto.getFullName() != null) tech.getUser().setFullName(dto.getFullName());
        if (dto.getPhone() != null) tech.getUser().setPhoneNumber(dto.getPhone());
        userRepository.save(tech.getUser());

        if (dto.getDepartment() != null) tech.setDepartment(dto.getDepartment());
        if (dto.getExperienceYears() != null) tech.setExperienceYears(dto.getExperienceYears());
        if (dto.getAvailability() != null) tech.setAvailability(dto.getAvailability());
        if (dto.getStatus() != null) tech.setStatus(dto.getStatus());

        if (dto.getSkillIds() != null) {
            Set<Skill> skills = new HashSet<>(skillRepository.findAllById(dto.getSkillIds()));
            tech.setSkills(skills);
        }

        tech = technicianRepository.save(tech);
        return mapToDTOWithLiveWorkload(tech);
    }
}
