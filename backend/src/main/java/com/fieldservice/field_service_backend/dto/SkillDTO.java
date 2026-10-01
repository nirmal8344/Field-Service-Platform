package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.Skill;

public class SkillDTO {
    private Long id;
    private String name;
    private String description;
    private String category;

    public SkillDTO() {}

    public SkillDTO(Skill skill) {
        this.id = skill.getId();
        this.name = skill.getName();
        this.description = skill.getDescription();
        this.category = skill.getCategory();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
}
