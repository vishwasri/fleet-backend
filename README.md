# 🚗 Fleet — Rent-a-Car Fleet Management & B2B Partner Network Backend

> **Mobile-first Multi-tenant SaaS Fleet Management Platform with B2B Partner Rentals & Version 2 Public Marketplace Foundation**

Built with **NestJS**, **TypeScript**, **MySQL 8**, and **Prisma ORM**.

---

## 🌟 Key Architecture & Highlights

1. **Multi-Tenant SaaS from Day One**:
   - Every rent-a-car business operates within an isolated `Organization` with scoped database queries.
   - Central `User` identity supports `BUSINESS_USER`, `CUSTOMER`, and `PLATFORM_ADMIN` account types.
   - Strict RBAC: `OWNER` > `ADMIN` > `STAFF` > `VIEWER`.
2. **Central Transaction-Safe Availability Engine**:
   - Single unified `AvailabilityService` prevents double bookings across **Direct Bookings**, **B2B Partner Rentals**, **Maintenance Records**, and **Vehicle Blocks**.
   - Executed within database transactions with collision detection.
3. **B2B Trusted Partner Rental Network**:
   - Connects rental businesses for peer-to-peer fleet sourcing and wholesale vehicle sharing.
   - **Privacy Enforcement**: Supplying owners only receive wholesale rates and company info — **zero end-customer identities or documents are ever shared**.
4. **Separation of Private Operational Data from Future Public Marketplace**:
   - Organizations default to `PRIVATE`.
   - Private fields (`registrationNumber`, internal notes, costs, documents, private photos, GPS trackers) are physically stripped from public endpoints.
   - Version 2 endpoints (`/api/public/*` and `/api/customer/*`) are foundation-ready.
5. **Interactive Swagger Documentation**:
   - Complete OpenAPI / Swagger UI available at `/api/docs`.

---

## 📂 API Namespaces

| Namespace | Base Route | Purpose & Access Control |
| :--- | :--- | :--- |
| **Authentication** | `/api/auth/*` | Registration, login, JWT refresh token rotation, user profile |
| **Internal Operations** | `/api/internal/*` | Vehicles, direct bookings, customers, maintenance, blocks, finance, dashboard, reports |
| **B2B Partner Network** | `/api/partner/*` | Partner directory, sourcing requests, wholesale offers, partner rentals, handovers, settlements |
| **Public Marketplace** | `/api/public/*` | Public vehicle discovery (Only `PUBLISHED` orgs & vehicles, zero private operational data) |
| **Customer Stubs** | `/api/customer/*` | Version 2 Authenticated End-Customer profile and booking requests |

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- **Node.js**: `v20+` or `v22+`
- **npm**: `v10+`
- **Docker & Docker Compose** (for MySQL 8)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Default configuration:
```env
PORT=3000
API_PREFIX=api
DATABASE_URL="mysql://fleet_user:fleet_password@localhost:3306/fleet_db"
JWT_ACCESS_SECRET="fleet-super-secret-access-token-key-change-in-production"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_SECRET="fleet-super-secret-refresh-token-key-change-in-production"
JWT_REFRESH_EXPIRATION="7d"
CORS_ORIGINS="*"
```

---

## 🐳 Running with Docker Compose

Start MySQL 8 (and optionally the backend):
```bash
# Start MySQL 8 container in background
docker compose up -d mysql

# Or start both MySQL and API containers
docker compose up --build
```

---

## 🛠️ Database Setup, Migrations & Seeding

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Apply migrations
npm run prisma:migrate

# Seed database with sample organizations, vehicles, bookings & partner rentals
npm run prisma:seed
```

---

## 💻 Running Locally in Development Mode

```bash
npm run start:dev
```
- API Base URL: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`

---

## 🧪 Testing

### Unit Tests
```bash
npm run test
```
Runs unit tests for `AvailabilityService` (collision detection, date boundaries) and `MoneyUtil` (decimal arithmetic).

### End-to-End (e2e) Tests
```bash
npm run test:e2e
```
Executes four end-to-end test suites against a live database:
1. `test/auth.e2e-spec.ts`: Organization & Owner registration, JWT login, token rotation, logout.
2. `test/tenant-isolation.e2e-spec.ts`: Verification that Organization A cannot view or access Organization B resources.
3. `test/booking-conflict.e2e-spec.ts`: Transactional collision prevention on overlapping date windows and vehicle blocks.
4. `test/partner-privacy.e2e-spec.ts`: Verification of zero end-customer data exposure in B2B partner rental workflows.

---

## 🔑 Seed Accounts & Credentials

The seed script creates two realistic rental businesses with active bookings, vehicles, and B2B partner connection:

| Organization | Status | Email | Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Apex Rentals** | `PUBLISHED` | `owner@apexrentals.com` | `Fleet2026!Secure` | `OWNER` |
| **Apex Rentals** | `PUBLISHED` | `staff@apexrentals.com` | `Fleet2026!Secure` | `STAFF` |
| **Metro Fleet** | `PRIVATE` | `owner@metrofleet.com` | `Fleet2026!Secure` | `OWNER` |
| **Metro Fleet** | `PRIVATE` | `staff@metrofleet.com` | `Fleet2026!Secure` | `STAFF` |
| **Platform Admin** | `SYSTEM` | `admin@fleetplatform.internal` | `Fleet2026!Secure` | `PLATFORM_ADMIN` |

---

## 📦 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma              # 23+ Prisma models & MySQL enums
│   └── seed.ts                    # Realistic multi-tenant seed data
├── src/
│   ├── common/
│   │   ├── decorators/            # @CurrentUser(), @CurrentOrgId(), @Roles(), @Public()
│   │   ├── guards/                # JwtAuthGuard, RolesGuard, OrgTenantGuard
│   │   ├── filters/               # HttpExceptionFilter, PrismaExceptionFilter
│   │   ├── interceptors/          # TransformResponseInterceptor
│   │   ├── dto/                   # PaginationQueryDto, ApiResponseDto
│   │   └── utils/                 # MoneyUtil (Decimal precision), BookingNumberUtil
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── modules/
│   │   ├── auth/                  # Register org+owner, login, refresh, logout, profile
│   │   ├── users/                 # Staff invitations & role management
│   │   ├── organizations/         # Org profile, settings, marketplace status
│   │   ├── vehicles/              # Fleet CRUD, availability, profitability, listing fields
│   │   ├── availability/          # Central Availability Engine (transaction-safe conflict prevention)
│   │   ├── customers/             # CustomerProfile (direct rental) & MarketplaceCustomerProfile
│   │   ├── bookings/              # Direct Bookings (lifecycle, pricing, pickup/return inspection)
│   │   ├── partner-network/       # B2B network, requests, offers, rentals, handovers, settlements
│   │   ├── maintenance/           # Maintenance records & vehicle blocking
│   │   ├── finance/               # Financial transactions (Income/Expense), payments, settlements
│   │   ├── messages/              # Templates, message logs, multi-channel dispatch abstraction
│   │   ├── dashboard/             # Operational pulse, today's ops, revenue/expense metrics, alerts
│   │   ├── reports/               # Utilization, profitability, B2B partner reports
│   │   └── marketplace/           # Future public listings & discovery stubs
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── auth.e2e-spec.ts           # Auth, registration, token refresh
│   ├── tenant-isolation.e2e-spec.ts # Strict cross-org data isolation verification
│   ├── booking-conflict.e2e-spec.ts # Availability engine & double-booking prevention
│   └── partner-privacy.e2e-spec.ts # B2B partner rental privacy & data segregation
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```
