# Prayer App Documentation

Complete documentation for the Church Prayer Management System built with Angular, TypeScript, Supabase, and Microsoft Graph API.

---

## 🚀 Quick Start

New to the Prayer App? Start here:

1. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup from scratch
2. **[FEATURES.md](FEATURES.md)** - Learn all features and how to use them
3. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to production

---

## 📚 Core Documentation

### Setup & Configuration

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup guide
  - Supabase configuration
  - Database migrations
  - Edge functions deployment
  - Microsoft 365 email setup
  - Planning Center integration
  - Analytics setup

### Features & Usage

- **[FEATURES.md](FEATURES.md)** - All app features
  - Prayer request management
  - Prayer prompts
  - Prayer timer & printable lists
  - Email notifications
  - Theme settings
  - Admin features
  - Real-time updates

### Email System

- **[EMAIL_GUIDE.md](EMAIL_GUIDE.md)** - Email system guide
  - Microsoft Graph API setup
  - Email subscriber management
  - Automated prayer reminders
  - Email templates
  - Bulk sending & rate limits
  - Troubleshooting email issues

### Database

- **[DATABASE.md](DATABASE.md)** - Database guide
  - Schema overview
  - Table relationships
  - Row Level Security (RLS)
  - Migrations
  - Data management

### Deployment

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide
  - Edge functions deployment
  - Environment variables
  - Production checklist
  - Vercel/Netlify deployment

### Testing

- **[TESTING.md](TESTING.md)** - Testing guide
  - Running tests
  - Smoke tests
  - Verification testing
  - Real-time feature testing

### Troubleshooting

- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues
  - Connection errors
  - Email problems
  - Edge function debugging
  - Netlify issues
  - GitHub secrets
  - Linter configuration

---

## 📚 Additional Resources

### Backup & Restore

- **[BACKUP_GUIDE.md](BACKUP_GUIDE.md)** - Complete backup and restore guide
  - Automated daily backups (GitHub Actions)
  - Manual backups from Admin Portal
  - Restore procedures
  - Troubleshooting

### Quick Reference

All technical details are consolidated in the main documentation files:

- **Email Verification (2FA)** → [EMAIL_GUIDE.md](EMAIL_GUIDE.md) - Email Verification section
- **Admin Features** → [FEATURES.md](FEATURES.md) - Admin Portal section  
- **Data Persistence** → [FEATURES.md](FEATURES.md) - localStorage section
- **Planning Center** → [SETUP_GUIDE.md](SETUP_GUIDE.md) - Planning Center section

---

## 📦 Tech Stack

- **Frontend**: Angular 19+ with standalone components, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Email**: Microsoft Graph API / Microsoft 365 SMTP
- **Real-time**: Supabase Realtime
- **Hosting**: Vercel / Netlify
- **Styling**: Tailwind CSS
- **Testing**: Jasmine + Karma (Angular default testing framework)

---

## 📝 Recent Changes

**November 2025**:
- ✅ Consolidated documentation from 76 files to 9 core files
- ✅ Created comprehensive SETUP_GUIDE.md
- ✅ Enhanced FEATURES.md with all app features
- ✅ Unified email system in EMAIL_GUIDE.md
- ✅ Created BACKUP_GUIDE.md for backup procedures
- ✅ Removed obsolete documentation and archived historical files
- ✅ Updated all Microsoft Graph API references (removed Resend)

---

## 🔗 Quick Links

- [Main README](../README.md)
- [SQL Migrations](../supabase/migrations/)
- [Scripts](../scripts/)

---

**Last Updated**: November 2025  
**Documentation Version**: 2.0 (Consolidated)
