import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { amountInWords } from "@/utils/amountInWords";

const NAVY = "#0c2340";
const GOLD = "#b08d57";
const LIGHT = "#f1f5f9";
const BORDER = "#d8dee9";
const MUTED = "#5f6670";

const s = StyleSheet.create({
  page: { paddingHorizontal: 32, paddingVertical: 28, fontSize: 9, color: "#1a1a1a", fontFamily: "Helvetica", lineHeight: 1.35 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  coName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY },
  coLine: { fontSize: 8, color: MUTED, marginTop: 1 },
  trn: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 2 },
  logo: { width: 120 },
  goldRule: { height: 2, backgroundColor: GOLD, marginTop: 10, marginBottom: 12 },

  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 1 },
  metaBox: { flexDirection: "row" },
  metaCell: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: BORDER },
  metaLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase" },
  metaVal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY },

  infoTable: { borderWidth: 1, borderColor: BORDER, marginBottom: 14 },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  infoLabel: { width: 90, backgroundColor: LIGHT, paddingHorizontal: 8, paddingVertical: 4, fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY },
  infoVal: { flex: 1, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9 },

  th: { flexDirection: "row", backgroundColor: NAVY },
  thCell: { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 5, paddingHorizontal: 6, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER },
  td: { fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 6 },
  cDesc: { flex: 1 },
  cQty: { width: 42, textAlign: "right" },
  cUnit: { width: 38, textAlign: "center" },
  cRate: { width: 55, textAlign: "right" },
  cAmt: { width: 75, textAlign: "right" },

  bottom: { flexDirection: "row", marginTop: 8 },
  words: { flex: 1, paddingRight: 12, justifyContent: "center" },
  wordsLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase" },
  wordsTxt: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 2 },
  totals: { width: 220 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 6 },
  totGrand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 6, backgroundColor: NAVY },
  totGrandTxt: { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 11 },

  bank: { marginTop: 18, flexDirection: "row", alignItems: "flex-end" },
  bankCol: { width: "70%" },
  bankRow: { flexDirection: "row", marginBottom: 2 },
  bankLabel: { width: 90, fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY },
  bankVal: { fontSize: 8, flex: 1 },
  stampBox: { width: "30%", alignItems: "flex-end", paddingRight: 4 },
  stamp: { width: 82, height: 84 },
});

const money = (v: number | null | undefined) =>
  v == null ? "" : "AED " + Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Doc = {
  number: string; doc_date: string | null;
  client_name: string | null; client_trn: string | null; client_address: string | null; client_email: string | null;
  subtotal: number | null; vat_rate: number | null; vat_amount: number | null; grand_total: number | null;
  amount_in_words: string | null;
};
type Item = { sr_no: number | null; description: string | null; area: number | null; unit: string | null; rate: number | null; amount: number | null };
type Settings = {
  legal_name?: string; address?: string; email?: string; phone?: string; trn?: string;
  bank_account_name?: string; bank_account_no?: string; bank_iban?: string; bank_currency?: string; bank_name?: string;
};

export function InvoiceDocument({ doc, items, settings, logoSrc, stampSrc }: { doc: Doc; items: Item[]; settings: Settings; logoSrc?: string; stampSrc?: string }) {
  const words = doc.amount_in_words || amountInWords(doc.grand_total);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.coName}>{settings.legal_name}</Text>
            <Text style={[s.coLine, { marginTop: 4 }]}>{settings.address}</Text>
            <Text style={s.coLine}>{settings.email}  ·  {settings.phone}</Text>
            <Text style={s.trn}>TRN: {settings.trn}</Text>
          </View>
          {logoSrc ? <Image style={s.logo} src={logoSrc} /> : null}
        </View>
        <View style={s.goldRule} />

        <View style={s.titleRow}>
          <Text style={s.title}>TAX INVOICE</Text>
          <View style={s.metaBox}>
            <View style={s.metaCell}><Text style={s.metaLabel}>Invoice No.</Text><Text style={s.metaVal}>{doc.number}</Text></View>
            <View style={s.metaCell}><Text style={s.metaLabel}>Date</Text><Text style={s.metaVal}>{doc.doc_date ?? ""}</Text></View>
          </View>
        </View>

        <View style={s.infoTable}>
          <View style={s.infoRow}><Text style={s.infoLabel}>Name</Text><Text style={[s.infoVal, { fontFamily: "Helvetica-Bold" }]}>{doc.client_name}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>TRN</Text><Text style={s.infoVal}>{doc.client_trn ?? ""}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>Address</Text><Text style={s.infoVal}>{doc.client_address ?? ""}</Text></View>
          <View style={[s.infoRow, { borderBottomWidth: 0 }]}><Text style={s.infoLabel}>Email</Text><Text style={s.infoVal}>{doc.client_email ?? ""}</Text></View>
        </View>

        <View style={s.th} fixed>
          <Text style={[s.thCell, s.cDesc]}>Description</Text>
          <Text style={[s.thCell, s.cQty]}>Qty</Text>
          <Text style={[s.thCell, s.cUnit]}>Unit</Text>
          <Text style={[s.thCell, s.cRate]}>Rate</Text>
          <Text style={[s.thCell, s.cAmt]}>Total</Text>
        </View>
        {items.map((it, i) => (
          <View style={s.tr} key={i} wrap={false}>
            <Text style={[s.td, s.cDesc]}>{it.description ?? ""}</Text>
            <Text style={[s.td, s.cQty]}>{it.area ?? ""}</Text>
            <Text style={[s.td, s.cUnit]}>{it.unit ?? ""}</Text>
            <Text style={[s.td, s.cRate]}>{it.rate != null ? Number(it.rate).toLocaleString() : ""}</Text>
            <Text style={[s.td, s.cAmt]}>{money(it.amount)}</Text>
          </View>
        ))}

        <View wrap={false}>
        <View style={s.bottom}>
          <View style={s.words}>
            <Text style={s.wordsLabel}>Amount in words</Text>
            <Text style={s.wordsTxt}>{words}</Text>
          </View>
          <View style={s.totals}>
            <View style={s.totRow}><Text style={{ color: MUTED }}>Sub Total</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{money(doc.subtotal)}</Text></View>
            <View style={s.totRow}><Text style={{ color: MUTED }}>VAT {doc.vat_rate ?? 5}%</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{money(doc.vat_amount)}</Text></View>
            <View style={s.totGrand}><Text style={s.totGrandTxt}>Grand Total</Text><Text style={s.totGrandTxt}>{money(doc.grand_total)}</Text></View>
          </View>
        </View>

        <View style={s.bank}>
          <View style={s.bankCol}>
            <View style={s.bankRow}><Text style={s.bankLabel}>Account Name</Text><Text style={s.bankVal}>{settings.bank_account_name}</Text></View>
            <View style={s.bankRow}><Text style={s.bankLabel}>Account No.</Text><Text style={s.bankVal}>{settings.bank_account_no}</Text></View>
            <View style={s.bankRow}><Text style={s.bankLabel}>IBAN</Text><Text style={s.bankVal}>{settings.bank_iban}</Text></View>
            <View style={s.bankRow}><Text style={s.bankLabel}>Currency</Text><Text style={s.bankVal}>{settings.bank_currency}</Text></View>
            <View style={s.bankRow}><Text style={s.bankLabel}>Bank</Text><Text style={s.bankVal}>{settings.bank_name}</Text></View>
          </View>
          <View style={s.stampBox}>
            {stampSrc ? <Image style={s.stamp} src={stampSrc} /> : null}
          </View>
        </View>
        </View>
      </Page>
    </Document>
  );
}
