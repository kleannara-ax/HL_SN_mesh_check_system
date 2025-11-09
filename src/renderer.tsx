import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children, title }) => (
  <html lang="ko" class="bg-slate-950">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta
        name="description"
        content="메쉬 구멍 청소 상태를 자동으로 판별하고 청소율을 계산하는 Cloudflare Pages 기반 웹 애플리케이션"
      />
      <title>{title ?? 'Mesh Cleanliness Inspector'}</title>
      <link rel="icon" href="/static/favicon.svg" />
      <link href="/static/style.css" rel="stylesheet" />
      <script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `tailwind.config = {
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#040714'
        }
      }
    }
  }
}`
        }}
      ></script>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        integrity="sha512-VK1mT6b+8gvOArLfn70WhBubcFGQ60zpWgkt8BkWtOZLDmcdVow2QI5i7oXWJ9icz6Z5thkUCvEw8gG8MXjC4A=="
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
    </head>
    <body class="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
  </html>
))
