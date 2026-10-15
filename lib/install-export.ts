type Cell = string | number
const encoder = new TextEncoder()
const escapeXml = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)

// A small uncompressed ZIP writer for the five OOXML files in this report.
// Inline string cells ensure app names are never interpreted as formulas.
function zip(files: Record<string, string>) {
  const chunks: Uint8Array[] = [], directory: Uint8Array[] = []
  let offset = 0
  function header(size: number) { const bytes = new Uint8Array(size); return { bytes, view: new DataView(bytes.buffer) } }
  for (const [path, xml] of Object.entries(files)) {
    const name = encoder.encode(path), data = encoder.encode(xml)
    let crc = 0xffffffff
    for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0) }
    crc = (crc ^ 0xffffffff) >>> 0
    const local = header(30)
    local.view.setUint32(0, 0x04034b50, true); local.view.setUint16(4, 20, true)
    local.view.setUint16(12, 33, true) // DOS date: 1980-01-01
    local.view.setUint32(14, crc, true); local.view.setUint32(18, data.length, true); local.view.setUint32(22, data.length, true); local.view.setUint16(26, name.length, true)
    chunks.push(local.bytes, name, data)
    const central = header(46)
    central.view.setUint32(0, 0x02014b50, true); central.view.setUint16(4, 20, true); central.view.setUint16(6, 20, true); central.view.setUint16(14, 33, true)
    central.view.setUint32(16, crc, true); central.view.setUint32(20, data.length, true); central.view.setUint32(24, data.length, true); central.view.setUint16(28, name.length, true); central.view.setUint32(42, offset, true)
    directory.push(central.bytes, name)
    offset += local.bytes.length + name.length + data.length
  }
  const end = header(22), size = directory.reduce((n, part) => n + part.length, 0)
  end.view.setUint32(0, 0x06054b50, true); end.view.setUint16(8, Object.keys(files).length, true); end.view.setUint16(10, Object.keys(files).length, true); end.view.setUint32(12, size, true); end.view.setUint32(16, offset, true)
  const all = [...chunks, ...directory, end.bytes], bytes = new Uint8Array(offset + size + 22)
  let cursor = 0
  for (const part of all) { bytes.set(part, cursor); cursor += part.length }
  return bytes
}

export function installWorkbook({ appName, start, end, rows }: {
  appName: string; start: string; end: string; rows: Array<{ metric_date: string; installs: number }>
}) {
  const cells: Cell[][] = [['نام اپلیکیشن', appName], ['از تاریخ', start], ['تا تاریخ', end], [], ['تاریخ', 'تعداد نصب'],
    ...rows.filter(row => row.metric_date >= start && row.metric_date <= end).map(row => [row.metric_date, row.installs] as Cell[])]
  const xmlRows = cells.map((row, i) => `<row r="${i + 1}">${row.map((cell, j) => {
    const ref = `${String.fromCharCode(65 + j)}${i + 1}`
    return typeof cell === 'number' && Number.isFinite(cell) ? `<c r="${ref}"><v>${cell}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(cell))}</t></is></c>`
  }).join('')}</row>`).join('')
  return zip({
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="روند نصب" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews><cols><col min="1" max="2" width="35" customWidth="1"/></cols><sheetData>${xmlRows}</sheetData></worksheet>`,
  })
}

export function downloadInstallWorkbook(options: Parameters<typeof installWorkbook>[0]) {
  const data = installWorkbook(options)
  const url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url; link.download = `netstore-installs-${options.start}-${options.end}.xlsx`
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
