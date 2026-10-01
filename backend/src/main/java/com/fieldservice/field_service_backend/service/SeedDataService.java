package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.config.SecurityUtils;
import com.fieldservice.field_service_backend.dto.PartUsageDTO;
import com.fieldservice.field_service_backend.dto.WorkOrderActionDTO;
import com.fieldservice.field_service_backend.model.*;
import com.fieldservice.field_service_backend.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class SeedDataService implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final ServiceLocationRepository serviceLocationRepository;
    private final SkillRepository skillRepository;
    private final TechnicianRepository technicianRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final ServiceTypeRepository typeRepository;
    private final ServiceRequestRepository requestRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderHistoryRepository historyRepository;
    private final WorkOrderPhotoRepository photoRepository;
    private final PartRepository partRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final WorkOrderPartRepository workOrderPartRepository;
    private final CustomerFeedbackRepository feedbackRepository;
    private final InAppNotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;

    public SeedDataService(UserRepository userRepository,
                           CustomerRepository customerRepository,
                           ServiceLocationRepository serviceLocationRepository,
                           SkillRepository skillRepository,
                           TechnicianRepository technicianRepository,
                           ServiceCategoryRepository categoryRepository,
                           ServiceTypeRepository typeRepository,
                           ServiceRequestRepository requestRepository,
                           WorkOrderRepository workOrderRepository,
                           WorkOrderHistoryRepository historyRepository,
                           WorkOrderPhotoRepository photoRepository,
                           PartRepository partRepository,
                           InventoryTransactionRepository inventoryTransactionRepository,
                           WorkOrderPartRepository workOrderPartRepository,
                           CustomerFeedbackRepository feedbackRepository,
                           InAppNotificationRepository notificationRepository,
                           AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.serviceLocationRepository = serviceLocationRepository;
        this.skillRepository = skillRepository;
        this.technicianRepository = technicianRepository;
        this.categoryRepository = categoryRepository;
        this.typeRepository = typeRepository;
        this.requestRepository = requestRepository;
        this.workOrderRepository = workOrderRepository;
        this.historyRepository = historyRepository;
        this.photoRepository = photoRepository;
        this.partRepository = partRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
        this.workOrderPartRepository = workOrderPartRepository;
        this.feedbackRepository = feedbackRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @org.springframework.beans.factory.annotation.Value("${app.seed.enabled:false}")
    private boolean seedEnabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            System.out.println(">>> Seed data is disabled (app.seed.enabled=false). Skipping startup seed.");
            return;
        }

        // Ensure fixed Administrator demo account admin@fieldhub.com always exists with Admin@123
        userRepository.findByEmail("admin@fieldhub.com").ifPresentOrElse(
            adminUser -> {
                adminUser.setPassword(SecurityUtils.hashPassword("Admin@123"));
                adminUser.setRole(Role.ADMINISTRATOR);
                adminUser.setFullName("Administrator");
                userRepository.save(adminUser);
            },
            () -> {
                User adminFieldHub = new User("admin@fieldhub.com", SecurityUtils.hashPassword("Admin@123"), "Administrator", "+91 9876543210", Role.ADMINISTRATOR);
                userRepository.save(adminFieldHub);
            }
        );

        // Migrate and update all existing stored records to natural Tamil Nadu names
        updateExistingStoredData();

        if (userRepository.count() > 3) {
            System.out.println(">>> Database already initialized with seed data.");
            return;
        }

        System.out.println(">>> Initializing Field Service Platform Seed Data...");

        // 1. Admin & Dispatcher Users
        User admin = new User("admin@fieldservice.com", SecurityUtils.hashPassword("admin123"), "Senthil Nathan", "+91 9876543210", Role.ADMINISTRATOR);
        userRepository.save(admin);

        User dispatcher = new User("dispatcher@fieldservice.com", SecurityUtils.hashPassword("disp123"), "Deepa Jayaram", "+91 98400 11223", Role.DISPATCHER);
        userRepository.save(dispatcher);

        // 2. Skills
        Skill sAC = skillRepository.save(new Skill("AC Repair & Maintenance", "HVAC Diagnostics, Gas charging, Coil cleaning", "HVAC"));
        Skill sElec = skillRepository.save(new Skill("Electrical Engineering", "Wiring, Circuit breakers, Load testing", "Electrical"));
        Skill sCCTV = skillRepository.save(new Skill("CCTV & Surveillance", "IP camera configuration, DVR/NVR setup", "Security"));
        Skill sNet = skillRepository.save(new Skill("Networking & Fiber", "Router configuration, Structured cabling", "IT"));
        Skill sSolar = skillRepository.save(new Skill("Solar Inverters & Panels", "PV array installation and inverter repair", "Renewable"));
        Skill sPlumb = skillRepository.save(new Skill("Plumbing & Drainage", "Pipe fittings, Pressure pumps, Leak detection", "Plumbing"));
        Skill sCarp = skillRepository.save(new Skill("Carpentry & Furniture", "Cabinetry, Lock replacement, Wood fittings", "General"));
        Skill sPaint = skillRepository.save(new Skill("Painting & Waterproofing", "Wall treatments, Sealing, Anti-damp coatings", "General"));

        // 3. Technicians (Tamil Nadu technician fleet including Srinath)
        Technician tech1 = createTechnician("karthik.rajan@fieldservice.com", "Karthik Rajan", "+91 98401 22334", "TECH-101", "HVAC & Electrical", 8, 4.9, 42, Set.of(sAC, sElec));
        Technician tech2 = createTechnician("suresh.raman@fieldservice.com", "Suresh Raman", "+91 98402 33445", "TECH-102", "Solar & Electrical", 6, 4.8, 38, Set.of(sSolar, sElec));
        Technician tech3 = createTechnician("saravanan.n@fieldservice.com", "Saravanan Natarajan", "+91 98403 44556", "TECH-103", "IT & Security Systems", 4, 4.7, 29, Set.of(sCCTV, sNet));
        Technician tech4 = createTechnician("dinesh.kumar@fieldservice.com", "Dinesh Kumar", "+91 98404 55667", "TECH-104", "Plumbing & Mechanical", 5, 4.9, 35, Set.of(sPlumb));
        Technician tech5 = createTechnician("praveen.c@fieldservice.com", "Praveen Chandran", "+91 98405 66778", "TECH-105", "HVAC & Appliances", 3, 5.0, 18, Set.of(sAC, sElec));
        Technician tech6 = createTechnician("srinath123@gmail.com", "Srinath", "+91 98406 77889", "TECH-106", "Electrical & HVAC", 4, 4.9, 15, Set.of(sElec, sAC));

        // 4. Service Categories & Types
        ServiceCategory catAC = categoryRepository.save(new ServiceCategory("AC Repair", "AC_REPAIR", "Wind", "AC servicing, deep cleaning, gas recharge, and compressor fixes"));
        typeRepository.save(new ServiceType(catAC, "AC Jet Pump Deep Cleaning", "AC_CLEAN", 1.5, 599.0, "Complete indoor and outdoor pressure pump washing"));
        typeRepository.save(new ServiceType(catAC, "Refrigerant Gas Refill", "AC_GAS", 2.0, 2499.0, "Leak testing with pure R32/R410A gas top-up"));
        typeRepository.save(new ServiceType(catAC, "PCB Circuit Board Repair", "AC_PCB", 3.0, 1850.0, "Inverter inverter board diagnosis and component replacement"));

        ServiceCategory catElec = categoryRepository.save(new ServiceCategory("Electrical", "ELECTRICAL", "Zap", "Wiring, switchboards, MCB repair, and lighting installation"));
        typeRepository.save(new ServiceType(catElec, "MCB & Distribution Box Fix", "ELEC_MCB", 1.0, 450.0, "Tripping issue resolution and heavy MCB replacement"));
        typeRepository.save(new ServiceType(catElec, "Complete House Wiring Inspection", "ELEC_INSPECT", 2.5, 1200.0, "Load balancing and earthing check"));

        ServiceCategory catCCTV = categoryRepository.save(new ServiceCategory("CCTV & Security", "CCTV", "Shield", "Surveillance camera setup, mobile streaming, and storage maintenance"));
        typeRepository.save(new ServiceType(catCCTV, "4-Camera IP CCTV Installation", "CCTV_INSTALL", 4.0, 3200.0, "Full cabling, POE switch setup, and mobile live viewing"));
        typeRepository.save(new ServiceType(catCCTV, "CCTV Signal & Storage Repair", "CCTV_REPAIR", 1.5, 800.0, "Hard disk recovery, connector soldering, and power supply check"));

        ServiceCategory catSolar = categoryRepository.save(new ServiceCategory("Solar Services", "SOLAR", "Sun", "Rooftop solar panels, inverter servicing, and solar battery testing"));
        typeRepository.save(new ServiceType(catSolar, "Solar Inverter Maintenance", "SOLAR_INV", 2.0, 1500.0, "Efficiency testing and error code resolution"));

        ServiceCategory catPlumb = categoryRepository.save(new ServiceCategory("Plumbing", "PLUMBING", "Wrench", "Pipe leakages, pressure pumps, bathroom fittings, and drain clearance"));
        typeRepository.save(new ServiceType(catPlumb, "Underground Pipe Leak Repair", "PLUMB_LEAK", 2.0, 950.0, "Precision acoustic leak detection and pipe replacement"));

        ServiceCategory catCarp = categoryRepository.save(new ServiceCategory("Carpentry", "CARPENTRY", "Hammer", "Furniture assembly, door locks, hinges, and woodwork"));
        typeRepository.save(new ServiceType(catCarp, "Smart Digital Lock Installation", "CARP_LOCK", 1.5, 850.0, "Fitting smart fingerprint & card locks"));

        ServiceCategory catNet = categoryRepository.save(new ServiceCategory("Networking", "NETWORKING", "Cpu", "WiFi access points, mesh networks, and fiber ONT setup"));
        typeRepository.save(new ServiceType(catNet, "Commercial WiFi Mesh Setup", "NET_MESH", 3.0, 2200.0, "Seamless roaming setup for offices and large homes"));

        // 5. Parts & Inventory
        createPart("1.5 Ton AC Capacitor 45uF", "HVAC", "CAP-AC-45", 28, 5, "pcs", 320.0, "Carrier Parts Hub", "Shelf A-1");
        createPart("R32 Eco Refrigerant Gas (10kg)", "HVAC", "GAS-R32-10", 12, 3, "cylinders", 4200.0, "Fluorochem Dist.", "Warehouse Gas Bay");
        createPart("Siemens 32A Double Pole MCB", "Electrical", "MCB-SIE-32", 45, 10, "pcs", 450.0, "Siemens Direct", "Rack E-3");
        createPart("Cat6 Pure Copper Cable 305m", "Networking", "CAB-CAT6-305", 8, 2, "boxes", 7800.0, "D-Link Supply", "Bay N-1");
        createPart("Hikvision 4MP IP Dome Camera", "Security", "CAM-HIK-4MP", 15, 4, "pcs", 2850.0, "Hikvision India", "Secure Vault 2");
        createPart("Brass Heavy Ball Valve 1/2\"", "Plumbing", "VAL-BRASS-05", 35, 8, "pcs", 240.0, "Jaguar Spares", "Bin P-4");
        createPart("Solar DC MC4 Connector Pairs", "Solar", "CON-MC4-PAIR", 3, 10, "sets", 120.0, "Luminous Tech", "Bin S-1");

        // 6. Customers & Locations (4 natural Tamil Nadu customers)
        User custUser1 = new User("anand.murugan@gmail.com", SecurityUtils.hashPassword("customer123"), "Anand Murugan", "+91 98411 55667", Role.CUSTOMER);
        userRepository.save(custUser1);
        Customer cust1 = customerRepository.save(new Customer(custUser1, "Murugan Agencies", "COMMERCIAL", "+91 98411 55667", "Priority Commercial Client"));

        ServiceLocation loc1 = createLocation(cust1, "Headquarters & Residence", "No. 42, 2nd Avenue", "Anna Nagar", "Chennai", "Tamil Nadu", "600040", "Anand Murugan", "+91 98411 55667", LocationType.RESIDENTIAL, true);
        ServiceLocation loc2 = createLocation(cust1, "Commercial Unit", "Module 403, Tidel Park", "Taramani", "Chennai", "Tamil Nadu", "600113", "Senthil Kumar", "+91 98411 55688", LocationType.COMMERCIAL, false);

        User custUser2 = new User("meenakshi.s@enterprise.com", SecurityUtils.hashPassword("customer123"), "Meenakshi Sundaram", "+91 98412 66778", Role.CUSTOMER);
        userRepository.save(custUser2);
        Customer cust2 = customerRepository.save(new Customer(custUser2, "Sundaram Tech Solutions", "COMMERCIAL", null, "Standard Corporate Client"));
        ServiceLocation loc3 = createLocation(cust2, "Corporate Office", "Building 5B, Whites Road", "Royapettah", "Chennai", "Tamil Nadu", "600014", "Meenakshi Sundaram", "+91 98412 66778", LocationType.OFFICE, true);

        User custUser3 = new User("venkatesh.r@gmail.com", SecurityUtils.hashPassword("customer123"), "Venkatesh Raghavan", "+91 98413 77889", Role.CUSTOMER);
        userRepository.save(custUser3);
        Customer cust3 = customerRepository.save(new Customer(custUser3, "Raghavan Enterprises", "RESIDENTIAL", "+91 98413 77889", "Residential Client"));
        ServiceLocation loc4 = createLocation(cust3, "Main Residence", "No. 18, Cross Cut Road", "Gandhipuram", "Coimbatore", "Tamil Nadu", "641012", "Venkatesh Raghavan", "+91 98413 77889", LocationType.RESIDENTIAL, true);

        User custUser4 = new User("kavitha.selvam@gmail.com", SecurityUtils.hashPassword("customer123"), "Kavitha Selvam", "+91 98414 88990", Role.CUSTOMER);
        userRepository.save(custUser4);
        Customer cust4 = customerRepository.save(new Customer(custUser4, "Selvam Retail Stores", "COMMERCIAL", "+91 98414 88990", "Commercial Retail Client"));
        ServiceLocation loc5 = createLocation(cust4, "Retail Outlet", "No. 76, DB Road", "RS Puram", "Coimbatore", "Tamil Nadu", "641002", "Kavitha Selvam", "+91 98414 88990", LocationType.COMMERCIAL, true);

        // 7. Realistic Sample Service Requests & Work Orders
        // WO 1: In Progress with Karthik Rajan
        ServiceRequest req1 = createRequest(cust1, loc1, catAC, "Split AC in master bedroom is not cooling. Ice forming on indoor coil.", Priority.HIGH, LocalDate.now(), "09:00 AM - 12:00 PM");
        WorkOrder wo1 = createWorkOrderRecord("WO-20260929-1001", req1, cust1, loc1, catAC, "Master Bedroom Split AC Not Cooling", req1.getProblemDescription(), Priority.HIGH,
                LocalDate.now(), LocalTime.of(9, 30), LocalTime.of(11, 30), tech1, dispatcher, WorkOrderStatus.IN_PROGRESS);
        wo1.setStartedAt(LocalDateTime.now().minusHours(1));
        workOrderRepository.save(wo1);
        recordHistory(wo1, WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, tech1.getUser().getEmail(), "Started coil inspection and pressure diagnosis");

        // WO 2: Completed & Customer Verified
        ServiceRequest req2 = createRequest(cust1, loc2, catCCTV, "Camera #3 in server room is offline. Need immediate inspection.", Priority.CRITICAL, LocalDate.now().minusDays(1), "02:00 PM - 04:00 PM");
        WorkOrder wo2 = createWorkOrderRecord("WO-20260928-1002", req2, cust1, loc2, catCCTV, "Server Room CCTV Camera Offline", req2.getProblemDescription(), Priority.CRITICAL,
                LocalDate.now().minusDays(1), LocalTime.of(14, 0), LocalTime.of(15, 30), tech3, dispatcher, WorkOrderStatus.CLOSED);
        wo2.setStartedAt(LocalDateTime.now().minusDays(1).withHour(14).withMinute(0));
        wo2.setCompletedAt(LocalDateTime.now().minusDays(1).withHour(15).withMinute(15));
        wo2.setVerifiedAt(LocalDateTime.now().minusDays(1).withHour(16).withMinute(0));
        wo2.setClosedAt(LocalDateTime.now().minusDays(1).withHour(16).withMinute(0));
        wo2.setWorkPerformed("Replaced faulty RJ45 keystone jack and power injector. Reconfigured camera IP on NVR.");
        wo2.setTotalAmount(1450.0);
        wo2.setAmountPaid(1450.0);
        workOrderRepository.save(wo2);

        // Feedback for WO2
        CustomerFeedback fb = new CustomerFeedback(wo2, cust1, 5, "Extremely fast service! Camera was restored in less than an hour.", "EXCELLENT");
        feedbackRepository.save(fb);

        // WO 3: Scheduled / Upcoming for Suresh Raman
        ServiceRequest req3 = createRequest(cust2, loc3, catSolar, "Quarterly solar inverter inspection and generation report.", Priority.MEDIUM, LocalDate.now().plusDays(1), "10:00 AM - 01:00 PM");
        WorkOrder wo3 = createWorkOrderRecord("WO-20260930-1003", req3, cust2, loc3, catSolar, "Solar Inverter Quarterly Maintenance", req3.getProblemDescription(), Priority.MEDIUM,
                LocalDate.now().plusDays(1), LocalTime.of(10, 0), LocalTime.of(12, 30), tech2, dispatcher, WorkOrderStatus.ASSIGNED);

        // WO 4: Pending / Requested for Dispatcher Dashboard
        ServiceRequest req4 = createRequest(cust1, loc1, catElec, "Main MCB tripping frequently whenever water heater is switched on.", Priority.HIGH, LocalDate.now().plusDays(1), "03:00 PM - 06:00 PM");

        // 8. Notifications
        notificationRepository.save(new InAppNotification(custUser1, "Welcome to FieldHub", "You can now book certified technicians and track work orders in real-time.", NotificationType.SYSTEM, "/customer/dashboard"));
        notificationRepository.save(new InAppNotification(tech1.getUser(), "New Work Order Assigned", "You have been assigned to WO-20260929-1001 at Anna Nagar, Chennai.", NotificationType.ASSIGNMENT, "/technician/jobs"));
        notificationRepository.save(new InAppNotification(admin, "Low Stock Alert: MC4 Connectors", "Stock for Solar DC MC4 Connector Pairs is below threshold (3 remaining).", NotificationType.LOW_STOCK, "/admin/inventory"));

        // 9. Initial Audit Log
        auditLogRepository.save(new AuditLog("admin@fieldservice.com", "ADMINISTRATOR", "SYSTEM_BOOTSTRAP", "System", "1", "Initialized database with default roles, service catalog, and seed data", "127.0.0.1"));

        System.out.println(">>> Seed Data successfully initialized!");
    }

    private void updateExistingStoredData() {
        System.out.println(">>> Checking and migrating stored database records to natural Tamil Nadu names...");

        // 1. Update Users (name, email, phone)
        List<User> allUsers = userRepository.findAll();
        for (User u : allUsers) {
            String email = u.getEmail() != null ? u.getEmail().toLowerCase() : "";
            String name = u.getFullName() != null ? u.getFullName() : "";

            if (email.contains("john.samuel") || name.equalsIgnoreCase("John Samuel")) {
                u.setFullName("Karthik Rajan");
                u.setEmail("karthik.rajan@fieldservice.com");
                u.setPhoneNumber("+91 98401 22334");
                userRepository.save(u);
            } else if (email.contains("vikram.singh") || name.equalsIgnoreCase("Vikram Singh")) {
                u.setFullName("Suresh Raman");
                u.setEmail("suresh.raman@fieldservice.com");
                u.setPhoneNumber("+91 98402 33445");
                userRepository.save(u);
            } else if (email.contains("rahul.sharma") || name.equalsIgnoreCase("Rahul Sharma")) {
                u.setFullName("Saravanan Natarajan");
                u.setEmail("saravanan.n@fieldservice.com");
                u.setPhoneNumber("+91 98403 44556");
                userRepository.save(u);
            } else if (email.contains("amit.kumar") || name.equalsIgnoreCase("Amit Kumar")) {
                u.setFullName("Dinesh Kumar");
                u.setEmail("dinesh.kumar@fieldservice.com");
                u.setPhoneNumber("+91 98404 55667");
                userRepository.save(u);
            } else if (email.contains("priya.patel") || name.equalsIgnoreCase("Priya Patel")) {
                u.setFullName("Praveen Chandran");
                u.setEmail("praveen.c@fieldservice.com");
                u.setPhoneNumber("+91 98405 66778");
                userRepository.save(u);
            } else if (email.contains("dispatcher") || name.contains("Sarah")) {
                u.setFullName("Deepa Jayaram");
                u.setEmail("dispatcher@fieldservice.com");
                u.setPhoneNumber("+91 98400 11223");
                userRepository.save(u);
            } else if (email.contains("arun.varma") || name.equalsIgnoreCase("Arun Varma")) {
                u.setFullName("Anand Murugan");
                u.setEmail("anand.murugan@gmail.com");
                u.setPhoneNumber("+91 98411 55667");
                userRepository.save(u);
            } else if (email.contains("neha.gupta") || name.equalsIgnoreCase("Neha Gupta")) {
                u.setFullName("Meenakshi Sundaram");
                u.setEmail("meenakshi.s@enterprise.com");
                u.setPhoneNumber("+91 98412 66778");
                userRepository.save(u);
            } else if (email.equalsIgnoreCase("admin@fieldservice.com") || name.equalsIgnoreCase("System Administrator")) {
                u.setFullName("Senthil Nathan");
                userRepository.save(u);
            }
            // Clean up test/junk accounts created through registration flow
            else if (name.startsWith("Test Customer") || name.startsWith("Test Public") || name.equals("Lakshmi Devi")) {
                String[] testNames = {"Lakshmi Devi", "Bharathi Kannan", "Sathya Priya", "Mahalakshmi S"};
                int idx = Math.abs(email.hashCode()) % testNames.length;
                u.setFullName(testNames[idx]);
                u.setPhoneNumber("+91 98415 9900" + (idx + 1));
                userRepository.save(u);
            } else if (name.equals("New Staff Technician")) {
                u.setFullName("Bala Murugan");
                u.setPhoneNumber("+91 98416 00112");
                userRepository.save(u);
            } else if (name.equals("Arun Individual")) {
                u.setFullName("Ramesh Babu");
                u.setPhoneNumber("+91 98417 11223");
                userRepository.save(u);
            } else if (name.equals("Arun Business")) {
                u.setFullName("Ganesan Pillai");
                u.setPhoneNumber("+91 98418 22334");
                userRepository.save(u);
            } else if (email.equalsIgnoreCase("srinath123@gmail.com") || name.equalsIgnoreCase("srinath")) {
                u.setFullName("Srinath");
                u.setEmail("srinath123@gmail.com");
                u.setRole(Role.TECHNICIAN);
                u.setPassword(SecurityUtils.hashPassword("tech123"));
                if (u.getPhoneNumber() == null || u.getPhoneNumber().isEmpty()) {
                    u.setPhoneNumber("+91 98406 77889");
                }
                userRepository.save(u);
            } else if (name.equals("Arun Organization")) {
                u.setFullName("Vijay Anand");
                u.setPhoneNumber("+91 98419 33445");
                userRepository.save(u);
            }
        }

        // 2. Update Customers & Companies
        List<Customer> customers = customerRepository.findAll();
        for (Customer c : customers) {
            if (c.getUser() != null) {
                if (c.getUser().getFullName().equalsIgnoreCase("Anand Murugan") || (c.getCompanyName() != null && c.getCompanyName().contains("Varma"))) {
                    c.setCompanyName("Murugan Agencies");
                    c.setNotes("Priority Commercial Client - Chennai");
                    c.setAlternatePhone("+91 98411 55667");
                    customerRepository.save(c);
                } else if (c.getUser().getFullName().equalsIgnoreCase("Meenakshi Sundaram") || (c.getCompanyName() != null && c.getCompanyName().contains("Apex"))) {
                    c.setCompanyName("Sundaram Tech Solutions");
                    c.setNotes("Corporate Client - Chennai");
                    c.setAlternatePhone("+91 98412 66778");
                    customerRepository.save(c);
                }
            }
        }

        // Add 2 more realistic Tamil Nadu customers if total customers is < 4
        if (customerRepository.count() < 4) {
            User custUser3 = userRepository.findByEmail("venkatesh.r@gmail.com").orElseGet(() -> {
                User u = new User("venkatesh.r@gmail.com", SecurityUtils.hashPassword("customer123"), "Venkatesh Raghavan", "+91 98413 77889", Role.CUSTOMER);
                return userRepository.save(u);
            });
            if (customerRepository.findByUser(custUser3).isEmpty()) {
                Customer cust3 = customerRepository.save(new Customer(custUser3, "Raghavan Enterprises", "RESIDENTIAL", "+91 98413 77889", "Residential Client - Coimbatore"));
                createLocation(cust3, "Main Residence", "No. 18, Cross Cut Road", "Gandhipuram", "Coimbatore", "Tamil Nadu", "641012", "Venkatesh Raghavan", "+91 98413 77889", LocationType.RESIDENTIAL, true);
            }

            User custUser4 = userRepository.findByEmail("kavitha.selvam@gmail.com").orElseGet(() -> {
                User u = new User("kavitha.selvam@gmail.com", SecurityUtils.hashPassword("customer123"), "Kavitha Selvam", "+91 98414 88990", Role.CUSTOMER);
                return userRepository.save(u);
            });
            if (customerRepository.findByUser(custUser4).isEmpty()) {
                Customer cust4 = customerRepository.save(new Customer(custUser4, "Selvam Retail Stores", "COMMERCIAL", "+91 98414 88990", "Commercial Retail Client - Coimbatore"));
                createLocation(cust4, "Retail Outlet", "No. 76, DB Road", "RS Puram", "Coimbatore", "Tamil Nadu", "641002", "Kavitha Selvam", "+91 98414 88990", LocationType.COMMERCIAL, true);
            }
        }

        // 3. Update Service Locations
        List<ServiceLocation> locations = serviceLocationRepository.findAll();
        for (ServiceLocation loc : locations) {
            String cp = loc.getContactPerson();
            if (cp != null) {
                if (cp.contains("Arun") || cp.contains("Varma")) {
                    loc.setContactPerson("Anand Murugan");
                    loc.setContactPhone("+91 98411 55667");
                } else if (cp.contains("Amitabh") || cp.contains("Sinha")) {
                    loc.setContactPerson("Senthil Kumar");
                    loc.setContactPhone("+91 98411 55688");
                } else if (cp.contains("Neha") || cp.contains("Gupta")) {
                    loc.setContactPerson("Meenakshi Sundaram");
                    loc.setContactPhone("+91 98412 66778");
                }
            }
            if (loc.getState() != null && !loc.getState().equalsIgnoreCase("Tamil Nadu")) {
                loc.setState("Tamil Nadu");
                if (loc.getCity() == null || loc.getCity().equalsIgnoreCase("Noida") || loc.getCity().equalsIgnoreCase("Gurgaon")) {
                    loc.setCity("Chennai");
                    loc.setArea("Anna Nagar");
                    loc.setPostalCode("600040");
                    loc.setAddress("No. 42, 2nd Avenue, Anna Nagar");
                }
            }
            serviceLocationRepository.save(loc);
        }

        // 4. Update Notifications
        List<InAppNotification> notifs = notificationRepository.findAll();
        for (InAppNotification n : notifs) {
            boolean changed = false;
            String msg = n.getMessage();
            String title = n.getTitle();
            if (msg != null && (msg.contains("John Samuel") || msg.contains("Sector 21 Noida") || msg.contains("Arun Varma") || msg.contains("Field Service Platform"))) {
                msg = msg.replace("John Samuel", "Karthik Rajan")
                         .replace("Sector 21 Noida", "Anna Nagar, Chennai")
                         .replace("Arun Varma", "Anand Murugan")
                         .replace("Field Service Platform", "FieldHub");
                n.setMessage(msg);
                changed = true;
            }
            if (title != null && (title.contains("John") || title.contains("Arun"))) {
                title = title.replace("John", "Karthik").replace("Arun", "Anand");
                n.setTitle(title);
                changed = true;
            }
            if (changed) notificationRepository.save(n);
        }

        // 5. Update Audit Logs
        List<AuditLog> auditLogs = auditLogRepository.findAll();
        for (AuditLog a : auditLogs) {
            boolean changed = false;
            if (a.getUserEmail() != null) {
                if (a.getUserEmail().contains("john.samuel")) { a.setUserEmail("karthik.rajan@fieldservice.com"); changed = true; }
                else if (a.getUserEmail().contains("arun.varma")) { a.setUserEmail("anand.murugan@gmail.com"); changed = true; }
                else if (a.getUserEmail().contains("neha.gupta")) { a.setUserEmail("meenakshi.s@enterprise.com"); changed = true; }
            }
            if (a.getDetails() != null) {
                String d = a.getDetails();
                if (d.contains("John Samuel") || d.contains("Arun Varma") || d.contains("Neha Gupta")) {
                    d = d.replace("John Samuel", "Karthik Rajan")
                         .replace("Arun Varma", "Anand Murugan")
                         .replace("Neha Gupta", "Meenakshi Sundaram");
                    a.setDetails(d);
                    changed = true;
                }
            }
            if (changed) auditLogRepository.save(a);
        }

        // 6. Update Work Order History
        List<WorkOrderHistory> histories = historyRepository.findAll();
        for (WorkOrderHistory h : histories) {
            if (h.getChangedBy() != null) {
                String cb = h.getChangedBy();
                if (cb.contains("john.samuel")) {
                    h.setChangedBy("karthik.rajan@fieldservice.com");
                    historyRepository.save(h);
                } else if (cb.contains("arun.varma")) {
                    h.setChangedBy("anand.murugan@gmail.com");
                    historyRepository.save(h);
                } else if (cb.contains("neha.gupta")) {
                    h.setChangedBy("meenakshi.s@enterprise.com");
                    historyRepository.save(h);
                }
            }
        }
        // 7. Ensure Srinath technician record exists and has an active Work Order
        userRepository.findByEmail("srinath123@gmail.com").ifPresent(srinathUser -> {
            Technician srinathTech = technicianRepository.findByUser(srinathUser).orElseGet(() -> {
                Technician t = new Technician(srinathUser, "TECH-106", "Electrical & HVAC", 4);
                t.setAverageRating(4.9);
                t.setCompletedJobsCount(15);
                t.setAvailability(TechnicianAvailability.AVAILABLE);
                t.setStatus(TechnicianStatus.ACTIVE);
                List<Skill> allSkills = skillRepository.findAll();
                if (!allSkills.isEmpty()) {
                    t.setSkills(new HashSet<>(allSkills.subList(0, Math.min(2, allSkills.size()))));
                }
                return technicianRepository.save(t);
            });

            // If Srinath has no work orders assigned, assign or create one for today
            List<WorkOrder> srinathWos = workOrderRepository.findByAssignedTechnicianId(srinathTech.getId());
            if (srinathWos.isEmpty()) {
                List<Customer> allCusts = customerRepository.findAll();
                List<ServiceCategory> allCats = categoryRepository.findAll();
                User dispUser = userRepository.findByEmail("dispatcher@fieldservice.com").orElse(null);
                if (!allCusts.isEmpty() && !allCats.isEmpty() && dispUser != null) {
                    Customer cust = allCusts.get(0);
                    ServiceCategory cat = allCats.get(0);
                    List<ServiceLocation> locs = serviceLocationRepository.findByCustomerId(cust.getId());
                    ServiceLocation loc = !locs.isEmpty() ? locs.get(0) : null;
                    if (loc != null) {
                        ServiceRequest req = createRequest(cust, loc, cat, "Main MCB tripping frequently whenever heavy load is applied. Scheduled for diagnosis & replacement.", Priority.HIGH, LocalDate.now(), "10:00 AM - 01:00 PM");
                        WorkOrder wo = createWorkOrderRecord("WO-20261001-2512", req, cust, loc, cat,
                                "Main Distribution Board & MCB Diagnostic", req.getProblemDescription(), Priority.HIGH,
                                LocalDate.now(), LocalTime.of(10, 0), LocalTime.of(12, 30), srinathTech, dispUser, WorkOrderStatus.ASSIGNED);
                        System.out.println(">>> Seeded demo Work Order WO-20261001-2512 for Srinath: " + wo.getId());
                    }
                }
            }
        });

        System.out.println(">>> Stored sample/demo data migration to natural Tamil Nadu names completed successfully.");
    }

    private Technician createTechnician(String email, String name, String phone, String code, String dept, int exp, double rating, int jobs, Set<Skill> skills) {
        User u = new User(email, SecurityUtils.hashPassword("tech123"), name, phone, Role.TECHNICIAN);
        u = userRepository.save(u);

        Technician t = new Technician(u, code, dept, exp);
        t.setAverageRating(rating);
        t.setCompletedJobsCount(jobs);
        t.setSkills(new HashSet<>(skills));
        t.setAvailability(TechnicianAvailability.AVAILABLE);
        t.setStatus(TechnicianStatus.ACTIVE);
        return technicianRepository.save(t);
    }

    private ServiceLocation createLocation(Customer cust, String name, String address, String area, String city, String state, String postal, String person, String phone, LocationType type, boolean def) {
        ServiceLocation loc = new ServiceLocation();
        loc.setCustomer(cust);
        loc.setLocationName(name);
        loc.setAddress(address);
        loc.setArea(area);
        loc.setCity(city);
        loc.setState(state);
        loc.setPostalCode(postal);
        loc.setContactPerson(person);
        loc.setContactPhone(phone);
        loc.setLocationType(type);
        loc.setDefaultLocation(def);
        loc.setActive(true);
        return serviceLocationRepository.save(loc);
    }

    private void createPart(String name, String cat, String sku, int qty, int min, String unit, double cost, String supplier, String location) {
        Part p = new Part(name, cat, sku, qty, min, unit, cost, supplier, location);
        p = partRepository.save(p);
        inventoryTransactionRepository.save(new InventoryTransaction(p, TransactionType.ADDED, qty, cost, "admin@fieldservice.com", null, "Initial Seed Stock"));
    }

    private ServiceRequest createRequest(Customer cust, ServiceLocation loc, ServiceCategory cat, String desc, Priority prio, LocalDate prefDate, String timeSlot) {
        ServiceRequest req = new ServiceRequest();
        req.setRequestNumber("REQ-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + (1000 + (int)(Math.random() * 9000)));
        req.setCustomer(cust);
        req.setServiceLocation(loc);
        req.setServiceCategory(cat);
        req.setProblemDescription(desc);
        req.setPriority(prio);
        req.setPreferredDate(prefDate);
        req.setPreferredTimeSlot(timeSlot);
        req.setStatus(RequestStatus.REQUESTED);
        req.setRequestDate(LocalDateTime.now());
        return requestRepository.save(req);
    }

    private WorkOrder createWorkOrderRecord(String woNumber, ServiceRequest req, Customer cust, ServiceLocation loc, ServiceCategory cat, String title, String desc, Priority prio, LocalDate date, LocalTime start, LocalTime end, Technician tech, User disp, WorkOrderStatus status) {
        WorkOrder wo = new WorkOrder();
        wo.setWorkOrderNumber(woNumber);
        wo.setServiceRequest(req);
        wo.setCustomer(cust);
        wo.setServiceLocation(loc);
        wo.setServiceCategory(cat);
        wo.setTitle(title);
        wo.setDescription(desc);
        wo.setPriority(prio);
        wo.setScheduledDate(date);
        wo.setScheduledStartTime(start);
        wo.setScheduledEndTime(end);
        wo.setAssignedTechnician(tech);
        wo.setDispatcher(disp);
        wo.setStatus(status);
        wo.setResponseDueTime(LocalDateTime.now().plusHours(4));
        wo.setResolutionDueTime(LocalDateTime.now().plusHours(12));
        wo.setSlaStatus(SlaStatus.WITHIN_SLA);
        wo = workOrderRepository.save(wo);

        recordHistory(wo, null, status, disp.getEmail(), "Created work order");
        return wo;
    }

    private void recordHistory(WorkOrder wo, WorkOrderStatus prev, WorkOrderStatus next, String changedBy, String reason) {
        WorkOrderHistory history = new WorkOrderHistory(wo, prev, next, changedBy, reason);
        historyRepository.save(history);
    }
}
