import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { FinanceExportData } from "@/utils/financeReportFiles";

const NAVY = "#0c2340", GOLD = "#b08d57", BORDER = "#d8dee9", ALT = "#eef8fc";
const styles = StyleSheet.create({ page: { padding: 28, paddingBottom: 38, fontFamily: "Helvetica", fontSize: 7.5, color: "#172033" }, company: { color: GOLD, fontFamily: "Helvetica-Bold", fontSize: 12 }, title: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 19, marginTop: 2 }, subtitle: { color: "#64748b", marginTop: 3 }, rule: { height: 1, backgroundColor: GOLD, marginVertical: 9 }, summary: { flexDirection: "row", borderWidth: 1, borderColor: BORDER, marginBottom: 13 }, summaryCell: { flex: 1, alignItems: "center", paddingVertical: 6, borderRightWidth: 1, borderRightColor: BORDER }, label: { color: "#64748b", fontSize: 7 }, value: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 10, marginTop: 2 }, row: { flexDirection: "row", minHeight: 24, alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: BORDER }, header: { backgroundColor: NAVY, minHeight: 26 }, cell: { paddingHorizontal: 4, paddingVertical: 5 }, headerText: { color: "white", fontFamily: "Helvetica-Bold", textAlign: "center" }, footer: { position: "absolute", left: 28, right: 28, bottom: 16, flexDirection: "row", justifyContent: "space-between", color: "#64748b", fontSize: 7 } });

export function FinanceReportPdf({ report }: { report: FinanceExportData }) {
  return <Document title={report.title} author={report.companyName}><Page size="A4" orientation="landscape" style={styles.page}>
    <Text style={styles.company}>{report.companyName}</Text><Text style={styles.title}>{report.title}</Text><Text style={styles.subtitle}>As of {report.asOf} · AED</Text><View style={styles.rule} />
    <View style={styles.summary}>{report.summary.map(([label, value], index) => <View key={label} style={[styles.summaryCell, index === report.summary.length - 1 ? { borderRightWidth: 0 } : {}]}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}</View>
    <View style={[styles.row, styles.header]} fixed>{report.columns.map((column) => <Text key={column.key} style={[styles.cell, styles.headerText, { width: column.width, textAlign: column.align ?? "left" }]}>{column.label}</Text>)}</View>
    {report.rows.map((row, index) => <View key={row.key} style={[styles.row, index % 2 === 0 ? { backgroundColor: ALT } : {}]} wrap={false}>{report.columns.map((column) => { const value = row.values[column.key]; return <Text key={column.key} style={[styles.cell, { width: column.width, textAlign: column.align ?? "left" }]}>{column.money && typeof value === "number" ? `AED ${value.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(value ?? "-")}</Text>; })}</View>)}
    {!report.rows.length && <Text style={{ padding: 16, textAlign: "center", color: "#64748b" }}>No matching records.</Text>}
    <View style={styles.footer} fixed><Text>Source: FlexCeiling Pro finance records.</Text><Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} /></View>
  </Page></Document>;
}
