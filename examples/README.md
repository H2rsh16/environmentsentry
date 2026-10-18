# environmentsentry Example Project

Run these commands to see environmentsentry in action:

```bash
# Install dependencies
npm install

# Fix/create .env from .env.sample
environmentsentry fix

# Check all environment variables
environmentsentry check

# Scan source code for env usage
environmentsentry usage

# Generate .env.sample from source code
environmentsentry example

# Initialize secure vault
environmentsentry vault init

# Store a sensitive value
environmentsentry vault set DATABASE_URL "postgres://..."

# Production setup
environmentsentry prod --force
```
