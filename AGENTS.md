# AGENTS.md - Kindle Notion

## Project Overview

**Kindle Notion** is a minimal web application that allows browsing Notion documents on a Kindle Paperwhite device using its experimental browser.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              KINDLE PAPERWHITE BROWSER              │
│         (Limited WebKit, no modern JS/CSS)          │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS (simple HTML pages)
                      ▼
┌─────────────────────────────────────────────────────┐
│              VERCEL EDGE RUNTIME                    │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │   Auth      │  │   Notion     │  │  HTML     │  │
│  │  (cookies)  │──│   Client     │──│  Render   │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
│                                                     │
│  Framework: Hono (lightweight, edge-native)         │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────┐
│                   NOTION API                        │
│         (databases.query, pages.retrieve,           │
│          blocks.children.list)                      │
└─────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Edge Runtime
- Fast cold starts (~50ms vs ~500ms for Node.js)
- Globally distributed (low latency)
- No need for heavy dependencies

### 2. Single-File API
- `api/index.ts` contains all logic
- Easier to maintain and deploy
- Config read lazily via `getConfig()` for Edge compatibility

### 3. Kindle-Optimized HTML
- No external CSS (inline `<style>`)
- No JavaScript (pure HTML forms)
- Georgia serif font, 18px minimum
- High contrast (black on white)
- Large touch targets (12px+ padding on links)
- Server-side pagination (20 items per page)

### 4. Authentication
- Simple cookie-based sessions
- Base64-encoded token (user:secret)
- Adequate for single-user personal use over HTTPS

## Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/` | GET | No | Redirect to `/login` or `/docs` |
| `/login` | GET | No | Login form |
| `/login` | POST | No | Process login |
| `/logout` | GET | Yes | Clear session |
| `/docs` | GET | Yes | List root database |
| `/docs/:id` | GET | Yes | View page or database |
| `/health` | GET | No | Health check |

## Notion Block Rendering

The `blockToHtml()` function converts Notion blocks to simple HTML:

```typescript
switch(type) {
  case 'paragraph': // → <p>
  case 'heading_1': // → <h1>
  case 'bulleted_list_item': // → <li> (grouped in <ul>)
  case 'code': // → <pre><code>
  case 'image': // → <p>[multimedia]</p>
  // ...
}
```

Multimedia (images, videos, embeds) shows placeholder text since e-ink can't render them well.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NOTION_API_KEY` | Yes | Notion integration secret |
| `NOTION_DATABASE_ID` | Yes | Root database to browse |
| `ADMIN_USER` | Yes | Login username |
| `ADMIN_PASS` | Yes | Login password |
| `SESSION_SECRET` | Yes | Cookie signing secret |

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start local dev server (tsx)
npm run build        # Compile TypeScript
vercel --prod        # Deploy to production
```

## Common Issues

### "Database not found"
The database must be shared with your Notion integration:
1. Open database in Notion
2. Click ... → Connections → Connect to
3. Select your integration

### "Credentials incorrect"
Check that env vars don't have trailing newlines:
```bash
# Wrong (has newline)
echo "kindle" | vercel env add ADMIN_USER production

# Correct (no newline)
printf "kindle" | vercel env add ADMIN_USER production
```

### Slow on Kindle
Normal. The Kindle browser is experimental and slow. Server responds in <100ms but rendering takes seconds on e-ink.

## Future Improvements

- [ ] Search functionality
- [ ] Bookmark pages
- [ ] Dark mode toggle (for OLED Kindles)
- [ ] Cache pages for offline reading
- [ ] Multi-user support with proper auth

## Related

- [Notion API Docs](https://developers.notion.com/)
- [Hono Framework](https://hono.dev/)
- [Vercel Edge Runtime](https://vercel.com/docs/functions/edge-functions)
