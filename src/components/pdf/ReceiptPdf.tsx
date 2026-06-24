import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { paymentAcknowledgment } from "@/utils/docRules";

const RED = "#d6212c";
const NAVY = "#0c2340";
const MUTED = "#5f6670";
const BORDER = "#d8dee9";

const s = StyleSheet.create({
  page: { paddingHorizontal: 36, paddingVertical: 0, fontSize: 9, color: "#1a1a1a", fontFamily: "Helvetica", lineHeight: 1.35 },
  bar: { height: 14, backgroundColor: RED },
  body: { paddingTop: 26 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  title: { fontSize: 30, color: "#6b7280", fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  logo: { width: 110 },

  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  coName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY },
  coLine: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  metaCol: { width: 200, alignItems: "flex-end" },
  metaLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 2 },
  metaVal: { fontSize: 9, color: "#333", marginBottom: 4 },

  billLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY },
  billRule: { borderBottomWidth: 1, borderBottomColor: BORDER, marginTop: 2, marginBottom: 6 },
  billName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1a1a1a", marginBottom: 24 },

  th: { flexDirection: "row", backgroundColor: RED },
  thCell: { color: "#fff", fontSize: 8.5, fontFamily: "Helvetica-Bold", paddingVertical: 6, paddingHorizontal: 8 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER },
  td: { fontSize: 9, paddingVertical: 7, paddingHorizontal: 8 },
  cDesc: { flex: 1 },
  cQty: { width: 60, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cTot: { width: 90, textAlign: "right" },

  bottom: { flexDirection: "row", marginTop: 14 },
  left: { flex: 1, paddingRight: 16 },
  remarks: { fontSize: 8.5, color: MUTED, marginBottom: 14 },
  ackTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1a1a1a", marginBottom: 4 },
  ackText: { fontSize: 9, lineHeight: 1.5 },
  stamp: { width: 92, height: 94, marginTop: 14 },

  totals: { width: 220 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
  totLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: NAVY },
  grand: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 6, marginTop: 4 },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  grandVal: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
});

const money = (v: number | null | undefined) =>
  v == null ? "" : "AED " + Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: number | null | undefined) =>
  v == null ? "" : Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Doc = {
  number: string; doc_date: string | null;
  client_name: string | null; client_trn: string | null; client_address: string | null; client_email: string | null;
  subtotal: number | null; grand_total: number | null; payment_method: string | null; reference: string | null; notes: string | null;
};
type Item = { description: string | null; area: number | null; rate: number | null; amount: number | null };
type Settings = { legal_name?: string; address?: string; email?: string; phone?: string };

function dateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function ReceiptDocument({ doc, items, settings, logoSrc, stampSrc }: { doc: Doc; items: Item[]; settings: Settings; logoSrc?: string; stampSrc?: string }) {
  const total = Number(doc.grand_total ?? doc.subtotal ?? 0);
  const ack = paymentAcknowledgment(doc.payment_method, total, dateLabel(doc.doc_date));
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.bar} />
        <View style={s.body}>
          <View style={s.topRow}>
            <Text style={s.title}>RECEIPT</Text>
            {logoSrc ? <Image style={s.logo} src={logoSrc} /> : null}
          </View>

          <View style={s.infoRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={s.coName}>{settings.legal_name}</Text>
              {settings.address ? <Text style={s.coLine}>{settings.address}</Text> : null}
              {settings.phone ? <Text style={s.coLine}>{settings.phone}</Text> : null}
              {settings.email ? <Text style={s.coLine}>{settings.email}</Text> : null}
            </View>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>PAYMENT DATE</Text>
              <Text style={s.metaVal}>{dateLabel(doc.doc_date)}</Text>
              <Text style={s.metaLabel}>RECEIPT NO.</Text>
              <Text style={s.metaVal}>{doc.number}</Text>
            </View>
          </View>

          <Text style={s.billLabel}>BILL TO</Text>
          <View style={s.billRule} />
          <Text style={s.billName}>{doc.client_name}</Text>

          <View style={s.th}>
            <Text style={[s.thCell, s.cDesc]}>Description</Text>
            <Text style={[s.thCell, s.cQty]}>Qty</Text>
            <Text style={[s.thCell, s.cPrice]}>Unit Price</Text>
            <Text style={[s.thCell, s.cTot]}>Total</Text>
          </View>
          {(items.length ? items : [{ description: "Payment received", area: null, rate: null, amount: total }]).map((it, i) => (
            <View style={s.tr} key={i}>
              <Text style={[s.td, s.cDesc]}>{it.description}</Text>
              <Text style={[s.td, s.cQty]}>{it.area ?? ""}</Text>
              <Text style={[s.td, s.cPrice]}>{it.rate != null ? num(it.rate) : ""}</Text>
              <Text style={[s.td, s.cTot]}>{num(it.amount)}</Text>
            </View>
          ))}

          <View style={s.bottom} wrap={false}>
            <View style={s.left}>
              {doc.notes ? <Text style={s.remarks}>{doc.notes}</Text> : null}
              <Text style={s.ackTitle}>Payment Acknowledgment</Text>
              <Text style={s.ackText}>{ack}</Text>
              {doc.payment_method === "cheque" && doc.reference ? <Text style={[s.ackText, { marginTop: 3 }]}>Cheque: {doc.reference}</Text> : null}
              {stampSrc ? <Image style={s.stamp} src={stampSrc} /> : null}
            </View>
            <View style={s.totals}>
              <View style={s.totRow}><Text style={s.totLabel}>SUBTOTAL</Text><Text>{num(doc.subtotal ?? total)}</Text></View>
              <View style={s.grand}><Text style={s.grandLabel}>TOTAL</Text><Text style={s.grandVal}>{money(total)}</Text></View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
