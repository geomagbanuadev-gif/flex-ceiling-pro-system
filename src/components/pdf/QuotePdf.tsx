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
  logo: { width: 120 },
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
  note: { marginTop: 10, fontSize: 9, color: "#c0392b", fontFamily: "Helvetica-Bold" },

  tcBox: { marginTop: 4, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6 },
  tcRow: { flexDirection: "row", marginBottom: 2 },
  tcNum: { width: 14, fontSize: 7.5, color: MUTED },
  tcTxt: { flex: 1, fontSize: 7.5, color: "#333" },
  extraBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 7 },
  bulletRow: { flexDirection: "row", marginBottom: 2 },
  bulletMark: { width: 10, fontSize: 7.2, color: MUTED },
  bulletTxt: { flex: 1, fontSize: 7.2, color: "#333" },
  completionRow: { flex: 1, flexDirection: "row", alignItems: "flex-end" },
  completionTxt: { fontSize: 7.2, color: "#333" },
  completionDays: { width: 32, marginHorizontal: 3, borderBottomWidth: 0.5, borderBottomColor: "#333", fontSize: 7.2, textAlign: "center", color: "#333" },

  sign: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 5, borderTopWidth: 1, borderTopColor: BORDER, fontSize: 8 },

  bank: { marginTop: 6, flexDirection: "row", alignItems: "flex-end" },
  bankCol: { width: "70%" },
  bankRow: { flexDirection: "row", marginBottom: 2 },
  bankLabel: { width: 90, fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY },
  bankVal: { fontSize: 8, flex: 1 },
  stampBox: { width: "30%", alignItems: "flex-end", paddingRight: 4 },
  stamp: { width: 70, height: 72 },
});

const TERMS = [
  "Electricity for the work provided by the client.",
  "Work site should be clear and access provided by the client.",
  "Storage space for the materials to keep in safe for the work by the client.",
  "If any additional works are added by the client beyond this quotation, we are entitled to a time extension according to the volume of work.",
  "Any change or requirement from the client beyond this quotation will be charged extra as a variation, executed only upon approval of a new quotation.",
  "Work will be performed in accordance with our design, in time and with high quality.",
];

const WARRANTY_TERM = "The warranty and guarantee will become null and void if complete payment is not received within 30 days from the date of handover/installation";

const WORK_EXECUTION = [
  "Express requirements subject to additional charges",
  "Delay by other contractors: Flexceiling Pro Solutions not responsible",
  "Scaffolding by customer or additional charges apply",
];

const GENERAL_TERMS = [
  "Our offer is based on the details provided by you. If additional materials / work are required during execution, these will be charged extra;",
  "If lighting is installed behind the membrane by others, ensure the system is fully supplied and tested prior to our arrival. We cannot be responsible for any lighting effect;",
  "Suitable access equipment must be provided by others. Regular daytime working hours (Saturday–Friday); additional charges for night, weekend or holiday works;",
  "You are responsible for protection of our works from damage by other sub-contractors;",
  "All variation works shall be approved before commencing;",
  "This offer does not allow for any contractual terms other than our own. No pay-when-paid, security cheque bonds. No retentions or access equipment above 3 meters high.",
];

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
  discount: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  grand_total: number | null;
  payment_terms: string | null;
  validity_days: number | null;
  execution_days?: number | null;
  notes: string | null;
};

// Render a multi-line description; lines starting with "*" print red + bold.
function DescCell({ text }: { text: string | null }) {
  const lines = String(text ?? "").split("\n");
  return (
    <View style={[s.td, s.cDesc]}>
      {lines.map((line, j) => {
        const red = line.trimStart().startsWith("*");
        return (
          <Text key={j} style={red ? { color: "#c0392b", fontFamily: "Helvetica-Bold" } : undefined}>
            {red ? line.replace(/^\s*\*\s?/, "") : line}
          </Text>
        );
      })}
    </View>
  );
}
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
            <Text style={[s.coLine, { marginTop: 4 }]}>{settings.address}</Text>
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
        <View style={s.th} fixed>
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
            <DescCell text={it.description} />
            <Text style={[s.td, s.cArea]}>{it.area ?? ""}</Text>
            <Text style={[s.td, s.cUnit]}>{it.unit ?? ""}</Text>
            <Text style={[s.td, s.cRate]}>{it.rate != null ? Number(it.rate).toLocaleString() : ""}</Text>
            <Text style={[s.td, s.cAmt]}>{money(it.amount)}</Text>
          </View>
        ))}

        <View style={s.totalsWrap} wrap={false}>
          <View style={s.totals}>
            <View style={s.totRow}><Text style={{ color: MUTED }}>Sub Total</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{money(doc.subtotal)}</Text></View>
            {doc.discount ? <View style={s.totRow}><Text style={{ color: MUTED }}>Discount</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>- {money(doc.discount)}</Text></View> : null}
            <View style={s.totRow}><Text style={{ color: MUTED }}>VAT {doc.vat_rate ?? 5}%</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{money(doc.vat_amount)}</Text></View>
            <View style={s.totGrand}><Text style={s.totGrandTxt}>Grand Total</Text><Text style={s.totGrandTxt}>{money(doc.grand_total)}</Text></View>
          </View>
        </View>

        {doc.notes ? <Text style={s.note}>{doc.notes}</Text> : null}

        {/* Terms */}
        <View style={s.termsRow} wrap={false}>
          <View style={s.termsCol}>
            <Text style={s.termsHead}>Payment Terms</Text>
            <Text style={s.termsTxt}>{doc.payment_terms ?? ""}</Text>
          </View>
          <View style={s.termsCol}>
            <Text style={s.termsHead}>Quote Validity</Text>
            <Text style={s.termsTxt}>Valid for {doc.validity_days ?? 7} days from the date of this quote.</Text>
          </View>
        </View>

      </Page>

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
          <Text style={[s.title, { fontSize: 16 }]}>QUOTATION TERMS</Text>
          <View style={s.metaBox}>
            <View style={s.metaCell}><Text style={s.metaLabel}>Quote No.</Text><Text style={s.metaVal}>{doc.number}</Text></View>
            <View style={s.metaCell}><Text style={s.metaLabel}>Date</Text><Text style={s.metaVal}>{doc.doc_date ?? ""}</Text></View>
          </View>
        </View>

        <View style={s.tcBox} wrap={false}>
          <Text style={s.termsHead}>Terms &amp; Conditions</Text>
          {TERMS.map((t, i) => (
            <View style={s.tcRow} key={i}>
              <Text style={s.tcNum}>{i + 1}.</Text>
              <Text style={s.tcTxt}>{t}</Text>
            </View>
          ))}
          <View style={s.tcRow}>
            <Text style={s.tcNum}>12.</Text>
            <Text style={s.tcTxt}>{WARRANTY_TERM}</Text>
          </View>
        </View>

        <View style={s.extraBox} wrap={false}>
          <Text style={s.termsHead}>WORK EXECUTION</Text>
          <View style={s.bulletRow}>
            <Text style={s.bulletMark}>*</Text>
            <View style={s.completionRow}>
              <Text style={s.completionTxt}>Completion: up to</Text>
              <Text style={s.completionDays}>{doc.execution_days ?? ""}</Text>
              <Text style={s.completionTxt}>working days after order, advance payment &amp; design approval</Text>
            </View>
          </View>
          {WORK_EXECUTION.map((text) => <View style={s.bulletRow} key={text}><Text style={s.bulletMark}>*</Text><Text style={s.bulletTxt}>{text}</Text></View>)}
        </View>

        <View style={s.extraBox} wrap={false}>
          <Text style={s.termsHead}>GENERAL TERMS &amp; CONDITIONS</Text>
          {GENERAL_TERMS.map((text) => <View style={s.bulletRow} key={text}><Text style={s.bulletMark}>*</Text><Text style={s.bulletTxt}>{text}</Text></View>)}
        </View>

        <View wrap={false}>
          <View style={s.sign}>
            <Text>{settings.legal_name}</Text>
            <Text style={{ color: MUTED }}>Submitted By</Text>
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
