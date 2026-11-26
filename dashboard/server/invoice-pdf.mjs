// Council invoice PDF in Pearl's layout (based on invoice PCJAP1126). Used by the
// browser (download / zip) and by the private server (email), so both produce the
// same document. Totals always come from the lines.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE = { width: 842, height: 595 }; // A4 landscape, in points
const MARGIN = 50;
const INK = rgb(0, 0, 0);
const GREY = rgb(0.851, 0.851, 0.851);
const MUTED = rgb(0.45, 0.45, 0.45);
// Date | Quantity | Description | Unit price | Total
const COLUMNS = [95, 150, 245, 170, 82];

const money = (value) => `£${Number(value ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plainNumber = (value) => {
  const number = Number(value ?? 0);
  return Number.isInteger(number) ? String(number) : number.toLocaleString("en-GB", { maximumFractionDigits: 2 });
};
export function ukDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

export function invoiceFileName(invoice) {
  return `Pearl Connexions Invoice ${String(invoice.invoice_number).replace(/[^\w.-]+/g, "_")}.pdf`;
}

/** Splits text into lines that fit the given width. */
function wrap(text, font, size, width) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !current) current = candidate;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/**
 * @param {object} input
 * @param {object} input.invoice finance_invoices row
 * @param {object[]} input.lines finance_invoice_lines rows, in order
 * @param {object|null} input.customer finance_customers row
 * @param {object|null} input.placement finance_placements row
 * @param {object} input.settings finance_settings row
 * @param {Uint8Array|ArrayBuffer|null} [input.logo] PNG bytes
 * @returns {Promise<Uint8Array>}
 */
export async function buildInvoicePdf({ invoice, lines, customer, placement, settings, logo }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${invoice.invoice_number}`);
  pdf.setAuthor(settings.company_name || "Pearl Connexions");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoImage = logo ? await pdf.embedPng(logo) : null;
  const right = PAGE.width - MARGIN;
  const tableWidth = COLUMNS.reduce((sum, width) => sum + width, 0);
  const columnX = COLUMNS.reduce((xs, width, index) => [...xs, xs[index] + width], [MARGIN]);

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;
  const text = (value, x, top, { font = regular, size = 9, color = INK, align = "left", width = 0 } = {}) => {
    const content = String(value ?? "");
    const textWidth = font.widthOfTextAtSize(content, size);
    const left = align === "right" ? x + width - textWidth : align === "center" ? x + (width - textWidth) / 2 : x;
    page.drawText(content, { x: left, y: top - size, size, font, color });
  };

  // Header: grey INVOICE box on the left, logo and strapline on the right.
  page.drawRectangle({ x: MARGIN, y: y - 34, width: 250, height: 34, color: GREY });
  text("INVOICE", MARGIN, y - 8, { font: bold, size: 20, align: "center", width: 250 });
  if (logoImage) {
    const logoWidth = 230;
    const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
    page.drawImage(logoImage, { x: right - logoWidth, y: y - logoHeight + 6, width: logoWidth, height: logoHeight });
    text("WHERE EVERY CONNEXION COUNTS", right - logoWidth, y - logoHeight + 2, { size: 7.5, color: MUTED, align: "center", width: logoWidth });
  }
  y -= 58;

  const period = invoice.period_start && invoice.period_end ? `${ukDate(invoice.period_start)} To ${ukDate(invoice.period_end)}` : "";
  const fields = [
    ["TO:", (customer?.name || invoice.customer_name || "").toUpperCase()],
    ["DATE:", ukDate(invoice.issued_on)],
    ["INVOICE NUMBER:", invoice.invoice_number],
    ["PERIOD:", period],
    ["PLACEMENT ADDRESS:", (placement?.placement_address || "").toUpperCase()],
    ["YOUNG PERSON:", placement?.young_person_initials || ""],
    ["SOCIAL WORKER:", (placement?.social_worker || "").toUpperCase()],
  ];
  for (const [label, value] of fields) {
    text(label, MARGIN + 2, y, { font: bold, size: 9 });
    text(value, MARGIN + 258, y, { size: 9 });
    if (label === "YOUNG PERSON:" && placement?.usn) {
      text("USN:", right - 210, y, { font: bold, size: 9 });
      text(placement.usn, right - 110, y, { size: 9, align: "right", width: 110 });
    }
    y -= 17;
  }
  y -= 8;

  // Line table.
  const cell = (index, top, height, { fill } = {}) => {
    page.drawRectangle({ x: columnX[index], y: top - height, width: COLUMNS[index], height, borderColor: INK, borderWidth: 0.75, color: fill });
  };
  const header = ["DATE", "QUANTITY", "DESCRIPTION", "UNIT PRICE", "TOTAL"];
  const drawHeader = () => {
    header.forEach((label, index) => {
      cell(index, y, 16, { fill: GREY });
      text(label, columnX[index], y - 4, { font: bold, size: 8.5, align: "center", width: COLUMNS[index] });
    });
    y -= 16;
  };
  drawHeader();

  for (const line of lines) {
    const description = wrap(line.description, regular, 9, COLUMNS[2] - 8);
    const height = Math.max(16, description.length * 11 + 5);
    if (y - height < MARGIN + 150) {
      page = pdf.addPage([PAGE.width, PAGE.height]);
      y = PAGE.height - MARGIN;
      text(`Invoice ${invoice.invoice_number} (continued)`, MARGIN, y, { font: bold, size: 10 });
      y -= 22;
      drawHeader();
    }
    COLUMNS.forEach((_, index) => cell(index, y, height));
    text(ukDate(line.line_date), columnX[0] + 4, y - 4, { size: 9 });
    text(line.quantity_label || plainNumber(line.quantity), columnX[1] + 4, y - 4, { size: 9 });
    description.forEach((row, index) => text(row, columnX[2] + 4, y - 4 - index * 11, { size: 9 }));
    text(money(line.unit_price), columnX[3], y - 4, { size: 9, align: "right", width: COLUMNS[3] - 6 });
    text(money(line.amount), columnX[4], y - 4, { size: 9, align: "right", width: COLUMNS[4] - 6 });
    y -= height;
  }

  // Total row.
  page.drawRectangle({ x: MARGIN, y: y - 17, width: tableWidth, height: 17, borderColor: INK, borderWidth: 0.75, color: GREY });
  page.drawLine({ start: { x: columnX[4], y }, end: { x: columnX[4], y: y - 17 }, thickness: 0.75, color: INK });
  text("TOTAL DUE", columnX[3], y - 4, { font: bold, size: 9.5, align: "right", width: COLUMNS[3] - 10 });
  text(money(invoice.amount_gbp), columnX[4], y - 4, { font: bold, size: 9.5, align: "right", width: COLUMNS[4] - 6 });
  y -= 36;

  // Footer: thanks, terms, bank details, contact and company details.
  const centred = (value, top, options = {}) => text(value, MARGIN, top, { size: 9, align: "center", width: tableWidth, ...options });
  centred(settings.thanks_line || "THANK YOU FOR YOUR BUSINESS!", y);
  y -= 20;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: right, y }, thickness: 0.8, color: INK, dashArray: [3, 2] });
  y -= 14;
  const terms = Number(customer?.payment_terms_days ?? 5);
  centred(`Payment Terms: Payment Due within ${terms} ${terms === 1 ? "day" : "days"} of invoice date`, y);
  y -= 14;
  const bank = [settings.account_name, settings.bank_name, settings.account_number && `Account Number: ${settings.account_number}`, settings.sort_code && `Sort Code: ${settings.sort_code}`].filter(Boolean);
  if (bank.length) centred(`BACS Payment to: ${bank.join("; ")}`, y);
  y -= 18;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: right, y }, thickness: 1.4, color: INK });
  y -= 16;
  if (settings.queries_email) centred(`FOR QUERIES REGARDING THIS INVOICE PLEASE CONTACT : ${settings.queries_email.toUpperCase()}`, y);
  y -= 14;
  centred([settings.trading_name || settings.company_name, [settings.address, settings.website].filter(Boolean).join(" ")].filter(Boolean).join(" | "), y);
  y -= 14;
  if (settings.company_number) centred(`Company Registration Number: ${settings.company_number}`, y);

  return pdf.save();
}
