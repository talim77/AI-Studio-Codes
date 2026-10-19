# Security Specification: PathoCare Multi-Tenant LIS Security Architecture

## 1. Data Invariants

1. **Lab Tenant Isolation (Master Gate)**:
   - All subcollections (`staff`, `doctors`, `templates`, `reports`) belong to a parent `/labs/{labId}`.
   - Any read/write to a subcollection requires that the caller is authenticated and either:
     - The registered Owner of `/labs/{labId}` (`request.auth.uid == labDoc.data.ownerUid`), OR
     - A registered, active staff member of that lab, OR
     - An authenticated Admin (`exists(/databases/$(database)/documents/admins/$(request.auth.uid))`).

2. **Staff PIN Protection & Anti-Fraud**:
   - Staff can only update their own `pin`, `isPinCustomized`, and `pinUpdatedAt`.
   - PIN must be exactly 4 numeric digits.
   - Staff cannot escalate their own role to 'owner' or modify permissions.

3. **Clinical Verification Gatekeeper**:
   - Only the Lab Owner (or Admin) can update a report's status to `VERIFIED`. Staff members are blocked from setting `status: 'VERIFIED'`.
   - Once a report is `VERIFIED`, it cannot be un-verified or edited by non-owners.

4. **Billing & Financial Integrity**:
   - Net Payable must equal Total - Discount.
   - Negative amounts for billing fields are rejected.

5. **Default Deny**:
   - Any route not explicitly permitted is blocked (`allow read, write: if false;`).

---

## 2. The "Dirty Dozen" Adversarial Payloads (Must be Denied)

1. **Payload 1: Unauthenticated Read on Patient Reports**
   - Attempt: Anonymous user queries `/labs/LARI786/reports`.
   - Expected: `PERMISSION_DENIED` (auth required).

2. **Payload 2: Tenant Cross-Read Attack**
   - Attempt: User owning `APEX-LAB-101` reads `/labs/LARI786/reports`.
   - Expected: `PERMISSION_DENIED` (must be member of LARI786).

3. **Payload 3: Unauthorized Verification Spoofing by Staff**
   - Attempt: Staff technician submits update setting `status: "VERIFIED"`.
   - Expected: `PERMISSION_DENIED` (only Lab Owner can mark VERIFIED).

4. **Payload 4: Staff Privilege Escalation via Self-Update**
   - Attempt: Staff member updates their own document setting `role: "owner"`.
   - Expected: `PERMISSION_DENIED` (role is immutable by staff).

5. **Payload 5: PIN Injection with Alphanumeric or Long String**
   - Attempt: Attacker sends `pin: "ABCD12345678"`.
   - Expected: `PERMISSION_DENIED` (PIN must match `^[0-9]{4}$`).

6. **Payload 6: Ghost Field Injection (Shadow Update Attack)**
   - Attempt: Attacker adds `__internalAdminOverride: true` to a report.
   - Expected: `PERMISSION_DENIED` (`affectedKeys().hasOnly(...)` rejects unexpected keys).

7. **Payload 7: Unbounded Array / DoS Attack**
   - Attempt: Attacker writes report with 5,000 array items in `tests`.
   - Expected: `PERMISSION_DENIED` (`tests.size() <= 50`).

8. **Payload 8: Negative Bill Injection**
   - Attempt: Attacker updates report with `netPayable: -5000`.
   - Expected: `PERMISSION_DENIED` (netPayable must be >= 0).

9. **Payload 9: Lab Owner Identity Hijacking**
   - Attempt: Authenticated user creates `/labs/LARI786` setting `ownerUid: "another-person-uid"`.
   - Expected: `PERMISSION_DENIED` (ownerUid must match `request.auth.uid`).

10. **Payload 10: Path Variable / Junk Character ID Poisoning**
    - Attempt: Document ID created with 500 characters or invalid symbols `/labs/<invalid#$!>/staff/1`.
    - Expected: `PERMISSION_DENIED` (`isValidId` rejects malformed IDs).

11. **Payload 11: Deleting Verified Patient Report by Staff**
    - Attempt: Staff member sends delete request on a verified report.
    - Expected: `PERMISSION_DENIED` (only owner or authorized staff can delete unverified reports).

12. **Payload 12: Direct Modification of Admins Directory**
    - Attempt: Non-admin writes to `/admins/$(request.auth.uid)` to self-grant admin.
    - Expected: `PERMISSION_DENIED`.
