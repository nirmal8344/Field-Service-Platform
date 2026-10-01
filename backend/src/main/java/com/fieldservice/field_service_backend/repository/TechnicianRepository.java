package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.Skill;
import com.fieldservice.field_service_backend.model.Technician;
import com.fieldservice.field_service_backend.model.TechnicianAvailability;
import com.fieldservice.field_service_backend.model.TechnicianStatus;
import com.fieldservice.field_service_backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TechnicianRepository extends JpaRepository<Technician, Long> {
    Optional<Technician> findByUser(User user);
    Optional<Technician> findByUserId(Long userId);
    Optional<Technician> findByUserEmail(String email);
    Optional<Technician> findByEmployeeCode(String employeeCode);
    List<Technician> findByStatus(TechnicianStatus status);
    List<Technician> findByAvailabilityAndStatus(TechnicianAvailability availability, TechnicianStatus status);

    @Query("SELECT t FROM Technician t JOIN t.skills s WHERE s = :skill AND t.status = 'ACTIVE'")
    List<Technician> findActiveBySkill(@Param("skill") Skill skill);
}
