import "server-only";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Dark Hyprlyx email, table layout so it renders the same in Gmail, Apple Mail and Outlook. */
export function emailHtml(o: { preview: string; title: string; body: string; button: { label: string; url: string }; note?: string }) {
  const site = (process.env.NEXTAUTH_URL ?? "https://hyprlyx.com").replace(/\/$/, "");
  const url = esc(o.button.url);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${esc(o.title)}</title>
<style>:root{color-scheme:dark}body,table,td,div{background-color:inherit}[data-ogsc] .card,[data-ogsb] .card{background-color:#0f1011!important}a{color:#f7f8f8}@media (max-width:520px){.card{padding:28px 22px!important}.h1{font-size:26px!important}}</style>
</head>
<body bgcolor="#08090a" style="margin:0;padding:0;background:#08090a;background-color:#08090a;-webkit-font-smoothing:antialiased">
<div style="background:#08090a;background-color:#08090a;margin:0;padding:0;width:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preview)}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#08090a" style="background:#08090a;background-color:#08090a;width:100%;min-width:100%">
<tr><td align="center" style="padding:48px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
    <tr><td style="padding:0 4px 28px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="color:#f7f8f8;font:500 20px Georgia,serif;letter-spacing:-.02em" >Hyprlyx</td>
      </tr></table>
    </td></tr>
    <tr><td class="card" bgcolor="#0f1011" style="background:#0f1011;border:1px solid #23252a;border-radius:16px;padding:36px 34px">
      <h1 class="h1" style="margin:0 0 12px;color:#f7f8f8;font:400 30px/1.2 Newsreader,Georgia,'Times New Roman',serif;letter-spacing:-.02em">${esc(o.title)}</h1>
      <p style="margin:0 0 28px;color:#9ca0a8;font:400 15px/1.6 Inter,-apple-system,'Segoe UI',Arial,sans-serif">${esc(o.body)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#f7f8f8" style="border-radius:999px;background:#f7f8f8">
          <a href="${url}" target="_blank" style="display:inline-block;padding:13px 26px;color:#08090a;font:600 14px Inter,-apple-system,'Segoe UI',Arial,sans-serif;text-decoration:none;border-radius:999px">${esc(o.button.label)}</a>
        </td>
      </tr></table>
      ${o.note ? `<p style="margin:28px 0 0;color:#62666e;font:400 13px/1.6 Inter,-apple-system,'Segoe UI',Arial,sans-serif">${esc(o.note)}</p>` : ""}
      <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #1d1e21;color:#62666e;font:400 12px/1.6 Inter,-apple-system,'Segoe UI',Arial,sans-serif">
        Button not working? Paste this link into your browser:<br>
        <a href="${url}" style="color:#9ca0a8;word-break:break-all;text-decoration:underline">${url}</a>
      </p>
    </td></tr>
    <tr><td style="padding:24px 4px 0;color:#4b4f56;font:400 12px/1.6 Inter,-apple-system,'Segoe UI',Arial,sans-serif">
      Hyprlyx · Plan, write and rank in one workspace<br>
      <a href="${site}" style="color:#62666e;text-decoration:none">hyprlyx.com</a> &nbsp;·&nbsp;
      <a href="${site}/privacy" style="color:#62666e;text-decoration:none">Privacy</a>
    </td></tr>
  </table>
</td></tr></table>
</div>
</body></html>`;
}
