import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { fmtDate } from "@/utils/format";
import type { SalesReportFileData } from "@/utils/salesReportFiles";

const NAVY = "#0c2340";
const GOLD = "#b08d57";
const CYAN = "#d7f1fb";
const BORDER = "#d8dee9";
const MUTED = "#64748b";

const s = StyleSheet.create({
  page: { paddingHorizontal: 28, paddingTop: 26, paddingBottom: 34, fontFamily: "Helvetica", fontSize: 8, color: "#172033" },
  company: { color: GOLD, fontFamily: "Helvetica-Bold", fontSize: 13 },
  title: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 20, marginTop: 1 },
  period: { color: MUTED, fontFamily: "Helvetica-Oblique", fontSize: 10, marginTop: 2 },
  rule: { height: 1, backgroundColor: GOLD, marginTop: 5, marginBottom: 12 },
  summary: { flexDirection: "row", borderWidth: 1, borderColor: BORDER, marginBottom: 14 },
  summaryCell: { width: "20%", alignItems: "center", borderRightWidth: 1, borderRightColor: BORDER },
  summaryLast: { borderRightWidth: 0 },
  summaryLabel: { width: "100%", backgroundColor: "#f7f2ea", color: "#665745", fontFamily: "Helvetica-Bold", textAlign: "center", paddingVertical: 5 },
  summaryValue: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 11, paddingVertical: 7 },
  row: { flexDirection: "row", minHeight: 24, borderBottomWidth: 0.6, borderBottomColor: "#56bce8", alignItems: "center" },
  alt: { backgroundColor: CYAN },
  header: { backgroundColor: NAVY, minHeight: 26 },
  headerText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 7.5, textAlign: "center" },
  cell: { paddingHorizontal: 4, paddingVertical: 5 },
  number: { width: 58 },
  type: { width: 42, textAlign: "center" },
  status: { width: 45, textAlign: "center" },
  date: { width: 66, textAlign: "center" },
  client: { flex: 1 },
  amount: { width: 70, textAlign: "right" },
  totalRow: { flexDirection: "row", borderTopWidth: 1.2, borderTopColor: GOLD, borderBottomWidth: 1.4, borderBottomColor: NAVY, alignItems: "center" },
  totalLabel: { flex: 1, fontFamily: "Helvetica-Bold", color: NAVY, paddingVertical: 5, paddingHorizontal: 4 },
  totalAmount: { width: 70, textAlign: "right", fontFamily: "Helvetica-Bold", color: NAVY, paddingVertical: 5, paddingHorizontal: 4 },
  empty: { paddingVertical: 18, textAlign: "center", color: MUTED, borderBottomWidth: 1, borderBottomColor: BORDER },
  footer: { position: "absolute", left: 28, right: 28, bottom: 16, flexDirection: "row", justifyContent: "space-between", color: MUTED, fontFamily: "Helvetica-Oblique", fontSize: 7 },
});

const amount = (value: number) => value ? value.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-";
const currency = (code: string, value: number) => `${code} ${value.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SalesReportDocument({ report }: { report: SalesReportFileData }) {
  const { snapshot } = report;
  const summary = [
    ["Invoices", String(snapshot.totals.invoiceCount)],
    ["Subtotal", currency(report.currency, snapshot.totals.subtotal)],
    ["Discount", currency(report.currency, snapshot.totals.discount)],
    ["VAT", currency(report.currency, snapshot.totals.vatAmount)],
    ["Grand total", currency(report.currency, snapshot.totals.grandTotal)],
  ];

  return (
    <Document title="Sales Invoice Report" author={report.companyName}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.company}>{report.companyName}</Text>
        <Text style={s.title}>Sales Invoice Report</Text>
        <Text style={s.period}>{fmtDate(report.dateFrom)} - {fmtDate(report.dateTo)} · {report.currency} · {report.statusLabel}</Text>
        <View style={s.rule} />

        <View style={s.summary}>
          {summary.map(([label, value], index) => (
            <View key={label} style={[s.summaryCell, index === summary.length - 1 ? s.summaryLast : {}]}>
              <Text style={s.summaryLabel}>{label}</Text>
              <Text style={s.summaryValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={[s.row, s.header]} fixed>
          <Text style={[s.cell, s.headerText, s.number]}>Number</Text>
          <Text style={[s.cell, s.headerText, s.type]}>Type</Text>
          <Text style={[s.cell, s.headerText, s.status]}>Status</Text>
          <Text style={[s.cell, s.headerText, s.date]}>Date</Text>
          <Text style={[s.cell, s.headerText, s.client]}>Client</Text>
          <Text style={[s.cell, s.headerText, s.amount]}>Subtotal</Text>
          <Text style={[s.cell, s.headerText, s.amount]}>Discount</Text>
          <Text style={[s.cell, s.headerText, s.amount]}>VAT</Text>
          <Text style={[s.cell, s.headerText, s.amount]}>Grand total</Text>
        </View>
        {snapshot.rows.map((row, index) => (
          <View key={row.id} style={[s.row, index % 2 === 0 ? s.alt : {}]} wrap={false}>
            <Text style={[s.cell, s.number]}>{row.number}</Text>
            <Text style={[s.cell, s.type]}>invoice</Text>
            <Text style={[s.cell, s.status, { color: row.status === "paid" ? "#07834a" : "#334155" }]}>{row.status}</Text>
            <Text style={[s.cell, s.date]}>{fmtDate(row.doc_date)}</Text>
            <Text style={[s.cell, s.client]}>{row.client_name || "-"}</Text>
            <Text style={[s.cell, s.amount]}>{amount(row.subtotal)}</Text>
            <Text style={[s.cell, s.amount]}>{amount(row.discount)}</Text>
            <Text style={[s.cell, s.amount]}>{amount(row.vat_amount)}</Text>
            <Text style={[s.cell, s.amount]}>{amount(row.grand_total)}</Text>
          </View>
        ))}
        {!snapshot.rows.length && <Text style={s.empty}>No sales invoices match this report.</Text>}
        <View style={s.totalRow} wrap={false}>
          <Text style={s.totalLabel}>TOTAL</Text>
          <Text style={s.totalAmount}>{amount(snapshot.totals.subtotal)}</Text>
          <Text style={s.totalAmount}>{amount(snapshot.totals.discount)}</Text>
          <Text style={s.totalAmount}>{amount(snapshot.totals.vatAmount)}</Text>
          <Text style={s.totalAmount}>{amount(snapshot.totals.grandTotal)}</Text>
        </View>

        <View style={s.footer} fixed>
          <Text>Source: FlexCeiling Pro tax invoice records. Generated {fmtDate(snapshot.generatedAt)}.</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
