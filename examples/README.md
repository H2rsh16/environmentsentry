# environmentsentrry Example Project

Run these commands to see environmentsentrry in action:

```bash
# Install dependencies
npm install

# Fix/create .env from .env.sample
environmentsentrry fix

# Check all environment variables
environmentsentrry check

# Scan source code for env usage
environmentsentrry usage

# Generate .env.sample from source code
environmentsentrry example

# Initialize secure vault
environmentsentrry vault init

# Store a sensitive value
environmentsentrry vault set DATABASE_URL "postgres://..."

# Production setup
environmentsentrry prod --force
```
