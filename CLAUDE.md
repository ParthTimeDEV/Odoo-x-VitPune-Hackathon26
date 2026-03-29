# Reimbursement Management System

## Project overview
A multi-role expense reimbursement platform built for a hackathon.
Companies struggle with manual, opaque expense approval processes.
This solves it with flexible multi-level approval workflows.

## Target platform
Designed as a standalone module that could plug into Odoo ERP.
Multi-tenant: every table is scoped by company_id.

- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT (httpOnly cookies preferred, fallback to Authorization header)
- Frontend: React + Vite, React Router v6 for navigation
- API communication: Axios with a base instance (src/api/axios.js)
- State management: React Context for auth state, local useState for UI state
- Styling: Tailwind CSS

## Project structure
/project-root
  /backend
    /src
      /routes
      /services
      /middleware
      /db
    server.js
    .env
  /frontend
    /src
      /pages        ← one file per role view
      /components   ← reusable UI pieces
      /api          ← axios calls
      /context      ← AuthContext
    index.html
  CLAUDE.md

## Roles & permissions
- Admin: auto-created on first signup, manages users/roles, configures approval rules
- Manager: approves/rejects expenses, sees amounts in company currency
- Employee: submits expenses, views own history

## Database tables (already designed)
1. companies — id, name, country_code, currency_code
2. users — id, company_id, email, password_hash, role, manager_id (self-ref FK)
3. expense_categories — id, company_id, name
4. expenses — id, company_id, employee_id, category_id, amount_submitted,
   currency_submitted, amount_company_currency, description, expense_date, status
5. receipt_files — id, expense_id, file_url, ocr_extracted_data (json)
6. approval_rules — id, company_id, category_id, name, is_manager_first,
   condition_mode (sequential|percentage|specific_user|hybrid),
   percentage_threshold, specific_approver_id
7. approval_rule_steps — id, rule_id, approver_user_id, step_order
8. expense_approvals — id, expense_id, rule_id, approver_user_id, step_order,
   status (pending|approved|rejected|skipped), comment, actioned_at

## External APIs
- Country + currency on signup: https://restcountries.com/v3.1/all?fields=name,currencies
- Live FX conversion: https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}

## Build phases
### Phase 1 (MVP — build this first)
- Signup auto-creates Company + Admin user, sets currency from country
- Admin creates employees and managers, assigns manager relationships
- Employee submits expense (amount, category, description, date)
- Expense routes to employee's direct manager (users.manager_id) for approve/reject

### Phase 2 (core differentiator)
- Currency conversion: fetch live rate on submission, store amount_company_currency
- Sequential multi-step approval chains (approval_rule_steps, step_order)
- Conditional rules engine: percentage threshold, specific user override, hybrid

### Phase 3 (stretch goal)
- OCR receipt scanning: upload image, auto-extract amount/date/merchant

## Key business logic rules
- manager_id on users table drives Phase 1 simple routing (no rules needed)
- expense_approvals is append-only — every action writes a new row (audit trail)
- amount_in_company_currency is frozen at submission time (not approval time)
- condition_mode drives evaluation: sequential=all must approve in order,
  percentage=X% approve then rest skipped, specific_user=one person auto-approves all,
  hybrid=percentage OR specific_user fires first
- is_manager_first flag on approval_rules inserts manager as step 0 before configured steps

## Coding conventions
- Always validate company_id scope on every query (multi-tenant safety)
- Return errors in { error: "message" } format
- Use async/await, no callbacks
- Keep route handlers thin — business logic goes in service files

Read CLAUDE.md fully before doing anything.

We are building Phase 1 only right now. Do NOT build Phase 2 or 3 yet.

Phase 1 tasks:
1. Initialize the project structure (package.json, folder layout: routes/, services/, db/, middleware/)
2. Set up PostgreSQL connection with all 8 tables from the schema in CLAUDE.md
3. Build signup endpoint — on first user signup, auto-create the Company,
   fetch country currency from restcountries.com API, assign Admin role
4. Build login endpoint with JWT
5. Build admin endpoints: create user, assign role, set manager relationship
6. Build employee endpoint: submit an expense
7. Build manager endpoint: view pending expenses, approve or reject with comment
8. Wire the approval routing: on expense submit, look up employee's manager_id
   and create a pending row in expense_approvals for that manager

Plan the full file structure first and show me before writing any code.
Use Shift+Tab twice to enter plan mode if needed.

Phase 1 is complete. Now build Phase 2.
Read CLAUDE.md for the approval engine logic.
Start with currency conversion — integrate exchangerate-api.com
so that amount_company_currency is calculated and stored on expense submission.
Plan first, then implement.

## Frontend conventions
- AuthContext stores: { user, role, token } — wrap App in AuthContextProvider
- Protected routes: check role before rendering, redirect to /login if unauthed
- Role-based routing:
    /login, /signup             → public
    /admin/*                    → Admin only
    /manager/approvals          → Manager only
    /employee/expenses          → Employee only
- After login, redirect based on role:
    admin → /admin/dashboard
    manager → /manager/approvals
    employee → /employee/expenses
- API base URL in .env: VITE_API_URL=http://localhost:5000
- Always show expense amounts in company currency on manager views
- Expense status badges: draft=gray, pending=amber, approved=green, rejected=red

## Backend CORS
- Allow origin: http://localhost:5173 (Vite default)
- Credentials: true (for cookies)

