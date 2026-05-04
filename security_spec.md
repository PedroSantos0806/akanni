# Security Specification: Confecção Pro

## 1. Data Invariants
- `orders`:
  - `totalFabricEstimate` must be `quantity * fabricUsagePerUnit`.
  - `status` transitions must follow the designated flow.
  - `updatedAt` must always be the current server time on updates.
  - `customerTaxId` is required for orders that need NF-e.
- `stock`:
  - `quantity` cannot be negative.
  - Items can only be deleted by admins.
- `users`:
  - A user can only read/write their own profile unless they are an admin.

## 2. The "Dirty Dozen" Payloads (Denial Expected)

1. **Identity Spoofing**: User A tries to create an order as User B.
2. **State Shortcutting**: Transitioning an order from `pending` directly to `delivered` for a complex manufacture.
3. **Ghost Fields**: Adding `isVerified: true` to a user profile.
4. **Resource Poisoning**: Injecting a 2MB string into `notes`.
5. **Negative Stock**: Updating stock to `-500` meters of fabric.
6. **Orphaned Writes**: Creating an order with a non-existent `customerName`.
7. **Privilege Escalation**: User tries to set their own `role: 'admin'`.
8. **Unauthorized List**: Anonymous user trying to list all orders.
9. **PII Leak**: Non-admin user trying to read all `customerEmail` fields from the `orders` collection via a list query without a proper filter.
10. **Immutable Field Change**: Trying to change `createdAt` on an existing order.
11. **Large Document ID**: Using a 5KB string as a document ID for an order.
12. **Missing Invariant**: Creating an order without `quantity` or `status`.

## 3. Test Runner Concept
The `firestore.rules.test.ts` (draft) would verify:
- `auth != null` for all sensitive writes.
- `isValidOrder()` helper checks types and sizes.
- `isValidStock()` enforces non-negative quantity.
