# Prayer App Documentation

Complete documentation for the Cross Pointe Church Prayer Management System.

## Quick Navigation

- **[FEATURES.md](FEATURES.md)** - All app features and how to use them
- **[SETUP.md](SETUP.md)** - Installation, configuration, and deployment
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Architecture, testing, development, timezone handling, prayer archiving, and component documentation
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solutions to common issues
- **[CHANGELOG.md](CHANGELOG.md)** - Project history and major milestones

---

## 📋 What This App Does

A comprehensive prayer request management system for Cross Pointe Church built with:
- **Frontend**: Angular 19+ with standalone components
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **Auth**: Supabase Auth with email verification
- **Email**: Microsoft 365 Graph API
- **Sync**: Planning Center integration
- **Testing**: Vitest with 2840+ tests

## 🎯 Core Capabilities

- ✅ Submit prayer requests (public, requires approval)
- ✅ Add prayer updates (logged-in users)
- ✅ Email notifications (configurable)
- ✅ Admin approval workflow
- ✅ Real-time updates via Supabase
- ✅ Prayer timer & printable lists
- ✅ Theme system (light/dark)
- ✅ Planning Center contact lookup
- ✅ Badge indicators (unread prayers/prompts)

## 🚀 Getting Started

### For Users
- View prayers at [Cross Pointe Prayer App](https://prayers.crosspointe.church)
- Submit new requests
- Configure your email preferences
- Use on mobile (iOS/Android)

### For Developers
1. Clone repo and run `npm install`
2. Copy `.env.example` to `.env.local`
3. Configure Supabase credentials
4. Run `npm run dev` for local development
5. Run `npm test` for tests

### For Deployment
See [SETUP.md - Deployment section](SETUP.md#deployment)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page components (home, admin, etc)
│   ├── services/         # Business logic services
│   ├── guards/           # Route guards
│   ├── types/            # TypeScript types
│   └── app.routes.ts     # Route definitions
├── environments/         # Environment configs
├── lib/                  # Utility libraries
├── styles.css            # Global styles
└── main.ts              # App entry point
```

---

## 🔑 Key Concepts

### Prayer States
- **Pending**: Awaiting admin approval
- **Approved**: Visible to all users
- **Denied**: Rejected by admin (user notified via email)
- **Answered**: Prayer was answered (user marks it)

### User Roles
- **Anonymous**: Can submit prayer requests only
- **Authenticated**: Can submit, update, manage prayers
- **Admin**: Can approve/deny, manage settings

### Email System
- Built on Microsoft 365 Graph API
- Queue-based processing (prevent rate limits)
- HTML templates with variable substitution
- Subscriber management (opt-in/out)

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **FEATURES.md** | Prayer requests, updates, admin tools, settings |
| **SETUP.md** | Installation, Supabase, email, Planning Center, deployment |
| **DEVELOPMENT.md** | Architecture, testing, performance optimization |
| **TROUBLESHOOTING.md** | Common errors and solutions |
| **CHANGELOG.md** | Project milestones and completed features |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Angular 19, TypeScript, TailwindCSS |
| **Backend** | Supabase (PostgreSQL, Edge Functions) |
| **Auth** | Supabase Auth, Email verification |
| **Email** | Microsoft 365 Graph API |
| **Testing** | Vitest, Playwright (E2E) |
| **Hosting** | Vercel |
| **Monitoring** | Clarity Analytics, Error logging |

---

## 📞 Support & Issues

- **Questions?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Found a bug?** Open an issue on GitHub
- **Have a suggestion?** Start a discussion

---

## 📄 License

Copyright © 2024-2026 Cross Pointe Church. All rights reserved.
