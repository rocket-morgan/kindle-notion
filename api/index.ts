import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Client } from '@notionhq/client';
import type { Context, Next } from 'hono';
import type { PageObjectResponse, DatabaseObjectResponse, BlockObjectResponse, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';

export const config = { runtime: 'edge' };

// ============ CONFIG (lazy read) ============
const getConfig = () => ({
  notionApiKey: process.env.NOTION_API_KEY || '',
  notionDatabaseId: process.env.NOTION_DATABASE_ID || '',
  adminUser: process.env.ADMIN_USER || 'kindle',
  adminPass: process.env.ADMIN_PASS || 'changeme',
  sessionSecret: process.env.SESSION_SECRET || 'secret',
  cookieName: 'ks',
});

// ============ FONT SIZE ============
const FONT_SIZES = [16, 18, 20, 22, 24, 26, 28];
const DEFAULT_FONT_SIZE = 18;

const getFontSize = (c: Context): number => {
  const fs = getCookie(c, 'fs');
  const size = fs ? parseInt(fs, 10) : DEFAULT_FONT_SIZE;
  return FONT_SIZES.includes(size) ? size : DEFAULT_FONT_SIZE;
};

// ============ AUTH ============
const genToken = (u: string) => btoa(`${u}:${getConfig().sessionSecret}`);
const checkToken = (t: string) => { try { const [u,s] = atob(t).split(':'); return u === getConfig().adminUser && s === getConfig().sessionSecret; } catch { return false; } };
const isAuth = (c: Context) => { const t = getCookie(c, getConfig().cookieName); return t ? checkToken(t) : false; };

const authMw = async (c: Context, next: Next) => {
  if (!isAuth(c)) return c.redirect('/login');
  await next();
};

// ============ HTML ============
const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const layout = (c: Context, title: string, body: string, nav = true) => {
  const fontSize = getFontSize(c);
  const currentPath = c.req.path + (c.req.url.includes('?') ? '?' + c.req.url.split('?')[1] : '');
  const canDecrease = fontSize > FONT_SIZES[0];
  const canIncrease = fontSize < FONT_SIZES[FONT_SIZES.length - 1];
  
  const btnStyle = `display:inline-block;width:48px;height:48px;line-height:44px;text-align:center;font-size:24px;font-weight:bold;text-decoration:none;border:2px solid #000;margin-left:5px;`;
  const activeBtn = `${btnStyle}background:#000;color:#fff;`;
  const disabledBtn = `${btnStyle}background:#ccc;color:#888;border-color:#999;`;
  
  const fontControls = nav ? `<div style="position:fixed;top:10px;right:10px;z-index:99;">` +
    (canDecrease 
      ? `<a href="/font/down?back=${encodeURIComponent(currentPath)}" style="${activeBtn}">−</a>` 
      : `<span style="${disabledBtn}">−</span>`) +
    (canIncrease 
      ? `<a href="/font/up?back=${encodeURIComponent(currentPath)}" style="${activeBtn}">+</a>` 
      : `<span style="${disabledBtn}">+</span>`) +
    `</div>` : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font:${fontSize}px/1.6 Georgia,serif;padding:15px;padding-top:70px;background:#fff;color:#000}
h1{font-size:1.3em;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:15px}h2{font-size:1.1em;margin:15px 0 8px}
a{color:#000}.item{display:block;padding:12px 8px;border-bottom:1px solid #ccc}
input,button{font:inherit;padding:12px;border:2px solid #000;width:100%;margin-bottom:10px}
button{background:#000;color:#fff}blockquote{border-left:3px solid #000;padding-left:12px;margin:10px 0}
pre{background:#eee;padding:8px;overflow-x:auto;font-size:0.85em}code{background:#eee;padding:1px 3px}
ul,ol{margin:8px 0 8px 20px}li{margin-bottom:5px}.err{color:red;border:1px solid red;padding:8px;margin-bottom:10px}
.pg{margin-top:15px;text-align:center}.pg a{display:inline-block;padding:10px 15px;border:2px solid #000}</style>
</head><body>${fontControls}${nav ? '<p style="margin-bottom:15px"><a href="/docs">← Inicio</a> <a href="/logout" style="float:right">Salir</a></p>' : ''}${body}</body></html>`;
};

// ============ NOTION ============
const getNotion = () => new Client({ auth: getConfig().notionApiKey });

const getTitle = (o: any): string => {
  if (o.object === 'database') return o.title?.[0]?.plain_text || 'Sin título';
  for (const k in o.properties) {
    const p = o.properties[k];
    if (p.type === 'title' && p.title?.[0]) return p.title[0].plain_text;
  }
  return 'Sin título';
};

const getIcon = (o: any) => o.icon?.type === 'emoji' ? o.icon.emoji : '📄';

const rtToHtml = (rt: RichTextItemResponse[]) => rt.map(t => {
  let s = esc(t.plain_text);
  if (t.annotations.bold) s = `<b>${s}</b>`;
  if (t.annotations.italic) s = `<i>${s}</i>`;
  if (t.annotations.code) s = `<code>${s}</code>`;
  if (t.href) s = `<a href="${esc(t.href)}">${s}</a>`;
  return s;
}).join('');

const blockToHtml = (b: any): string => {
  const t = b.type;
  switch(t) {
    case 'paragraph': return `<p>${rtToHtml(b.paragraph.rich_text) || '&nbsp;'}</p>`;
    case 'heading_1': return `<h1>${rtToHtml(b.heading_1.rich_text)}</h1>`;
    case 'heading_2': return `<h2>${rtToHtml(b.heading_2.rich_text)}</h2>`;
    case 'heading_3': return `<h3>${rtToHtml(b.heading_3.rich_text)}</h3>`;
    case 'bulleted_list_item': return `<li>${rtToHtml(b.bulleted_list_item.rich_text)}</li>`;
    case 'numbered_list_item': return `<li>${rtToHtml(b.numbered_list_item.rich_text)}</li>`;
    case 'quote': return `<blockquote>${rtToHtml(b.quote.rich_text)}</blockquote>`;
    case 'code': return `<pre><code>${esc(b.code.rich_text?.[0]?.plain_text || '')}</code></pre>`;
    case 'divider': return '<hr>';
    case 'to_do': return `<p>${b.to_do.checked ? '☑' : '☐'} ${rtToHtml(b.to_do.rich_text)}</p>`;
    case 'child_page': return `<p class="item"><a href="/docs/${b.id}">📄 ${esc(b.child_page.title)}</a></p>`;
    case 'child_database': return `<p class="item"><a href="/docs/${b.id}">📊 ${esc(b.child_database.title)}</a></p>`;
    case 'image': case 'video': case 'embed': case 'file': return '<p><i>[multimedia]</i></p>';
    default: return '';
  }
};

const blocksToHtml = (blocks: any[]) => {
  let html = '', inUl = false, inOl = false;
  for (const b of blocks) {
    if (b.type === 'bulleted_list_item') {
      if (!inUl) { html += '<ul>'; inUl = true; }
      if (inOl) { html += '</ol>'; inOl = false; }
    } else if (b.type === 'numbered_list_item') {
      if (!inOl) { html += '<ol>'; inOl = true; }
      if (inUl) { html += '</ul>'; inUl = false; }
    } else {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
    }
    html += blockToHtml(b);
  }
  if (inUl) html += '</ul>';
  if (inOl) html += '</ol>';
  return html;
};

// ============ APP ============
const app = new Hono();

app.get('/', c => c.redirect(isAuth(c) ? '/docs' : '/login'));

// Font size controls
app.get('/font/up', c => {
  const current = getFontSize(c);
  const idx = FONT_SIZES.indexOf(current);
  const next = FONT_SIZES[Math.min(idx + 1, FONT_SIZES.length - 1)];
  setCookie(c, 'fs', String(next), { maxAge: 31536000, path: '/' });
  const back = c.req.query('back') || '/docs';
  return c.redirect(back);
});

app.get('/font/down', c => {
  const current = getFontSize(c);
  const idx = FONT_SIZES.indexOf(current);
  const next = FONT_SIZES[Math.max(idx - 1, 0)];
  setCookie(c, 'fs', String(next), { maxAge: 31536000, path: '/' });
  const back = c.req.query('back') || '/docs';
  return c.redirect(back);
});

app.get('/login', c => isAuth(c) ? c.redirect('/docs') : c.html(layout(c, 'Login', `
  <h1>📚 Kindle Notion</h1>
  <form method="POST" action="/login">
    <input name="user" placeholder="Usuario" required>
    <input name="pass" type="password" placeholder="Contraseña" required>
    <button>Entrar</button>
  </form>`, false)));

app.post('/login', async c => {
  const form = await c.req.formData();
  const u = form.get('user')?.toString() || '';
  const p = form.get('pass')?.toString() || '';
  if (u === getConfig().adminUser && p === getConfig().adminPass) {
    setCookie(c, getConfig().cookieName, genToken(u), { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 604800, path: '/' });
    return c.redirect('/docs');
  }
  return c.html(layout(c, 'Login', `<h1>📚 Kindle Notion</h1><div class="err">Credenciales incorrectas</div>
    <form method="POST" action="/login"><input name="user" placeholder="Usuario" required>
    <input name="pass" type="password" placeholder="Contraseña" required><button>Entrar</button></form>`, false));
});

app.get('/logout', c => { deleteCookie(c, getConfig().cookieName); return c.redirect('/login'); });

app.get('/health', c => c.json({ ok: true }));

// Protected
app.use('/docs/*', authMw);
app.use('/docs', authMw);

app.get('/docs', async c => {
  const cursor = c.req.query('cursor');
  try {
    const r = await getNotion().databases.query({ database_id: getConfig().notionDatabaseId, start_cursor: cursor || undefined, page_size: 20 });
    const items = r.results.map((p: any) => `<a class="item" href="/docs/${p.id}">${getIcon(p)} ${esc(getTitle(p))}</a>`).join('');
    const pg = r.has_more ? `<div class="pg"><a href="/docs?cursor=${r.next_cursor}">Siguiente →</a></div>` : '';
    return c.html(layout(c, 'Documentos', `<h1>📚 Documentos</h1>${items || '<p>Sin documentos</p>'}${pg}`));
  } catch (e: any) {
    return c.html(layout(c, 'Error', `<h1>Error</h1><p>${esc(e.message)}</p>`));
  }
});

app.get('/docs/:id', async c => {
  const id = c.req.param('id');
  const cursor = c.req.query('cursor');
  try {
    let obj: any;
    try { obj = await getNotion().pages.retrieve({ page_id: id }); }
    catch { obj = await getNotion().databases.retrieve({ database_id: id }); }

    if (obj.object === 'database') {
      const r = await getNotion().databases.query({ database_id: id, start_cursor: cursor || undefined, page_size: 20 });
      const items = r.results.map((p: any) => `<a class="item" href="/docs/${p.id}">${getIcon(p)} ${esc(getTitle(p))}</a>`).join('');
      const pg = r.has_more ? `<div class="pg"><a href="/docs/${id}?cursor=${r.next_cursor}">Siguiente →</a></div>` : '';
      return c.html(layout(c, getTitle(obj), `<h1>${esc(getTitle(obj))}</h1>${items || '<p>Sin items</p>'}${pg}`));
    }

    const blocks = await getNotion().blocks.children.list({ block_id: id, start_cursor: cursor || undefined, page_size: 100 });
    const html = blocksToHtml(blocks.results);
    const pg = blocks.has_more ? `<div class="pg"><a href="/docs/${id}?cursor=${blocks.next_cursor}">Continuar →</a></div>` : '';
    return c.html(layout(c, getTitle(obj), `<h1>${getIcon(obj)} ${esc(getTitle(obj))}</h1>${html}${pg}`));
  } catch (e: any) {
    return c.html(layout(c, 'Error', `<h1>Error</h1><p>${esc(e.message)}</p>`));
  }
});

export default handle(app);
