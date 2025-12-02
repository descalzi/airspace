# Development Setup

## Environment Variables Setup

This project uses environment variables for configuration.

### Prerequisites

This frontend application requires the **airspace-backend** proxy server to be running. The backend handles all API requests to OpenAIP and AirportDB services.

1. First, set up and start the backend server:
    - Navigate to the [airspace-backend](../airspace-backend) directory
    - Follow the setup instructions in its README
    - Start the server (default port: 3000)

### Frontend Setup

1. Copy the example environment file:

    ```bash
    cp .env.example .env
    ```

2. Edit `.env` and fill in your configuration:
    - **VITE_MAPBOX_TOKEN**: Get from [Mapbox Account](https://account.mapbox.com/access-tokens/)
    - **VITE_MAPBOX_STYLE**: Your Mapbox style URL (format: `mapbox://styles/username/style_id`)
    - **VITE_BACKEND_URL**: URL to your backend proxy server (default: `http://localhost:3000`)

3. Never commit the `.env` file - it's gitignored for security.

### Environment Files

- `.env` - Your local credentials (gitignored, never commit)
- `.env.example` - Template showing required variables (committed)
- `.env.local` - Optional local overrides (gitignored)

### Troubleshooting

**Error: "Missing required environment variable"**

- Make sure you've created `.env` from `.env.example`
- Verify all variables are set in `.env`
- Restart the dev server after changing `.env`

**Changes to .env not taking effect**

- Stop the dev server (Ctrl+C)
- Start it again: `pnpm run dev`
- Vite only loads .env files at startup

### Security Notes

- All variables prefixed with `VITE_` are exposed to the browser
- API credentials are stored securely in the backend server, not in the frontend
- Only the backend URL is exposed to the client
- Never commit sensitive credentials to version control

### For Production Deployment

Set environment variables in your hosting platform:

- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Build & Deploy → Environment
- **GitHub Pages**: Not supported (static hosting) - build locally with env vars set
