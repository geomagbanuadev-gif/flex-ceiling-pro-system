import { renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";
import { QuoteDocument } from "@/components/pdf/QuotePdf";
import { InvoiceDocument } from "@/components/pdf/InvoicePdf";

function asset(file: string): string | undefined {
  try {
    return "data:image/png;base64," + fs.readFileSync(path.join(process.cwd(), "public", file)).toString("base64");
  } catch {
    return undefined;
  }
}

type Row = Record<string, unknown>;

/** Render a document (quote or invoice) to a PDF buffer. */
export async function renderDocumentPdf(doc: Row, items: Row[], fallbackSettings: Row | null) {
  const logoSrc = asset("logo-full.png");
  const stampSrc = asset("stamp.png");
  const settings = (doc.supplier_snapshot as Row) ?? fallbackSettings ?? {};
  const props = { doc, items, settings, logoSrc, stampSrc } as unknown as Parameters<typeof QuoteDocument>[0];
  const element = doc.type === "invoice" || doc.type === "proforma"
    ? InvoiceDocument(props as unknown as Parameters<typeof InvoiceDocument>[0])
    : QuoteDocument(props);
  return renderToBuffer(element);
}

/** Build an inline-PDF HTTP response with a sensible filename. */
export function pdfResponse(pdf: Buffer | Uint8Array, doc: Row, disposition: "inline" | "attachment" = "inline") {
  const prefix = doc.type === "invoice" ? "Tax-Invoice" : doc.type === "proforma" ? "Proforma" : "Quotation";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${prefix}-${doc.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
