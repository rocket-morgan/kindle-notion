# 📚 Kindle Notion

A minimal Notion document browser optimized for Kindle Paperwhite's experimental browser (e-ink displays).

## Features

- ✅ Ultra-simple HTML compatible with Kindle's limited WebKit browser
- ✅ Session-based authentication (username/password)
- ✅ Browse Notion databases and pages
- ✅ Render blocks: paragraphs, headings, lists, code, quotes, to-dos
- ✅ Server-side pagination (Kindle-friendly)
- ✅ Edge Runtime for fast cold starts
- ✅ Ready for Vercel deployment

## Why?

Kindle Paperwhite has an experimental browser that's extremely limited:
- No modern JavaScript
- Basic CSS support (no flexbox/grid)
- Slow touch interactions
- E-ink display (grayscale only)

This app renders Notion content as simple, readable HTML that works perfectly on e-ink.

## Quick Start

### 1. Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it (e.g., "Kindle Reader")
4. Select your workspace
5. Capabilities: "Read content" (minimum)
6. Copy the **Internal Integration Secret** (starts with `ntn_`)

### 2. Share Database with Integration

**Important:** You must share each database/page you want to access:

1. Open your database in Notion
2. Click `...` (three dots) top right
3. Click "Connections" → "Connect to"
4. Find and select your integration
5. Confirm

### 3. Get Database ID

From your database URL:
```
https://www.notion.so/abc123def456789012345678abcdef12?v=...
                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                      This is your DATABASE_ID
```

### 4. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/kindle-notion)

Or manually:

```bash
npm install -g vercel
vercel login
cd kindle-notion
vercel --prod
```

### 5. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NOTION_API_KEY` | Integration secret | `ntn_xxxxx` |
| `NOTION_DATABASE_ID` | Root database ID | `762ef0e4...` |
| `ADMIN_USER` | Login username | `kindle` |
| `ADMIN_PASS` | Login password | `your-secure-pass` |
| `SESSION_SECRET` | Cookie signing key | `random-32-chars` |

## Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev
```

## Usage on Kindle

1. Open Kindle's experimental browser
2. Navigate to your Vercel URL
3. Enter username and password
4. Browse your documents!

## Kindle Tips

- The browser is slow — be patient
- Long documents have pagination links
- Images/videos are not shown (e-ink limitation)
- High contrast improves readability
- Bookmark the login page for quick access

## Supported Notion Blocks

| Block Type | Rendered As |
|------------|-------------|
| Paragraph | `<p>` |
| Heading 1-3 | `<h1>`, `<h2>`, `<h3>` |
| Bulleted List | `<ul><li>` |
| Numbered List | `<ol><li>` |
| Quote | `<blockquote>` |
| Code | `<pre><code>` |
| To-do | Checkbox + text |
| Divider | `<hr>` |
| Child Page | Link to page |
| Child Database | Link to database |
| Image/Video/Embed | `[multimedia]` placeholder |

## Tech Stack

- **Framework:** [Hono](https://hono.dev) (lightweight, edge-compatible)
- **Notion SDK:** [@notionhq/client](https://github.com/makenotion/notion-sdk-js)
- **Runtime:** Vercel Edge Runtime
- **Language:** TypeScript

## Project Structure

```
kindle-notion/
├── api/
│   └── index.ts          # Main app (Hono + Vercel Edge)
├── src/                   # (Optional) Modular source files
├── package.json
├── tsconfig.json
├── vercel.json           # Vercel configuration
└── .env.example          # Environment template
```

## Security Notes

- Passwords are compared in plain text (single-user app)
- Session tokens are base64-encoded (adequate for personal use over HTTPS)
- For multi-user scenarios, consider proper hashing (bcrypt)

## License

MIT

## Contributing

PRs welcome! Please keep the code minimal and Kindle-compatible.
