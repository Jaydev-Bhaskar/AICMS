# AICMS — AICTE Integrated Complaint Monitoring System

A full-stack **MERN** application providing a centralized dashboard for AICTE officials to monitor, track, and coordinate institution-related complaint cases across all Bureaus and Cells (RB, PGRC, and others).

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18.x
- **MongoDB** (local or Atlas)
- **npm** ≥ 9.x

### 1. Clone & Configure

```bash
# Copy env samples and fill in your values
cp server/.env.sample server/.env
cp client/.env.sample client/.env
```

Edit `server/.env` — at minimum set `MONGO_URI` and `JWT_SECRET`.

### 2. Install Dependencies

```bash
# From project root
npm run install:all
```

Or individually:
```bash
npm install --prefix server
npm install --prefix client
```

### 3. Seed the Database

```bash
npm run seed
# or: node server/src/utils/seeder.js
```

This creates sample bureaus, institutions, users, complaints (including intentional overlaps), and notifications.

**Default Login Credentials** (all passwords: `Admin@123`):

| Role         | Email                        |
|--------------|------------------------------|
| Super Admin  | superadmin@aicte.edu.in      |
| Admin        | admin@aicte.edu.in           |
| RB Officer   | rb.officer@aicte.edu.in      |
| PGRC Officer | pgrc.officer@aicte.edu.in    |
| Regional     | regional@aicte.edu.in        |
| Viewer       | viewer@aicte.edu.in          |

### 4. Run the Application

**Development (two terminals):**
```bash
# Terminal 1 – Backend API (port 5000)
npm run dev:server

# Terminal 2 – React Frontend (port 3000)
npm run dev:client
```

Open **http://localhost:3000** in your browser.

---

## 🏗️ Project Structure

```
AICMS/
├── server/                    # Express.js API
│   ├── src/
│   │   ├── controllers/       # Route handler logic
│   │   │   ├── authController.js
│   │   │   ├── complaintController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── institutionController.js
│   │   │   └── reportController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js   # JWT protect & authorize
│   │   │   └── errorMiddleware.js  # Global error handler
│   │   ├── models/            # Mongoose schemas
│   │   │   ├── Bureau.js
│   │   │   ├── Complaint.js
│   │   │   ├── Institution.js
│   │   │   ├── Notification.js
│   │   │   └── User.js
│   │   ├── routes/            # Express router definitions
│   │   ├── utils/
│   │   │   ├── asyncHandler.js
│   │   │   ├── logger.js          # Winston logger
│   │   │   ├── overlapDetection.js # Rule-based + Jaccard similarity
│   │   │   └── seeder.js          # DB seed script
│   │   └── server.js          # App entry point + Socket.IO
│   ├── logs/
│   ├── uploads/
│   ├── .env.sample
│   └── package.json
│
├── client/                    # React 18 SPA
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/        # Sidebar, Header, Layout shell
│   │   │   └── UI/            # StatusBadge, Modal
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ComplaintsPage.jsx
│   │   │   ├── ComplaintDetailPage.jsx
│   │   │   ├── NewComplaintPage.jsx
│   │   │   ├── InstitutionsPage.jsx
│   │   │   ├── InstitutionDetailPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── OverlapAlertsPage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── services/
│   │   │   ├── api.js         # Axios instance with interceptors
│   │   │   └── socket.js      # Socket.IO client
│   │   ├── store/
│   │   │   └── authStore.js   # Zustand auth state
│   │   ├── App.js
│   │   └── index.js
│   ├── .env.sample
│   └── package.json
│
├── .gitignore
├── package.json               # Root scripts
└── README.md
```

---

## ✨ Key Features

### 🏛️ Centralized Institution Profiles
- Unique AICTE Permanent ID per institution
- Region, type, address, approval status
- Consolidated complaint history

### 📋 Complaint / Case Tracking
- Auto-generated Case IDs (`AICMS-YYYY-NNNNN`)
- Full lifecycle: Pending → Under Process → Transferred / Escalated → Disposed / Closed
- Complainant details, category, sub-category, priority, source
- Bureau/Cell assignment and officer assignment
- SLA tracking with breach alerts

### ⚠️ Cross-Bureau Overlap Detection (AI-assisted)
- Rule-based engine detects when the **same institution** has complaints in multiple Bureaus/Cells
- Jaccard similarity on descriptions finds semantically related complaints
- Real-time overlap alerts via **Socket.IO** notifications
- `"Potential Overlapping Cases – Coordination Required"` banner on case detail

### 📊 Real-Time Dashboard
- Live stats: Total / Pending / In Progress / Disposed / Transferred / Escalated
- Service Level donut (disposal %)
- 14-day trend line chart (Pending vs In Progress)
- Bureau/Cell workload bar chart
- Category distribution chart
- SLA breach & overlap alert banners

### 🔍 Search & Filters
- Search by Case ID, institution name, AICTE ID, complainant name
- Filter by status, category, priority, region, bureau, SLA breach, date range
- Pagination with configurable page size

### 📈 Reports & Analytics
- Bureau-wise report
- Region-wise report
- Institution-wise complaint history
- Pending case ageing analysis (0–7, 8–15, 16–30, 31–60, 61–90, 91–180, 180+ days)
- Disposal rate (monthly/weekly/annual)
- Overlapping/duplicate case report

### 🔔 Notifications & Alerts
- Real-time Socket.IO push for overlap detection and case updates
- Notification panel with read/unread tracking
- SLA breach alerts (breached + due within 3 days)

### 🔒 Role-Based Access Control
| Role              | Access                                        |
|-------------------|-----------------------------------------------|
| `superadmin`      | Full access including delete and user manage  |
| `admin`           | Full CRUD, cannot delete institutions         |
| `rb_officer`      | Own bureau cases only                         |
| `pgrc_officer`    | Own bureau cases only                         |
| `bureau_officer`  | Own bureau cases only                         |
| `regional_officer`| Cross-bureau read, own region actions         |
| `viewer`          | Read-only access                              |

---

## 🔌 API Endpoints

### Auth
| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| POST   | `/api/auth/login`           | Login, returns JWT       |
| POST   | `/api/auth/register`        | Register user (admin)    |
| GET    | `/api/auth/me`              | Current user profile     |
| PUT    | `/api/auth/profile`         | Update profile           |
| PUT    | `/api/auth/change-password` | Change password          |

### Complaints
| Method | Path                          | Description                  |
|--------|-------------------------------|------------------------------|
| GET    | `/api/complaints`             | List (with filters & paging) |
| POST   | `/api/complaints`             | Register new complaint        |
| GET    | `/api/complaints/:id`         | Get with full history        |
| PUT    | `/api/complaints/:id`         | Update status/assignment     |
| POST   | `/api/complaints/:id/actions` | Add remark/action            |
| DELETE | `/api/complaints/:id`         | Soft-delete (admin only)     |

### Institutions
| Method | Path                    | Description                         |
|--------|-------------------------|-------------------------------------|
| GET    | `/api/institutions`     | List with search/filters            |
| POST   | `/api/institutions`     | Create (admin)                      |
| GET    | `/api/institutions/:id` | Profile + complaint stats + history |
| PUT    | `/api/institutions/:id` | Update (admin)                      |

### Dashboard
| Method | Path                              | Description            |
|--------|-----------------------------------|------------------------|
| GET    | `/api/dashboard/overview`         | All stats + charts data|
| GET    | `/api/dashboard/recent-complaints`| Latest N cases         |
| GET    | `/api/dashboard/overlap-alerts`   | Unreviewed overlaps    |
| GET    | `/api/dashboard/sla-alerts`       | Breached + due-soon    |

### Reports
| Method | Path          | Query: `type`                                          |
|--------|---------------|--------------------------------------------------------|
| GET    | `/api/reports`| `bureau_wise`, `region_wise`, `institution_wise`, `ageing`, `disposal_rate`, `overlap` |

---

## 🛠️ Tech Stack

| Layer       | Technology                                   |
|-------------|----------------------------------------------|
| Frontend    | React 18, React Router v6, Zustand, Chart.js |
| Styling     | Plain CSS with CSS custom properties         |
| Backend     | Node.js, Express.js                          |
| Database    | MongoDB, Mongoose ODM                        |
| Auth        | JWT (jsonwebtoken), bcryptjs                 |
| Real-time   | Socket.IO                                    |
| Logging     | Winston                                      |
| Security    | Helmet, express-mongo-sanitize, rate-limit   |
| Notifications| react-hot-toast                             |

---

## 🔧 Environment Variables

### Server (`server/.env`)
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/aicms
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
CLIENT_URL=http://localhost:3000
```

### Client (`client/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## 📝 License
Developed for AICTE — All India Council for Technical Education, New Delhi.

