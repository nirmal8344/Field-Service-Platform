package com.fieldservice.field_service_backend;

import com.fieldservice.field_service_backend.config.SecurityUtils;
import com.fieldservice.field_service_backend.dto.*;
import com.fieldservice.field_service_backend.exception.BadRequestException;
import com.fieldservice.field_service_backend.exception.ConflictException;
import com.fieldservice.field_service_backend.model.*;
import com.fieldservice.field_service_backend.repository.*;
import com.fieldservice.field_service_backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class FieldServiceIntegrationTests {

    @Autowired private UserRepository userRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private TechnicianRepository technicianRepository;
    @Autowired private SkillRepository skillRepository;
    @Autowired private ServiceCategoryRepository categoryRepository;
    @Autowired private ServiceLocationRepository locationRepository;
    @Autowired private WorkOrderRepository workOrderRepository;
    @Autowired private WorkOrderHistoryRepository historyRepository;
    @Autowired private PartRepository partRepository;
    @Autowired private InAppNotificationRepository notificationRepository;
    
    @Autowired private WorkOrderService workOrderService;
    @Autowired private NotificationService notificationService;
    @Autowired private AnalyticsService analyticsService;
    @Autowired private AuthService authService;
    @Autowired private StorageService storageService;

    // Helper to ensure test prerequisites exist
    private User ensureUser(String email, String name, Role role) {
        return ensureUserWithPassword(email, "Password123!", name, role);
    }

    private User ensureUserWithPassword(String email, String rawPassword, String name, Role role) {
        return userRepository.findByEmail(email).map(existing -> {
            existing.setFullName(name);
            existing.setRole(role);
            existing.setPassword(SecurityUtils.hashPassword(rawPassword));
            return userRepository.save(existing);
        }).orElseGet(() -> {
            User u = new User(email, SecurityUtils.hashPassword(rawPassword), name, "+91 9999988888", role);
            return userRepository.save(u);
        });
    }

    private ServiceCategory ensureCategory(String name, String code) {
        return categoryRepository.findAll().stream()
                .filter(c -> c.getCode() != null && c.getCode().equalsIgnoreCase(code))
                .findFirst()
                .orElseGet(() -> {
                    ServiceCategory cat = new ServiceCategory(name, code, "Tool", name + " services");
                    return categoryRepository.save(cat);
                });
    }

    private Customer ensureCustomer(String email, String name) {
        User u = ensureUser(email, name, Role.CUSTOMER);
        return customerRepository.findByUserId(u.getId()).orElseGet(() -> {
            Customer c = new Customer();
            c.setUser(u);
            c.setCustomerType("RESIDENTIAL");
            return customerRepository.save(c);
        });
    }

    private ServiceLocation ensureLocation(Customer customer) {
        List<ServiceLocation> locs = locationRepository.findByCustomerId(customer.getId());
        if (!locs.isEmpty()) return locs.get(0);
        ServiceLocation loc = new ServiceLocation();
        loc.setCustomer(customer);
        loc.setLocationName("Main Office");
        loc.setAddress("123 Tech Park");
        loc.setCity("Chennai");
        loc.setState("Tamil Nadu");
        loc.setPostalCode("600001");
        loc.setContactPerson(customer.getUser().getFullName());
        loc.setContactPhone(customer.getUser().getPhoneNumber());
        loc.setLocationType(LocationType.COMMERCIAL);
        loc.setDefaultLocation(true);
        loc.setActive(true);
        return locationRepository.save(loc);
    }

    private Technician ensureTechnician(String email, String name, String dept, ServiceCategory cat) {
        User u = ensureUser(email, name, Role.TECHNICIAN);
        return technicianRepository.findByUserId(u.getId()).orElseGet(() -> {
            Technician t = new Technician();
            t.setUser(u);
            t.setEmployeeCode("TECH-" + (1000 + (int)(Math.random() * 9000)));
            t.setDepartment(dept);
            t.setExperienceYears(5);
            t.setAverageRating(4.9);
            t.setCompletedJobsCount(10);
            t.setAvailability(TechnicianAvailability.AVAILABLE);
            t.setStatus(TechnicianStatus.ACTIVE);
            
            if (cat != null) {
                Skill skill = skillRepository.findByName(cat.getName()).orElseGet(() ->
                        skillRepository.save(new Skill(cat.getName(), cat.getName() + " Skill", dept)));
                t.setSkills(new HashSet<>(Collections.singletonList(skill)));
            }
            return technicianRepository.save(t);
        });
    }

    // ======================== 1. SECURITY & PASSWORD TESTS ========================

    @Test
    @Order(1)
    void testPasswordHashingBCrypt() {
        String raw = "SecurePass123!";
        String hash = SecurityUtils.hashPassword(raw);
        assertNotNull(hash);
        assertTrue(hash.startsWith("$2a$") || hash.startsWith("$2b$"), "Password must use BCrypt hash");
        assertTrue(SecurityUtils.checkPassword(raw, hash), "Correct password must verify with BCrypt");
        assertFalse(SecurityUtils.checkPassword("WrongPass", hash), "Incorrect password must fail");
        assertFalse(SecurityUtils.checkPassword(raw, "non-bcrypt-legacy-hash"), "Legacy non-BCrypt hashes must be rejected");
        assertFalse(SecurityUtils.checkPassword(raw, "dGhpcyBpcyBhIHNoYTI1NiBoYXNo"), "Base64 SHA256 hashes must be rejected");
    }

    @Test
    @Order(2)
    void testTokenGenerationAndParsing() {
        String token = SecurityUtils.generateToken(1L, "admin@fieldservice.com", "ADMINISTRATOR");
        assertNotNull(token);
        assertFalse(token.isEmpty());

        String[] parsed = SecurityUtils.parseToken(token);
        assertNotNull(parsed);
        assertEquals("1", parsed[0]);
        assertEquals("admin@fieldservice.com", parsed[1]);
        assertEquals("ADMINISTRATOR", parsed[2]);
    }

    @Test
    @Order(3)
    void testTamperedTokenRejected() {
        String token = SecurityUtils.generateToken(1L, "admin@fieldservice.com", "ADMINISTRATOR");
        String tampered = token.substring(0, token.length() - 2) + "XX";
        String[] parsed = SecurityUtils.parseToken(tampered);
        assertNull(parsed, "Tampered token signature must be rejected");
    }

    @Test
    @Order(4)
    void testAuthServiceLoginSuccessAndFailure() {
        ensureUser("testauth@fieldservice.com", "Auth Test User", Role.CUSTOMER);
        
        LoginRequest req = new LoginRequest();
        req.setEmail("testauth@fieldservice.com");
        req.setPassword("Password123!");
        AuthResponse resp = authService.login(req);
        assertNotNull(resp);
        assertNotNull(resp.getToken());
        assertEquals("testauth@fieldservice.com", resp.getUser().getEmail());

        LoginRequest badReq = new LoginRequest();
        badReq.setEmail("testauth@fieldservice.com");
        badReq.setPassword("WrongPassword!");
        assertThrows(Exception.class, () -> authService.login(badReq));
    }

    @Test
    @Order(5)
    @Transactional
    void testDemoAccountsAuthentication() {
        // 1. Administrator Account
        ensureUserWithPassword("administrator@fieldhub.com", "FieldHub@Admin2026", "System Administrator", Role.ADMINISTRATOR);
        LoginRequest adminReq = new LoginRequest();
        adminReq.setEmail("administrator@fieldhub.com");
        adminReq.setPassword("FieldHub@Admin2026");
        AuthResponse adminResp = authService.login(adminReq);
        assertNotNull(adminResp);
        assertNotNull(adminResp.getToken());
        assertEquals(Role.ADMINISTRATOR, adminResp.getUser().getRole());

        // 2. Dispatcher Account
        ensureUserWithPassword("dispatcher.demo@fieldhub.com", "FieldHub@Dispatcher2026", "Demo Dispatcher", Role.DISPATCHER);
        LoginRequest dispReq = new LoginRequest();
        dispReq.setEmail("dispatcher.demo@fieldhub.com");
        dispReq.setPassword("FieldHub@Dispatcher2026");
        AuthResponse dispResp = authService.login(dispReq);
        assertNotNull(dispResp);
        assertEquals(Role.DISPATCHER, dispResp.getUser().getRole());

        // 3. Technician Account
        User techUser = ensureUserWithPassword("technician.demo@fieldhub.com", "FieldHub@Tech2026", "Demo Technician", Role.TECHNICIAN);
        technicianRepository.findByUserId(techUser.getId()).orElseGet(() -> {
            Technician t = new Technician(techUser, "TECH-DEMO", "HVAC & Electrical", 5);
            return technicianRepository.save(t);
        });
        LoginRequest techReq = new LoginRequest();
        techReq.setEmail("technician.demo@fieldhub.com");
        techReq.setPassword("FieldHub@Tech2026");
        AuthResponse techResp = authService.login(techReq);
        assertNotNull(techResp);
        assertEquals(Role.TECHNICIAN, techResp.getUser().getRole());
    }

    // ======================== 2. PHOTO UPLOAD & STORAGE TESTS ========================

    @Test
    @Order(10)
    void testStorageServiceMultipartUpload() {
        byte[] content = "fake-image-binary-data-for-testing".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "test_photo.jpg", "image/jpeg", content);

        String storedUrl = storageService.storeFile(file);
        assertNotNull(storedUrl);
        assertTrue(storedUrl.startsWith("/api/upload/files/"), "Stored URL must follow file upload path convention");

        String filename = storedUrl.replace("/api/upload/files/", "");
        byte[] loaded = storageService.loadFile(filename);
        assertArrayEquals(content, loaded, "Loaded file bytes must match stored bytes");
    }

    @Test
    @Order(11)
    void testStorageServiceRejectsEmptyFileAndInvalidType() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);
        assertThrows(BadRequestException.class, () -> storageService.storeFile(emptyFile));

        MockMultipartFile invalidType = new MockMultipartFile("file", "script.sh", "application/x-sh", "echo 1".getBytes());
        assertThrows(BadRequestException.class, () -> storageService.storeFile(invalidType));
    }

    // ======================== 3. WORK ORDER LIFECYCLE TESTS ========================

    @Test
    @Order(20)
    @Transactional
    void testCompleteWorkOrderLifecycle() {
        ServiceCategory cat = ensureCategory("HVAC Clean", "HVAC_CLN");
        Customer cust = ensureCustomer("cust_lifecycle@test.com", "Lifecycle Customer");
        ServiceLocation loc = ensureLocation(cust);
        Technician tech = ensureTechnician("tech_lifecycle@test.com", "Lifecycle Tech", "HVAC", cat);
        User disp = ensureUser("disp_lifecycle@test.com", "Lifecycle Dispatcher", Role.DISPATCHER);

        // 1. Create Work Order
        CreateWorkOrderDTO createDto = new CreateWorkOrderDTO();
        createDto.setCustomerId(cust.getId());
        createDto.setServiceLocationId(loc.getId());
        createDto.setCategoryId(cat.getId());
        createDto.setTitle("AC Deep Maintenance");
        createDto.setDescription("Unit requires coil wash");
        createDto.setPriority(Priority.HIGH);
        createDto.setScheduledDate(LocalDate.now().plusDays(2));
        createDto.setScheduledStartTime(LocalTime.of(10, 0));
        createDto.setScheduledEndTime(LocalTime.of(12, 0));
        createDto.setTechnicianId(tech.getId());

        WorkOrderDTO createdWo = workOrderService.createWorkOrder(createDto, disp.getEmail());
        assertNotNull(createdWo);
        assertEquals(WorkOrderStatus.ASSIGNED, createdWo.getStatus());
        assertEquals(tech.getId(), createdWo.getAssignedTechnicianId());

        // 2. Accept
        WorkOrderDTO accepted = workOrderService.acceptWorkOrder(createdWo.getId(), tech.getUser().getEmail());
        assertEquals(WorkOrderStatus.ACCEPTED, accepted.getStatus());

        // 3. Start Work
        WorkOrderDTO started = workOrderService.startWork(createdWo.getId(), tech.getUser().getEmail());
        assertEquals(WorkOrderStatus.IN_PROGRESS, started.getStatus());

        // 4. Upload Categorized Photos using valid stored files
        MockMultipartFile beforeFile = new MockMultipartFile("file", "before.jpg", "image/jpeg", "before-image-bytes".getBytes());
        String storedBeforeUrl = storageService.storeFile(beforeFile);

        WorkOrderPhotoDTO beforePhoto = workOrderService.uploadWorkOrderPhoto(
                createdWo.getId(),
                storedBeforeUrl,
                PhotoCategory.BEFORE,
                "Before cleaning",
                tech.getUser().getEmail()
        );
        assertNotNull(beforePhoto);
        assertEquals(PhotoCategory.BEFORE, beforePhoto.getPhotoCategory());

        // Arbitrary unverified URLs must be rejected
        assertThrows(BadRequestException.class, () ->
                workOrderService.uploadWorkOrderPhoto(
                        createdWo.getId(),
                        "https://arbitrary-malicious-site.com/fake.jpg",
                        PhotoCategory.BEFORE,
                        "Hacked URL",
                        tech.getUser().getEmail()
                ));

        // 5. Complete Work Order
        MockMultipartFile afterFile = new MockMultipartFile("file", "after.jpg", "image/jpeg", "after-image-bytes".getBytes());
        String storedAfterUrl = storageService.storeFile(afterFile);

        WorkOrderActionDTO completeDto = new WorkOrderActionDTO();
        completeDto.setWorkPerformed("Cleaned condenser coils and refilled gas");
        completeDto.setNotes("Customer advised to keep filters dust free");
        completeDto.setPhotoUrls(Collections.singletonList(storedAfterUrl));
        
        WorkOrderDTO completed = workOrderService.completeWork(createdWo.getId(), completeDto, tech.getUser().getEmail());
        assertEquals(WorkOrderStatus.COMPLETED, completed.getStatus());
        assertNotNull(completed.getCompletedAt());

        // 6. Customer Verify & Confirm (which also saves feedback and closes work order)
        WorkOrderActionDTO verifyDto = new WorkOrderActionDTO();
        verifyDto.setRating(5);
        verifyDto.setFeedbackText("Outstanding service and polite technician");
        verifyDto.setNotes("Service verified on-site. Everything working perfectly.");
        
        WorkOrderDTO verified = workOrderService.verifyAndConfirm(createdWo.getId(), verifyDto, cust.getUser().getEmail());
        assertNotNull(verified);
        assertEquals(WorkOrderStatus.CLOSED, verified.getStatus());

        // 7. Verify History Logged
        List<WorkOrderHistory> history = historyRepository.findByWorkOrderIdOrderByTimestampDesc(createdWo.getId());
        assertTrue(history.size() >= 4, "Complete lifecycle must generate audit trail in history table");
    }

    @Test
    @Order(21)
    @Transactional
    void testReopenWorkflow() {
        ServiceCategory cat = ensureCategory("Plumbing Clean", "PLUMB_CLN");
        Customer cust = ensureCustomer("cust_reopen@test.com", "Reopen Customer");
        ServiceLocation loc = ensureLocation(cust);
        Technician tech = ensureTechnician("tech_reopen@test.com", "Reopen Tech", "Plumbing", cat);
        User disp = ensureUser("disp_reopen@test.com", "Reopen Dispatcher", Role.DISPATCHER);

        CreateWorkOrderDTO createDto = new CreateWorkOrderDTO();
        createDto.setCustomerId(cust.getId());
        createDto.setServiceLocationId(loc.getId());
        createDto.setCategoryId(cat.getId());
        createDto.setTitle("Pipe Leak Repair");
        createDto.setDescription("Kitchen sink pipe leak");
        createDto.setPriority(Priority.MEDIUM);
        createDto.setTechnicianId(tech.getId());

        WorkOrderDTO wo = workOrderService.createWorkOrder(createDto, disp.getEmail());
        workOrderService.acceptWorkOrder(wo.getId(), tech.getUser().getEmail());
        workOrderService.startWork(wo.getId(), tech.getUser().getEmail());
        
        WorkOrderActionDTO comp = new WorkOrderActionDTO();
        comp.setWorkPerformed("Tightened valve joints");
        workOrderService.completeWork(wo.getId(), comp, tech.getUser().getEmail());

        // Customer reports issue and reopens
        ReopenRequestDTO reopenDto = new ReopenRequestDTO();
        reopenDto.setReason("Slight dripping noticed again under the cabinet");
        reopenDto.setNotes("Please send technician back");
        WorkOrderDTO reopened = workOrderService.reportIssueAndReopen(wo.getId(), reopenDto, cust.getUser().getEmail());
        assertEquals(WorkOrderStatus.REOPENED, reopened.getStatus());
        assertTrue(reopened.getReopenReason().contains("Slight dripping noticed again"));
    }

    @Test
    @Order(22)
    @Transactional
    void testInvalidStatusTransitionsBlocked() {
        ServiceCategory cat = ensureCategory("General Check", "GEN_CHK");
        Customer cust = ensureCustomer("cust_invalid@test.com", "Invalid Test Customer");
        ServiceLocation loc = ensureLocation(cust);
        Technician tech = ensureTechnician("tech_invalid@test.com", "Invalid Tech", "General", cat);
        User disp = ensureUser("disp_invalid@test.com", "Invalid Dispatcher", Role.DISPATCHER);

        CreateWorkOrderDTO createDto = new CreateWorkOrderDTO();
        createDto.setCustomerId(cust.getId());
        createDto.setServiceLocationId(loc.getId());
        createDto.setCategoryId(cat.getId());
        createDto.setTitle("General Inspection");
        createDto.setDescription("Annual checkup");
        createDto.setPriority(Priority.LOW);
        createDto.setTechnicianId(tech.getId());

        WorkOrderDTO wo = workOrderService.createWorkOrder(createDto, disp.getEmail());

        // Cannot complete work order before starting it
        WorkOrderActionDTO comp = new WorkOrderActionDTO();
        comp.setWorkPerformed("Direct complete attempt");
        assertThrows(BadRequestException.class, () ->
                workOrderService.completeWork(wo.getId(), comp, tech.getUser().getEmail()));
    }

    // ======================== 4. TECHNICIAN ASSIGNMENT & SKILLS ========================

    @Test
    @Order(30)
    @Transactional
    void testTechnicianSkillMismatchRejected() {
        ServiceCategory cctvCat = ensureCategory("CCTV Security", "CCTV_SEC");
        Customer cust = ensureCustomer("cust_skill@test.com", "Skill Cust");
        ServiceLocation loc = ensureLocation(cust);
        
        // Create technician with only Plumbing skill
        ServiceCategory plumbCat = ensureCategory("Plumbing Only", "PLUMB_ONLY");
        Technician techPlumb = ensureTechnician("tech_plumbing_only@test.com", "Plumber Tech", "Plumbing", plumbCat);
        User disp = ensureUser("disp_skill@test.com", "Skill Dispatcher", Role.DISPATCHER);

        CreateWorkOrderDTO createDto = new CreateWorkOrderDTO();
        createDto.setCustomerId(cust.getId());
        createDto.setServiceLocationId(loc.getId());
        createDto.setCategoryId(cctvCat.getId());
        createDto.setTitle("CCTV Camera Install");
        createDto.setDescription("Setup 4 HD cameras");
        createDto.setPriority(Priority.HIGH);
        createDto.setTechnicianId(techPlumb.getId());

        // Assigning plumber to CCTV must be rejected
        assertThrows(BadRequestException.class, () ->
                workOrderService.createWorkOrder(createDto, disp.getEmail()));
    }

    @Test
    @Order(31)
    @Transactional
    void testTechnicianScheduleConflictDetection() {
        ServiceCategory cat = ensureCategory("AC Repair Fast", "AC_FAST");
        Customer cust = ensureCustomer("cust_conflict@test.com", "Conflict Cust");
        ServiceLocation loc = ensureLocation(cust);
        Technician tech = ensureTechnician("tech_conflict@test.com", "Busy Tech", "AC Repair Fast", cat);
        User disp = ensureUser("disp_conflict@test.com", "Conflict Dispatcher", Role.DISPATCHER);

        LocalDate targetDate = LocalDate.now().plusDays(5);

        // First Job: 10:00 - 12:00
        CreateWorkOrderDTO job1 = new CreateWorkOrderDTO();
        job1.setCustomerId(cust.getId());
        job1.setServiceLocationId(loc.getId());
        job1.setCategoryId(cat.getId());
        job1.setTitle("Morning Service");
        job1.setDescription("Filter fix");
        job1.setPriority(Priority.MEDIUM);
        job1.setScheduledDate(targetDate);
        job1.setScheduledStartTime(LocalTime.of(10, 0));
        job1.setScheduledEndTime(LocalTime.of(12, 0));
        job1.setTechnicianId(tech.getId());

        workOrderService.createWorkOrder(job1, disp.getEmail());

        // Second Job overlapping: 11:00 - 13:00 on the same date
        CreateWorkOrderDTO job2 = new CreateWorkOrderDTO();
        job2.setCustomerId(cust.getId());
        job2.setServiceLocationId(loc.getId());
        job2.setCategoryId(cat.getId());
        job2.setTitle("Overlapping Service");
        job2.setDescription("Gas check");
        job2.setPriority(Priority.MEDIUM);
        job2.setScheduledDate(targetDate);
        job2.setScheduledStartTime(LocalTime.of(11, 0));
        job2.setScheduledEndTime(LocalTime.of(13, 0));
        job2.setTechnicianId(tech.getId());

        assertThrows(ConflictException.class, () ->
                workOrderService.createWorkOrder(job2, disp.getEmail()));
    }

    // ======================== 5. INVENTORY DEDUCTION & SAFETY ========================

    @Test
    @Order(40)
    @Transactional
    void testInventoryStockDeductionAndNegativeProtection() {
        final Part savedPart = partRepository.save(new Part(
                "Capacitor 45uF",
                "Electrical",
                "CAP-" + System.currentTimeMillis(),
                5,
                2,
                "pcs",
                250.0,
                "Apex Electronics",
                "Shelf A1"
        ));
        final Long partId = savedPart.getId();

        ServiceCategory cat = ensureCategory("HVAC Electrical", "HVAC_ELEC");
        Customer cust = ensureCustomer("cust_inv@test.com", "Inv Cust");
        ServiceLocation loc = ensureLocation(cust);
        Technician tech = ensureTechnician("tech_inv@test.com", "Inv Tech", "HVAC", cat);
        User disp = ensureUser("disp_inv@test.com", "Inv Dispatcher", Role.DISPATCHER);

        CreateWorkOrderDTO createDto = new CreateWorkOrderDTO();
        createDto.setCustomerId(cust.getId());
        createDto.setServiceLocationId(loc.getId());
        createDto.setCategoryId(cat.getId());
        createDto.setTitle("Capacitor Replacement");
        createDto.setDescription("Replace burst run capacitor");
        createDto.setPriority(Priority.HIGH);
        createDto.setTechnicianId(tech.getId());

        WorkOrderDTO wo = workOrderService.createWorkOrder(createDto, disp.getEmail());
        workOrderService.acceptWorkOrder(wo.getId(), tech.getUser().getEmail());
        workOrderService.startWork(wo.getId(), tech.getUser().getEmail());

        // 1. Consume 2 units
        workOrderService.addPartToWorkOrder(wo.getId(), partId, 2, "Installed run capacitor", tech.getUser().getEmail());

        Part updated = partRepository.findById(partId).orElseThrow();
        assertEquals(3, updated.getQuantity(), "Stock must be deducted from 5 to 3");

        // 2. Attempting to consume 10 units (more than 3 available) must fail
        assertThrows(BadRequestException.class, () ->
                workOrderService.addPartToWorkOrder(wo.getId(), partId, 10, "Excess parts", tech.getUser().getEmail()));

        Part unchanged = partRepository.findById(partId).orElseThrow();
        assertEquals(3, unchanged.getQuantity(), "Stock must not go negative on failure");
    }

    // ======================== 6. PHOTO AUTHORIZATION ========================

    @Test
    @Order(50)
    @Transactional
    void testUnauthorizedPhotoUploadBlocked() {
        ServiceCategory cat = ensureCategory("Security Audit", "SEC_AUD");
        Customer cust = ensureCustomer("cust_photo_sec@test.com", "Photo Cust");
        ServiceLocation loc = ensureLocation(cust);
        Technician assignedTech = ensureTechnician("tech_assigned@test.com", "Assigned Tech", "Security", cat);
        Technician unassignedTech = ensureTechnician("tech_unassigned@test.com", "Unassigned Tech", "Security", cat);
        User disp = ensureUser("disp_photo_sec@test.com", "Photo Dispatcher", Role.DISPATCHER);

        CreateWorkOrderDTO createDto = new CreateWorkOrderDTO();
        createDto.setCustomerId(cust.getId());
        createDto.setServiceLocationId(loc.getId());
        createDto.setCategoryId(cat.getId());
        createDto.setTitle("Security Installation");
        createDto.setDescription("Install sensors");
        createDto.setPriority(Priority.MEDIUM);
        createDto.setTechnicianId(assignedTech.getId());

        WorkOrderDTO wo = workOrderService.createWorkOrder(createDto, disp.getEmail());

        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", "sample-photo".getBytes());
        String storedUrl = storageService.storeFile(file);

        // Unassigned technician cannot upload photos to this job
        assertThrows(BadRequestException.class, () ->
                workOrderService.uploadWorkOrderPhoto(
                        wo.getId(),
                        storedUrl,
                        PhotoCategory.BEFORE,
                        "Unauthorized upload",
                        unassignedTech.getUser().getEmail()
                ));
    }

    // ======================== 7. NOTIFICATIONS & ANALYTICS ========================

    @Test
    @Order(60)
    @Transactional
    void testNotificationCreationAndMarkRead() {
        User testUser = ensureUser("notif_test@fieldservice.com", "Notif User", Role.CUSTOMER);

        notificationService.createNotification(
                testUser, "System Alert", "Test notification body", NotificationType.SYSTEM, "/customer/dashboard"
        );

        List<InAppNotification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId());
        assertFalse(list.isEmpty());
        InAppNotification notif = list.get(0);
        assertFalse(notif.isRead());

        notificationService.markAsRead(notif.getId());
        InAppNotification updated = notificationRepository.findById(notif.getId()).orElseThrow();
        assertTrue(updated.isRead());
    }

    @Test
    @Order(61)
    void testAnalyticsDashboardStats() {
        DashboardStatsDTO stats = analyticsService.getDashboardStats();
        assertNotNull(stats);
        assertTrue(stats.getTotalWorkOrders() >= 0);
        assertTrue(stats.getActiveWorkOrders() >= 0);
        assertTrue(stats.getCompletedWorkOrders() >= 0);
    }
}
