package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.dto.CustomerDTO;
import com.fieldservice.field_service_backend.dto.CustomerProfileUpdateRequest;
import com.fieldservice.field_service_backend.dto.ServiceLocationDTO;
import com.fieldservice.field_service_backend.exception.ResourceNotFoundException;
import com.fieldservice.field_service_backend.model.Customer;
import com.fieldservice.field_service_backend.model.User;
import com.fieldservice.field_service_backend.repository.CustomerRepository;
import com.fieldservice.field_service_backend.repository.ServiceLocationRepository;
import com.fieldservice.field_service_backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final ServiceLocationRepository serviceLocationRepository;
    private final AuditLogService auditLogService;

    public CustomerService(CustomerRepository customerRepository,
                           UserRepository userRepository,
                           ServiceLocationRepository serviceLocationRepository,
                           AuditLogService auditLogService) {
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.serviceLocationRepository = serviceLocationRepository;
        this.auditLogService = auditLogService;
    }

    public List<CustomerDTO> getAllCustomers() {
        return customerRepository.findAll().stream().map(c -> {
            CustomerDTO dto = new CustomerDTO(c);
            List<ServiceLocationDTO> locs = serviceLocationRepository.findByCustomerId(c.getId()).stream()
                    .map(ServiceLocationDTO::new)
                    .collect(Collectors.toList());
            dto.setLocations(locs);
            return dto;
        }).collect(Collectors.toList());
    }

    public CustomerDTO getCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        CustomerDTO dto = new CustomerDTO(customer);
        List<ServiceLocationDTO> locs = serviceLocationRepository.findByCustomerId(customer.getId()).stream()
                .map(ServiceLocationDTO::new)
                .collect(Collectors.toList());
        dto.setLocations(locs);
        return dto;
    }

    public CustomerDTO getCustomerByUserId(Long userId) {
        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found for user id: " + userId));
        CustomerDTO dto = new CustomerDTO(customer);
        List<ServiceLocationDTO> locs = serviceLocationRepository.findByCustomerId(customer.getId()).stream()
                .map(ServiceLocationDTO::new)
                .collect(Collectors.toList());
        dto.setLocations(locs);
        return dto;
    }

    @Transactional
    public CustomerDTO updateCustomerProfile(Long userId, CustomerProfileUpdateRequest req) {
        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found for user: " + userId));

        User user = customer.getUser();
        if (req.getFullName() != null && !req.getFullName().trim().isEmpty()) {
            user.setFullName(req.getFullName().trim());
        }
        if (req.getPhoneNumber() != null) {
            user.setPhoneNumber(req.getPhoneNumber().trim());
        }
        userRepository.save(user);

        if (req.getCompanyName() != null) customer.setCompanyName(req.getCompanyName());
        if (req.getCustomerType() != null) customer.setCustomerType(req.getCustomerType());
        if (req.getAlternatePhone() != null) customer.setAlternatePhone(req.getAlternatePhone());
        if (req.getNotes() != null) customer.setNotes(req.getNotes());
        customer = customerRepository.save(customer);

        auditLogService.log(user.getEmail(), user.getRole().name(), "CUSTOMER_PROFILE_UPDATED", "Customer", customer.getId().toString(), "Customer updated profile");

        return getCustomerById(customer.getId());
    }
}
