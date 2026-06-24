# WorkShip Frontend

## Production deploy

This frontend is configured for a static Vercel deployment.

### Required environment variable

`VITE_API_BASE_URL`

Example:

```bash
VITE_API_BASE_URL=https://your-backend-url.example.com
```

### Vercel settings

- Build command: `npm run build`
- Output directory: `dist/client`

### Notes

- SPA fallback is handled in `vercel.json`.
- The build now prerenders a production `index.html` into `dist/client`.
