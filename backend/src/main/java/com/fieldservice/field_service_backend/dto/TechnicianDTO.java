package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.Technician;
import com.fieldservice.field_service_backend.model.TechnicianAvailability;
import com.fieldservice.field_service_backend.model.TechnicianStatus;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

public class TechnicianDTO {
    private Long id;
    private Long userId;
    private String fullName;
    private String email;
    private String phone;
    private String employeeCode;
    private String department;
    private Integer experienceYears;
    private TechnicianAvailability availability;
    private TechnicianStatus status;
    private Set<SkillDTO> skills = new HashSet<>();
    private Set<Long> skillIds = new HashSet<>();
    private LocalDate joiningDate;
    private Integer currentWorkload;
    private Double averageRating;
    private Integer completedJobsCount;

    public TechnicianDTO() {}

    public TechnicianDTO(Technician tech) {
        this.id = tech.getId();
        if (tech.getUser() != null) {
            this.userId = tech.getUser().getId();
            this.fullName = tech.getUser().getFullName();
            this.email = tech.getUser().getEmail();
            this.phone = tech.getUser().getPhoneNumber();
        }
        this.employeeCode = tech.getEmployeeCode();
        this.department = tech.getDepartment();
        this.experienceYears = tech.getExperienceYears();
        this.availability = tech.getAvailability();
        this.status = tech.getStatus();
        if (tech.getSkills() != null) {
            this.skills = tech.getSkills().stream().map(SkillDTO::new).collect(Collectors.toSet());
            this.skillIds = tech.getSkills().stream().map(s -> s.getId()).collect(Collectors.toSet());
        }
        this.joiningDate = tech.getJoiningDate();
        this.currentWorkload = tech.getCurrentWorkload();
        this.averageRating = tech.getAverageRating();
        this.completedJobsCount = tech.getCompletedJobsCount();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Integer getExperienceYears() { return experienceYears; }
    public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }

    public TechnicianAvailability getAvailability() { return availability; }
    public void setAvailability(TechnicianAvailability availability) { this.availability = availability; }

    public TechnicianStatus getStatus() { return status; }
    public void setStatus(TechnicianStatus status) { this.status = status; }

    public Set<SkillDTO> getSkills() { return skills; }
    public void setSkills(Set<SkillDTO> skills) { this.skills = skills; }

    public Set<Long> getSkillIds() { return skillIds; }
    public void setSkillIds(Set<Long> skillIds) { this.skillIds = skillIds; }

    public LocalDate getJoiningDate() { return joiningDate; }
    public void setJoiningDate(LocalDate joiningDate) { this.joiningDate = joiningDate; }

    public Integer getCurrentWorkload() { return currentWorkload; }
    public void setCurrentWorkload(Integer currentWorkload) { this.currentWorkload = currentWorkload; }

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public Integer getCompletedJobsCount() { return completedJobsCount; }
    public void setCompletedJobsCount(Integer completedJobsCount) { this.completedJobsCount = completedJobsCount; }
}
