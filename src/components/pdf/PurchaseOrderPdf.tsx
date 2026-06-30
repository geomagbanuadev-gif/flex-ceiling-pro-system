import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

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

  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  title: { fontSize: 21, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 1 },
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
  cUnit: { width: 40, textAlign: "center" },
  cPrice: { width: 60, textAlign: "right" },
  cAmt: { width: 72, textAlign: "right" },

  bottom: { flexDirection: "row", marginTop: 8 },
  words: { flex: 1, paddingRight: 12, justifyContent: "center" },
  wordsLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase" },
  wordsTxt: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 2 },
  note: { marginTop: 10, fontSize: 9, color: MUTED },
  totals: { width: 220 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 6 },
  totGrand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 6, backgroundColor: NAVY },
  totGrandTxt: { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 11 },

  foot: { marginTop: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  authorise: { fontSize: 8, color: MUTED },
  stamp: { width: 82, height: 84 },
});

const money = (v: number | null | undefined) =>
  v == null ? "" : "AED " + Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: number | null | undefined) => (v == null ? "" : Number(v).toLocaleString());

type Po = {
  number: string; po_date: string | null; expected_date: string | null; reference: string | null;
  supplier_name: string | null; supplier_trn: string | null; supplier_address: string | null; supplier_email: string | null;
  subtotal: number | null; discount: number | null; vat_rate: number | null; vat_amount: number | null; grand_total: number | null;
  amount_in_words: string | null; notes: string | null;
};
type Item = { description: string | null; quantity: number | null; unit: string | null; unit_price: number | null; amount: number | null };
type Settings = { legal_name?: string; address?: string; email?: string; phone?: string; trn?: string };

export function PurchaseOrderDocument({ po, items, settings, logoSrc, stampSrc }: { po: Po; items: Item[]; settings: Settings; logoSrc?: string; stampSrc?: string }) {
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
          <Text style={s.title}>PURCHASE ORDER</Text>
          <View style={s.metaBox}>
            <View style={s.metaCell}><Text style={s.metaLabel}>PO No.</Text><Text style={s.metaVal}>{po.number}</Text></View>
            <View style={s.metaCell}><Text style={s.metaLabel}>Date</Text><Text style={s.metaVal}>{po.po_date ?? ""}</Text></View>
            <View style={s.metaCell}><Text style={s.metaLabel}>Expected</Text><Text style={s.metaVal}>{po.expected_date ?? "—"}</Text></View>
          </View>
        </View>

        <View style={s.infoTable}>
          <View style={s.infoRow}><Text style={s.infoLabel}>Supplier</Text><Text style={[s.infoVal, { fontFamily: "Helvetica-Bold" }]}>{po.supplier_name}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>TRN</Text><Text style={s.infoVal}>{po.supplier_trn ?? ""}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>Address</Text><Text style={s.infoVal}>{po.supplier_address ?? ""}</Text></View>
          <View style={[s.infoRow, { borderBottomWidth: 0 }]}><Text style={s.infoLabel}>Reference</Text><Text style={s.infoVal}>{po.reference ?? ""}</Text></View>
        </View>

        <View style={s.th} fixed>
          <Text style={[s.thCell, s.cDesc]}>Material / Description</Text>
          <Text style={[s.thCell, s.cQty]}>Qty</Text>
          <Text style={[s.thCell, s.cUnit]}>Unit</Text>
          <Text style={[s.thCell, s.cPrice]}>Unit Price</Text>
          <Text style={[s.thCell, s.cAmt]}>Amount</Text>
        </View>
        {items.map((it, i) => (
          <View style={s.tr} key={i} wrap={false}>
            <Text style={[s.td, s.cDesc]}>{it.description}</Text>
            <Text style={[s.td, s.cQty]}>{it.quantity ?? ""}</Text>
            <Text style={[s.td, s.cUnit]}>{it.unit ?? ""}</Text>
            <Text style={[s.td, s.cPrice]}>{it.unit_price != null ? num(it.unit_price) : ""}</Text>
            <Text style={[s.td, s.cAmt]}>{money(it.amount)}</Text>
          </View>
        ))}

        <View wrap={false}>
          <View style={s.bottom}>
            <View style={s.words}>
              <Text style={s.wordsLabel}>Amount in words</Text>
              <Text style={s.wordsTxt}>{po.amount_in_words ?? ""}</Text>
            </View>
            <View style={s.totals}>
              <View style={s.totRow}><Text style={{ color: MUTED }}>Sub Total</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{money(po.subtotal)}</Text></View>
              {po.discount ? <View style={s.totRow}><Text style={{ color: MUTED }}>Discount</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>- {money(po.discount)}</Text></View> : null}
              <View style={s.totRow}><Text style={{ color: MUTED }}>VAT {po.vat_rate ?? 5}%</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{money(po.vat_amount)}</Text></View>
              <View style={s.totGrand}><Text style={s.totGrandTxt}>Grand Total</Text><Text style={s.totGrandTxt}>{money(po.grand_total)}</Text></View>
            </View>
          </View>

          {po.notes ? <Text style={s.note}>{po.notes}</Text> : null}

          <View style={s.foot}>
            <Text style={s.authorise}>Authorised by ____________________</Text>
            {stampSrc ? <Image style={s.stamp} src={stampSrc} /> : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
