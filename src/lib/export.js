export function exportToCsv(filename, rows) {
  if (!rows || !rows.length) return

  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(';'),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? ''
          const safe = String(value).replace(/"/g, '""')
          return `"${safe}"`
        })
        .join(';')
    ),
  ].join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function printHtml(title, html) {
  const win = window.open('', '_blank', 'width=1100,height=800')
  if (!win) return

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #111;
          }
          h1, h2, h3 {
            margin-top: 0;
          }
          .meta {
            margin-bottom: 16px;
          }
          .box {
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background: #f3f3f3;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `)

  win.document.close()
  win.focus()
  win.print()
}