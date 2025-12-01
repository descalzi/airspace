# Development Setup

## Environment Variables Setup

This project uses environment variables to manage API credentials securely.

### Initial Setup

1. Copy the example environment file:

    ```bash
    cp .env.example .env
    ```

2. Edit `.env` and fill in your API credentials:
    - **VITE_MAPBOX_TOKEN**: Get from [Mapbox Account](https://account.mapbox.com/access-tokens/)
    - **VITE_MAPBOX_STYLE**: Your Mapbox style URL (format: `mapbox://styles/username/style_id`)
    - **VITE_OPENAIP_API_KEY**: Get from [OpenAIP](https://www.openaip.net/)
    - **VITE_AIRPORTDB_API_TOKEN**: Get from [AirportDB](https://airportdb.io/)

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
- These are public-facing credentials (used client-side)
- Never commit API keys to version control
- Rotate credentials if accidentally exposed

### For Production Deployment

Set environment variables in your hosting platform:

- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Build & Deploy → Environment
- **GitHub Pages**: Not supported (static hosting) - build locally with env vars set
