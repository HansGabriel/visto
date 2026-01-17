# Desktop App Environment Variables

## Required Variables

### VITE_API_URL
- **Description**: Backend server URL
- **Default**: `http://localhost:3000`
- **Example**: `VITE_API_URL=http://localhost:3000`

### VITE_POLLING_INTERVAL
- **Description**: Polling interval for pending requests (in milliseconds)
- **Default**: `2000` (2 seconds)
- **Example**: `VITE_POLLING_INTERVAL=2000`

## Optional Variables

### VITE_CLERK_PUBLISHABLE_KEY
- **Description**: Clerk authentication publishable key (optional)
- **Default**: None (app works without authentication)
- **Example**: `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`
- **Get your key**: https://dashboard.clerk.com

## Setup Instructions

1. Create a `.env` file in the `apps/desktop` directory
2. Add the required variables (see examples above)
3. Optionally add Clerk key if you want authentication
4. Restart the development server

## Example .env file

```env
# Required
VITE_API_URL=http://localhost:3000
VITE_POLLING_INTERVAL=2000

# Optional - Clerk Authentication
# VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Notes

- Clerk authentication is optional. The app will work without it.
- If you don't provide a Clerk key, users can use the app without signing in.
- All environment variables must be prefixed with `VITE_` to be accessible in the Vite app.
