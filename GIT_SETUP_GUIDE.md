# TourBNT - Git Repository Setup Guide

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Make the script executable
chmod +x init-new-repo.sh

# Run the initialization script
./init-new-repo.sh
```

The script will:
- Remove existing `.git` directory (with confirmation)
- Initialize a new Git repository
- Create `.env.example` files
- Create README.md
- Stage all files (excluding sensitive ones)
- Create initial commit

### Option 2: Manual Setup

```bash
# 1. Remove existing git history
rm -rf .git

# 2. Initialize new repository
git init
git branch -M main

# 3. Stage files
git add .

# 4. Create initial commit
git commit -m "Initial commit: TourBNT project"

# 5. Add remote and push
git remote add origin https://github.com/yourusername/TourBNT.git
git push -u origin main
```

## What Gets Excluded

The `.gitignore` file automatically excludes:

### Security & Sensitive Files
- ✗ All `.env` files (except `.env.example`)
- ✗ Deployment scripts (`deploy*.sh`, `setup-server*.sh`, etc.)
- ✗ SSH keys and certificates (`*.pem`, `*.key`, etc.)
- ✗ Server access files (`root@*`)
- ✗ Deployment documentation with server details

### Build & Dependencies
- ✗ `node_modules/`
- ✗ `.next/`, `dist/`, `build/`
- ✗ `package-lock.json`, `yarn.lock`

### IDE & OS Files
- ✗ `.DS_Store`, `.vscode/`, `.idea/`
- ✗ Log files (`*.log`)

## What Gets Included

✓ Source code (`frontend/`, `server/`)
✓ Configuration examples (`.env.example`)
✓ Documentation (`README.md`, `ROLE_MANAGEMENT.md`)
✓ Package definitions (`package.json`)
✓ TypeScript configs (`tsconfig.json`)
✓ Development docker compose (`docker-compose.yml`)

## What Gets Excluded (Besides Sensitive Files)

✗ `dashboard/` folder - Separate repository

## Creating GitHub Repository

1. Go to https://github.com/new
2. Repository name: `TourBNT`
3. Description: "Tour booking and management platform"
4. Visibility: Private (recommended) or Public
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

## Connecting to GitHub

```bash
# Add remote
git remote add origin https://github.com/yourusername/TourBNT.git

# Push to GitHub
git push -u origin main
```

## Verifying Security

Before pushing, verify no sensitive files are included:

```bash
# Check what will be committed
git status

# Check for sensitive patterns
git ls-files | grep -E '\.env$|\.pem$|deploy.*\.sh$'

# Should return nothing - if it shows files, they're being tracked!
```

## Environment Variables Setup

After cloning the repository, team members need to:

```bash
# 1. Copy example files
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
cp dashboard/.env.example dashboard/.env

# 2. Fill in actual values
# Edit each .env file with real credentials
```

## Common Git Commands

```bash
# Check status
git status

# Stage changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull

# Create new branch
git checkout -b feature/your-feature-name

# Switch branches
git checkout main
```

## Branch Strategy

### Main Branch
- Production-ready code
- Protected branch
- Requires pull request reviews

### Development Workflow
```bash
# 1. Create feature branch
git checkout -b feature/user-authentication

# 2. Make changes and commit
git add .
git commit -m "Add user authentication"

# 3. Push feature branch
git push origin feature/user-authentication

# 4. Create Pull Request on GitHub
# 5. After review, merge to main
```

## Troubleshooting

### Accidentally Committed Sensitive Files

```bash
# Remove file from Git but keep locally
git rm --cached server/.env

# Commit the removal
git commit -m "Remove sensitive file"

# Push changes
git push
```

### Need to Change Git History (DANGEROUS)

```bash
# Only if you committed sensitive data
# This rewrites history - coordinate with team!

# Remove file from all history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch server/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: This affects everyone)
git push origin --force --all
```

### Starting Fresh

```bash
# If you need to completely start over
rm -rf .git
./init-new-repo.sh
```

## Best Practices

1. **Never commit**:
   - `.env` files
   - API keys or passwords
   - SSH keys or certificates
   - Deployment scripts with server IPs

2. **Always commit**:
   - `.env.example` files
   - Source code
   - Documentation
   - Configuration templates

3. **Before pushing**:
   - Review `git status`
   - Check `git diff`
   - Verify no sensitive data

4. **Commit messages**:
   - Use clear, descriptive messages
   - Start with verb (Add, Fix, Update, Remove)
   - Reference issues if applicable

## Team Collaboration

### For New Team Members

```bash
# 1. Clone repository
git clone https://github.com/yourusername/TourBNT.git
cd TourBNT

# 2. Install dependencies
cd server && npm install
cd ../frontend && npm install

# 3. Set up environment variables
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env

# 4. Get credentials from team lead
# Fill in .env files with actual values

# 5. Start development
cd server && npm run dev
```

### For Repository Owner

Share with team:
- Repository URL
- Environment variable values (securely - not via Git!)
- Database connection strings
- API keys and secrets

**Use secure methods**:
- Password managers (1Password, LastPass)
- Encrypted messaging
- Secure file sharing
- Never via email or Slack

## Security Checklist

Before making repository public:

- [ ] All `.env` files are in `.gitignore`
- [ ] No API keys in code
- [ ] No passwords in code
- [ ] No server IPs or credentials
- [ ] Deployment scripts excluded
- [ ] README doesn't contain sensitive info
- [ ] Example files have placeholder values
- [ ] Git history doesn't contain secrets

## Support

If you encounter issues:
1. Check this guide
2. Review `.gitignore` file
3. Run `git status` to see what's tracked
4. Contact team lead for credentials

---

**Remember**: Once something is pushed to Git, it's very hard to completely remove. Always double-check before pushing!
