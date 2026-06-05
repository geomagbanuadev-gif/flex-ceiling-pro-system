import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

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
  logo: { width: 64 },
  goldRule: { height: 2, backgroundColor: GOLD, marginTop: 10, marginBottom: 12 },

  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 1 },
  metaBox: { flexDirection: "row", gap: 0 },
  metaCell: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: BORDER },
  metaLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase" },
  metaVal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY },

  infoTable: { borderWidth: 1, borderColor: BORDER, marginBottom: 14 },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  infoLabel: { width: 110, backgroundColor: LIGHT, paddingHorizontal: 8, paddingVertical: 4, fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY },
  infoVal: { flex: 1, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9 },

  th: { flexDirection: "row", backgroundColor: NAVY },
  thCell: { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 5, paddingHorizontal: 6, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER },
  td: { fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 6 },
  cSr: { width: 26, textAlign: "center" },
  cDesc: { flex: 1 },
  cArea: { width: 40, textAlign: "right" },
  cUnit: { width: 38, textAlign: "center" },
  cRate: { width: 55, textAlign: "right" },
  cAmt: { width: 70, textAlign: "right" },

  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  totals: { width: 220 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 6 },
  totGrand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 6, backgroundColor: NAVY },
  totGrandTxt: { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 11 },

  termsRow: { flexDirection: "row", gap: 16, marginTop: 16 },
  termsCol: { flex: 1 },
  termsHead: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase", marginBottom: 3 },
  termsTxt: { fontSize: 8, color: "#333" },

  sign: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, paddingTop: 6, borderTopWidth: 1, borderTopColor: BORDER, fontSize: 8 },

  bank: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  bankCol: { flex: 1 },
  bankRow: { flexDirection: "row", marginBottom: 2 },
  bankLabel: { width: 90, fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY },
  bankVal: { fontSize: 8 },
  stamp: { width: 92, height: 92, marginLeft: 12 },
});

const money = (v: number | null | undefined) =>
  v == null ? "" : "AED " + Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Doc = {
  number: string;
  doc_date: string | null;
  client_name: string | null;
  client_trn: string | null;
  client_address: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  reference: string | null;
  subtotal: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  grand_total: number | null;
  payment_terms: string | null;
  validity_days: number | null;
};
type Item = { sr_no: number | null; description: string | null; area: number | null; unit: string | null; rate: number | null; amount: number | null };
type Settings = {
  legal_name?: string; address?: string; email?: string; phone?: string; trn?: string;
  bank_account_name?: string; bank_account_no?: string; bank_iban?: string; bank_currency?: string; bank_name?: string;
};

export function QuoteDocument({ doc, items, settings, logoSrc, stampSrc }: { doc: Doc; items: Item[]; settings: Settings; logoSrc?: string; stampSrc?: string }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.coName}>{settings.legal_name}</Text>
            <Text style={s.coLine}>{settings.address}</Text>
            <Text style={s.coLine}>{settings.email}  ·  {settings.phone}</Text>
            <Text style={s.trn}>TRN: {settings.trn}</Text>
          </View>
          {logoSrc ? <Image style={s.logo} src={logoSrc} /> : null}
        </View>
        <View style={s.goldRule} />

        {/* Title + meta */}
        <View style={s.titleRow}>
          <Text style={s.title}>QUOTATION</Text>
          <View style={s.metaBox}>
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Quote No.</Text>
              <Text style={s.metaVal}>{doc.number}</Text>
            </View>
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaVal}>{doc.doc_date ?? ""}</Text>
            </View>
          </View>
        </View>

        {/* Client info */}
        <View style={s.infoTable}>
          <View style={s.infoRow}><Text style={s.infoLabel}>Quotation To</Text><Text style={[s.infoVal, { fontFamily: "Helvetica-Bold" }]}>{doc.client_name}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>Contact Person</Text><Text style={s.infoVal}>{doc.contact_person ?? ""}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>Contact No.</Text><Text style={s.infoVal}>{doc.contact_phone ?? ""}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>Address</Text><Text style={s.infoVal}>{doc.client_address ?? ""}</Text></View>
          <View style={[s.infoRow, { borderBottomWidth: 0 }]}><Text style={s.infoLabel}>Reference</Text><Text style={s.infoVal}>{doc.reference ?? ""}</Text></View>
        </View>

        {/* Items */}
        <View style={s.th}>
          <Text style={[s.thCell, s.cSr]}>SR</Text>
          <Text style={[s.thCell, s.cDesc]}>Task Description</Text>
          <Text style={[s.thCell, s.cArea]}>Area</Text>
          <Text style={[s.thCell, s.cUnit]}>Unit</Text>
          <Text style={[s.thCell, s.cRate]}>Rate</Text>
          <Text style={[s.thCell, s.cAmt]}>Amount</Text>
        </View>
        {items.map((it, i) => (
          <View style={s.tr} key={i} wrap={false}>
            <Text style={[s.td, s.cSr]}>{it.sr_no ?? i + 1}</Text>
            <Text style={[s.td, s.cDesc]}>{it.description ?? ""}</Text>
            <Text style={[s.td, s.cArea]}>{it.area ?? ""}</Text>
            <Text style={[s.td, s.cUnit]}>{it.unit ?? ""}</Text>
            <Text style={[s.td, s.cRate]}>{it.rate != null ? Number(it.rate).toLocaleString() : ""}</Text>
            <Text style={[s.td, s.cAmt]}>{money(it.amount)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsWrap}>
          <View style={s.totals}>
            <View style={s.totRow}><Text style={{ color: MUTED }}>Sub Total</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{money(doc.subtotal)}</Text></View>
            <View style={s.totRow}><Text style={{ color: MUTED }}>VAT {doc.vat_rate ?? 5}%</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{money(doc.vat_amount)}</Text></View>
            <View style={s.totGrand}><Text style={s.totGrandTxt}>Grand Total</Text><Text style={s.totGrandTxt}>{money(doc.grand_total)}</Text></View>
          </View>
        </View>

        {/* Terms */}
        <View style={s.termsRow}>
          <View style={s.termsCol}>
            <Text style={s.termsHead}>Payment Terms</Text>
            <Text style={s.termsTxt}>{doc.payment_terms ?? ""}</Text>
          </View>
          <View style={s.termsCol}>
            <Text style={s.termsHead}>Quote Validity</Text>
            <Text style={s.termsTxt}>Valid for {doc.validity_days ?? 7} days from the date of this quote.</Text>
          </View>
        </View>

        <View style={s.sign}>
          <Text>{settings.legal_name}</Text>
          <Text style={{ color: MUTED }}>Submitted By</Text>
        </View>

        {/* Bank */}
        <View style={s.bank}>
          <View style={s.bankCol}>
            <View style={s.bankRow}><Text style={s.bankLabel}>Account Name</Text><Text style={s.bankVal}>{settings.bank_account_name}</Text></View>
            <View style={s.bankRow}><Text style={s.bankLabel}>Account No.</Text><Text style={s.bankVal}>{settings.bank_account_no}</Text></View>
            <View style={s.bankRow}><Text style={s.bankLabel}>IBAN</Text><Text style={s.bankVal}>{settings.bank_iban}</Text></View>
            <View style={s.bankRow}><Text style={s.bankLabel}>Currency</Text><Text style={s.bankVal}>{settings.bank_currency}</Text></View>
            <View style={s.bankRow}><Text style={s.bankLabel}>Bank</Text><Text style={s.bankVal}>{settings.bank_name}</Text></View>
          </View>
          {stampSrc ? <Image style={s.stamp} src={stampSrc} /> : null}
        </View>
      </Page>
    </Document>
  );
}
