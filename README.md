# Ashirvad Business Management System

## 📋 Project Overview

Ashirvad is a comprehensive full-stack business management system designed to streamline operations across multiple business verticals including Guest House (GH), Restaurant (Rest), and Office Book (OB) management. The platform provides real-time analytics, sales tracking, expense management, payment processing across multiple modes (Cash, Card, PPS, PPC), and advanced reporting capabilities with interactive data visualizations.

## 🚀 Tech Stack

### Frontend

- **Framework:** React 18.3.1
- **Build Tool:** Vite 6.0.1
- **UI Library:** Material-UI (MUI) v6.x
  - @mui/material - Core components
  - @mui/icons-material - Icon library
  - @mui/x-charts - Chart components
  - @mui/x-data-grid - Advanced data grid
  - @mui/x-date-pickers - Date picker components
  - @mui/styled-engine-sc - Styled components integration
- **State Management:** Redux Toolkit 2.5.0 with React Redux 9.2.0
- **Routing:** React Router DOM v7.0.1
- **Dashboard Framework:** @toolpad/core v0.11.0
- **Charts/Visualization:**
  - Recharts 2.15.3 (Primary charting library)
  - MUI X-Charts 8.0.0
- **Date Management:** Day.js 1.11.13
- **HTTP Client:** Axios 1.7.9
- **Form Handling:** React-based custom forms
- **Styling:**
  - Emotion (@emotion/react & @emotion/styled)
  - Styled Components 6.1.13
- **Notifications:** React Hot Toast 2.4.1
- **Excel Export:** XLSX 0.18.5

### Backend

- **Runtime:** Node.js (>=14.0.0)
- **Framework:** Express.js 4.21.2
- **Database:** MongoDB with Mongoose 8.8.4
- **Authentication:**
  - JSON Web Tokens (JWT) 9.0.2
  - Cookie-based authentication with cookie-parser 1.4.7
- **Password Encryption:**
  - Bcrypt 5.1.1
  - Bcryptjs 2.4.3
- **Email Service:** Nodemailer 7.0.4
- **File Management:**
  - fs-extra 11.3.0
  - adm-zip 0.5.16
  - uuid 11.1.0
- **Middleware:**
  - CORS 2.8.5
  - Body Parser (via Express)
- **Environment Management:** dotenv 16.4.7
- **Development:** Nodemon 3.1.7 (Hot reload)

### DevOps & Deployment

- **Frontend Hosting:** Vercel (configured via vercel.json)
- **Backend Hosting:** Configurable (runs on port 8080)
- **Version Control:** Git
- **Package Manager:** Yarn
- **Build Tools:** Vite (Frontend), Node.js native (Backend)
- **Backup System:** Automated backup with cron jobs

### Development Tools

- **Linting:** ESLint 9.15.0
  - @eslint/js
  - eslint-plugin-react
  - eslint-plugin-react-hooks
  - eslint-plugin-react-refresh
- **Type Support:** TypeScript type definitions for React

## 🎯 Key Features

### Guest House Management (GH)

- **Entry Management System**

  - Day and Night entry tracking
  - Extra day/night entries support
  - Room-based occupancy tracking
  - Multiple payment modes (Cash, Card, PPS, PPC, UnPaid)
  - Pending Jama (unpaid) entries tracking
  - Reservation management

- **Dashboard & Analytics**

  - Real-time sales tracking
  - Sales goal vs actual performance analysis
  - Interactive pie charts and line graphs
  - Date range-based reporting
  - Single day view dashboard
  - Bank books integration
  - Unpaid entries dashboard
  - Mode of payment breakdown
  - People count tracking over time

- **Reporting Features**
  - Excel export functionality with dynamic naming
  - Sales reports with averages
  - Bank book reconciliation
  - Payment mode-wise summary
  - Total and average calculations

### Restaurant Management (Rest)

- **Sales & Operations**

  - Daily sales tracking
  - Upaad (credit) entries management
  - Expense tracking and categorization
  - Bank book entries
  - Staff management system
  - Multiple payment mode support

- **Analytics & Visualizations**

  - Sales trend graphs
  - Category-wise expense analysis
  - Pending user balance tracking
  - Aapvana (received) transaction tracking
  - Levana (given/paid) transaction tracking
  - Pending balance reconciliation

- **Advanced Features**
  - Staff management dashboard
  - Category and expense management
  - Pending users dashboard
  - Date range filtering
  - Excel export with custom formatting

### Office Book Management (OB)

- **Financial Tracking**

  - Office category expenses (In/Out)
  - Comprehensive book entry system
  - Category-wise expense analysis
  - Date range reporting

- **Visualizations**
  - Pie charts for category distribution
  - Expense trend analysis
  - Merged reports across all verticals

### Cross-Platform Features

- **Authentication & Authorization**

  - Dual authentication system (User & Admin)
  - JWT-based secure authentication
  - Cookie-based session management
  - Role-based access control (RBAC)
  - Super Admin/Super User privileges
  - Password reset functionality (User & Admin)
  - Signup/Login flows

- **Advanced Reporting**

  - Merged reports across GH, Restaurant, and Office
  - Merged graph visualizations
  - Excel export with date range naming
  - Total and average row calculations
  - Unique day-based averaging

- **User Experience**
  - Responsive design (mobile, tablet, desktop)
  - Dark/Light theme support (via MUI)
  - Interactive dashboard navigation
  - Real-time notifications (React Hot Toast)
  - Loading states and error handling
  - Modern loader animations

## 📁 Project Structure

```
Ashirvad/
├── public/                          # Static assets
├── server/                          # Backend (Node.js + Express)
│   ├── controller/                  # API route controllers
│   │   ├── admin.js                # Admin authentication & management
│   │   ├── user.js                 # User authentication & management
│   │   ├── entry.js                # Guest house entries CRUD
│   │   ├── restEntry.js            # Restaurant entries CRUD
│   │   ├── restPending.js          # Restaurant pending entries
│   │   ├── restStaff.js            # Restaurant staff management
│   │   ├── restCategory.js         # Restaurant categories
│   │   ├── officeBook.js           # Office book entries
│   │   ├── room.js                 # Room management
│   │   └── pendingRestAggregation.js # Aggregation logic
│   ├── model/                       # Mongoose schemas
│   │   ├── admin.js                # Admin model
│   │   ├── user.js                 # User model
│   │   ├── entry.js                # Guest house entry model
│   │   ├── restEntry.js            # Restaurant entry model
│   │   ├── restPending.js          # Pending entries model
│   │   ├── restStaff.js            # Staff model
│   │   ├── restCategory.js         # Category model
│   │   ├── officeBook.js           # Office book model
│   │   └── room.js                 # Room model
│   ├── middleware/                  # Custom middleware
│   ├── utils/                       # Utility functions
│   │   ├── jwtToken.js             # JWT token generation/validation
│   │   ├── adminToken.js           # Admin token utilities
│   │   ├── sendMail.js             # Email service integration
│   │   └── runBackup.js            # Backup automation
│   ├── cron/                        # Scheduled tasks
│   ├── db/                          # Database configuration
│   │   └── Database.js             # MongoDB connection
│   ├── app.js                       # Express app configuration
│   ├── server.js                    # Server entry point
│   ├── .env                         # Environment variables
│   └── package.json                 # Backend dependencies
│
├── src/                             # Frontend (React + Vite)
│   ├── components/                  # Reusable components
│   │   ├── guest-house/            # GH-specific components
│   │   │   ├── GHHome.jsx          # GH dashboard with graphs
│   │   │   ├── GHDashboard.jsx     # Single day view
│   │   │   ├── GHDashboardRange.jsx # Date range view
│   │   │   ├── GHSalesDashboard.jsx # Sales reporting
│   │   │   ├── GHSalesGoalDashboard.jsx # Goal tracking
│   │   │   ├── GHBankBooksDashboard.jsx # Bank reconciliation
│   │   │   └── GHUpaidEntriesDashboard.jsx # Unpaid tracking
│   │   ├── restaurant/             # Restaurant components
│   │   │   ├── RestHome.jsx        # Restaurant dashboard
│   │   │   ├── RestSalesDashboard.jsx # Sales reports
│   │   │   ├── RestUpaadEntriesDashboard.jsx # Upaad tracking
│   │   │   ├── RestExpensesDashboard.jsx # Expense tracking
│   │   │   ├── RestBankBookEntry.jsx # Bank entries
│   │   │   ├── RestStaffDashboard.jsx # Staff management
│   │   │   ├── RestCategoryExpensesDashboard.jsx # Category expenses
│   │   │   ├── RestPendingUsersDashboard.jsx # Pending users
│   │   │   ├── RestAapvanaDashboard.jsx # Received transactions
│   │   │   ├── RestLevanaDashboard.jsx # Paid transactions
│   │   │   └── RestAapvanaLevana.jsx # Balance reconciliation
│   │   ├── office/                 # Office book components
│   │   │   ├── OfficeHome.jsx      # Office dashboard
│   │   │   ├── OfficeBookDashboard.jsx # Book entries
│   │   │   ├── OfficeCategoryDashboard.jsx # Category view
│   │   │   ├── OfficeMerged.jsx    # Merged reports
│   │   │   └── OfficeMergedGraph.jsx # Merged graphs
│   │   ├── charts/                 # Chart utilities
│   │   │   ├── chartUtils.js       # Chart helper functions
│   │   │   ├── LineChartComponent.jsx # Reusable line chart
│   │   │   └── PieChartComponent.jsx # Reusable pie chart
│   │   ├── Navbar.jsx              # Main navigation
│   │   ├── HomeDashboard.jsx       # Dashboard home
│   │   ├── EntryAccordion.jsx      # Entry form accordion
│   │   ├── PendingJamaTable.jsx    # Pending entries table
│   │   ├── PendingJamaGrid.jsx     # Pending entries grid
│   │   ├── ReservationTable.jsx    # Reservation management
│   │   └── TableComponent.jsx      # Generic table component
│   ├── pages/                       # Page components
│   │   ├── Home.jsx                # Landing page
│   │   ├── EntryPage.jsx           # Guest house entry page
│   │   ├── DashboardPage.jsx       # Main dashboard router
│   │   ├── LoginPage.jsx           # User login
│   │   ├── SignupPage.jsx          # User registration
│   │   ├── AdminLoginPage.jsx      # Admin login
│   │   ├── AdminSignupPage.jsx     # Admin registration
│   │   ├── UserResetPasswordPage.jsx # User password reset
│   │   ├── AdminResetPasswordPage.jsx # Admin password reset
│   │   ├── ProfilePage.jsx         # User profile
│   │   ├── NotFound.jsx            # 404 page
│   │   ├── restaurant/
│   │   │   └── RestEntryPage.jsx   # Restaurant entry page
│   │   └── office/
│   │       └── OfficeEntryPage.jsx # Office entry page
│   ├── redux/                       # State management
│   │   ├── store.js                # Redux store configuration
│   │   ├── actions/                # Redux actions
│   │   ├── reducers/               # Redux reducers
│   │   └── hooks/                  # Custom Redux hooks
│   ├── routes/                      # Route protection
│   │   ├── ProtectedRoute.jsx      # User route guard
│   │   └── ProtectedAdminRoute.jsx # Admin route guard
│   ├── utils/                       # Utility functions
│   │   ├── utils.js                # Helper functions
│   │   └── util.jsx                # React utility components
│   ├── assets/                      # Images, fonts, etc.
│   ├── App.jsx                      # Main App component
│   ├── App.css                      # App styles
│   ├── main.jsx                     # React entry point
│   └── index.css                    # Global styles
│
├── .gitignore                       # Git ignore rules
├── eslint.config.js                 # ESLint configuration
├── vite.config.js                   # Vite configuration
├── vercel.json                      # Vercel deployment config
├── index.html                       # HTML template
├── package.json                     # Frontend dependencies
├── yarn.lock                        # Yarn lock file
└── README.md                        # This file
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js >= 14.0.0
- Yarn package manager
- MongoDB database (local or cloud)
- Git

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/harshprajapati8347/Ashirwad.git
cd Ashirvad

# Install dependencies
yarn install

# Create .env file (copy from .env.example if available)
# Add required environment variables:
# VITE_REACT_APP_BUSINESS_NAME=Ashirvad
# VITE_API_URL=http://localhost:8080/api/v1

# Start development server
yarn start
# Application will run on http://localhost:5173
```

### Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
yarn install

# Create .env file with required variables:
# DB_URL=mongodb://localhost:27017/ashirvad
# PORT=8080
# JWT_SECRET=your_jwt_secret
# JWT_EXPIRE=7d
# COOKIE_EXPIRE=7
# NODE_ENV=development
# CLIENT_URL=http://localhost:5173

# Start development server
yarn dev
# Backend will run on http://localhost:8080

# For production
yarn start
```

## 📊 API Endpoints

### Authentication

- `POST /api/v1/user/signup` - User registration
- `POST /api/v1/user/login` - User login
- `POST /api/v1/user/logout` - User logout
- `POST /api/v1/user/reset-password` - Reset user password
- `POST /api/v1/admin/signup` - Admin registration
- `POST /api/v1/admin/login` - Admin login
- `POST /api/v1/admin/logout` - Admin logout
- `POST /api/v1/admin/reset-password` - Reset admin password

### Guest House (GH)

- `POST /api/v1/entry/create` - Create new entry
- `GET /api/v1/entry/:date` - Get entries by date
- `PUT /api/v1/entry/update/:date` - Update entry by date
- `DELETE /api/v1/entry/delete/:date` - Delete entry by date
- `GET /api/v1/entry/unpaid` - Get unpaid entries
- `GET /api/v1/room/seed` - Get room configuration

### Restaurant

- `POST /api/v1/restEntry/create` - Create restaurant entry
- `GET /api/v1/restEntry/:date` - Get entries by date
- `PUT /api/v1/restEntry/update/:date` - Update entry
- `DELETE /api/v1/restEntry/delete/:date` - Delete entry
- `GET /api/v1/restStaff/all` - Get all staff
- `POST /api/v1/restStaff/create` - Create staff member
- `GET /api/v1/restCategory/all` - Get all categories
- `POST /api/v1/restCategory/create` - Create category
- `GET /api/v1/restPending/all` - Get pending entries
- `GET /api/v1/aggregation/pending` - Get aggregated pending data

### Office Book

- `POST /api/v1/officeBook/create` - Create office entry
- `GET /api/v1/officeBook/:date` - Get entries by date
- `GET /api/v1/officeBook/range` - Get entries by date range
- `PUT /api/v1/officeBook/update/:date` - Update entry
- `DELETE /api/v1/officeBook/delete/:date` - Delete entry

## 🔐 Authentication Flow

1. **User/Admin Registration**: Users/Admins sign up with credentials
2. **Login**: Credentials validated, JWT token generated
3. **Token Storage**: JWT stored in httpOnly cookies
4. **Protected Routes**: Frontend routes protected with route guards
5. **Token Validation**: Backend middleware validates JWT on each request
6. **Role-Based Access**: Different dashboards for users vs admins
7. **Session Management**: Auto-logout on token expiration

## 📈 Data Flow

1. **Entry Creation**: Users enter data through entry pages
2. **Data Validation**: Frontend validates data before submission
3. **API Call**: Axios sends data to backend endpoints
4. **Database Storage**: MongoDB stores data via Mongoose models
5. **Data Retrieval**: Dashboard components fetch data via Redux actions
6. **State Management**: Redux stores application state
7. **Data Visualization**: Charts and tables display processed data
8. **Excel Export**: Users can export filtered data to Excel

## 🎨 Payment Modes

The system supports multiple payment modes across all modules:

- **Cash** - Cash payments
- **Card** - Card/UPI payments
- **PPS** - Paytm Payment Service
- **PPC** - Paytm Payment Card
- **UnPaid** - Credit/Pending payments

## 📝 Excel Export Features

- Dynamic filename generation based on:
  - Module (GH/Rest/OB)
  - Date range
  - Report type
- Automatic exclusion of Total/Average rows from export
- Support for date range filtering
- Custom column formatting
- XLSX format with proper headers

## 🚀 Deployment

### Frontend (Vercel)

```bash
# Deploy to Vercel
vercel --prod

# Or use Vercel UI
# Connect GitHub repository
# Configure build settings:
# - Build Command: yarn build
# - Output Directory: dist
```

### Backend

```bash
# On your server (PM2 example)
npm install -g pm2
cd server
pm2 start server.js --name ashirvad-backend

# Or use Docker
docker build -t ashirvad-backend .
docker run -p 8080:8080 ashirvad-backend
```

## 🔧 Configuration

### Environment Variables

**Frontend (.env)**

```env
VITE_REACT_APP_BUSINESS_NAME=Ashirvad
VITE_API_URL=http://localhost:8080/api/v1
```

**Backend (server/.env)**

```env
DB_URL=mongodb://localhost:27017/ashirvad
PORT=8080
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
COOKIE_EXPIRE=7
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

## 🧪 Testing

```bash
# Run linting
yarn lint

# Build for production
yarn build

# Preview production build
yarn preview
```

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For support, email your-email@example.com or create an issue in the repository.

## 🙏 Acknowledgments

- Material-UI for the comprehensive component library
- Recharts for beautiful data visualizations
- Redux Toolkit for simplified state management
- Express.js and MongoDB for robust backend architecture

---

### Terms of Use

**UNAUTHORIZED ACCESS, USE, COPYING, OR DISTRIBUTION OF THIS SOFTWARE IS STRICTLY PROHIBITED AND MAY RESULT IN SEVERE CIVIL AND CRIMINAL PENALTIES.**

By accessing this repository, you acknowledge and agree to the following:

#### 1. Proprietary Rights

- This software, including all source code, documentation, design, architecture, and associated materials, is the exclusive property of **Ashirvad Business Management**.
- All intellectual property rights, including but not limited to copyrights, trademarks, trade secrets, and patents, are reserved.

#### 2. Prohibited Actions

You are **STRICTLY PROHIBITED** from:

- ❌ Copying, reproducing, or duplicating any part of this codebase
- ❌ Modifying, adapting, or creating derivative works
- ❌ Distributing, sublicensing, selling, or transferring this software
- ❌ Reverse engineering, decompiling, or disassembling the software
- ❌ Using this software for commercial purposes without explicit written permission
- ❌ Sharing access credentials or repository access with unauthorized parties
- ❌ Publicly disclosing any part of the source code, architecture, or business logic
- ❌ Using this software as a reference, template, or basis for other projects

#### 3. Confidentiality

- All information contained in this repository is **CONFIDENTIAL and PROPRIETARY**.
- You agree to maintain strict confidentiality and not disclose any information to third parties.
- This includes but is not limited to: source code, database schemas, API structures, business logic, algorithms, and documentation.

#### 4. Legal Consequences

Unauthorized use, copying, or distribution of this software may result in:

- **Civil Liability**: Monetary damages, injunctive relief, and recovery of attorney fees
- **Criminal Prosecution**: Under applicable copyright laws, trade secret laws, and computer fraud statutes
- **Statutory Damages**: Up to $150,000 per work infringed under U.S. Copyright Act (17 U.S.C. § 504)
- **International Legal Action**: Prosecution under laws of India, United States, and other jurisdictions

#### 5. Authorized Use

- Access to this repository is granted ONLY to specifically authorized individuals for legitimate business purposes.
- Any authorized use is subject to a separate written agreement.
- Authorization may be revoked at any time without notice.

#### 6. Data Protection & Privacy

- This system processes sensitive business and financial data.
- All data is protected under applicable data protection laws (GDPR, IT Act 2000, etc.).
- Unauthorized access or disclosure of data may result in additional legal penalties.

#### 7. No Warranty

- This software is provided "AS IS" without any warranty of any kind.
- The copyright holder assumes no liability for any damages arising from authorized or unauthorized use.

#### 8. Governing Law

- This agreement is governed by the laws of **Gujarat, India**.
- Any disputes shall be subject to the exclusive jurisdiction of courts in **Bardoli, Gujarat, India**.

#### 9. Contact for Authorization

For licensing inquiries, authorized access requests, or legal questions, contact:

**Ashirvad Business Management**  
**Email:** mayadb01@gmail.com  
**Repository:** https://github.com/mayadb01-lgtm/Ashirvad-GH-Rest

### Third-Party Licenses

This project uses open-source libraries and frameworks. While the project itself is proprietary, the following third-party components are subject to their respective licenses:

- React (MIT License)
- Material-UI (MIT License)
- Express.js (MIT License)
- MongoDB (Server Side Public License)
- Other dependencies as listed in package.json

**Note:** Use of open-source libraries does NOT grant any rights to this proprietary software. The integration, customization, and business logic remain fully protected intellectual property.

---

### Violation Reporting

If you become aware of any unauthorized use, copying, or distribution of this software, please report immediately to:  
**mayadb01@gmail.com**

---

**Last Updated:** January 1, 2026  
**Version:** 1.0

---

**⚠️ WARNING: This repository is monitored. All access and activities are logged and may be used as evidence in legal proceedings.**

---

**Built with ❤️ for efficient business management | Protected by Law 🔒**
