/**
 * reports.ts -- Client-side and build-time Excel report generator using SheetJS.
 *
 * Produces downloadable .xlsx files that EXACTLY match the sheet structure,
 * column layout, and financial formulas of the external inventory manager:
 *
 *   sales-report-{date}.xlsx
 *     - Summary           (Executive audit summary with channel totals and notes)
 *     - AMAZON            (Detailed sales with 7% referral, DSF, VAT, marginal tax)
 *     - BM                (Back Market: 6.21% commission, 0.35% ROF, VAT)
 *     - EBAY              (eBay: 6.21% FVF, 0.35% ROF, £0.40 fixed, zero-rated postage)
 *     - ONBUY             (OnBuy: 7% commission + VAT)
 *     - TEMU              (Temu: 3.96% commission + VAT)
 *     - WEBSITE           (Lehart / Mobilephonetech.co.uk: Channel 7 PayPal 2.9%+30p)
 *     - Returns & Profit  (Consolidated channel P&L with return losses deducted)
 *     - Accessories       (Accessory sales)
 *     - Returns Summary   (Return outcome aggregates)
 *     - Returns Detail    (IMEI-level return log with carriage & fee loss)
 *     - Unit Histories    (Audit events per IMEI)
 *
 *   inventory-report-all-time-{date}.xlsx
 *     - Office Stock      (590+ physical units in stock)
 *     - SHS Stock         (Stock in transit / awaiting delivery)
 */

import * as XLSX from 'xlsx';
import type { ReturnRequest } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateStr(iso: string | undefined | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function gbp(n: number | undefined | null): number {
  return Number((n ?? 0).toFixed(2));
}

function ageDays(stockInDate: string | undefined | null): number {
  if (!stockInDate) return 0;
  const ms = Date.now() - new Date(stockInDate).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function dl(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename);
}

/** Map Lehart ProductGrade to the report Grade label (A, ONU, A+, B, C). */
function gradeLabel(condition: string | undefined): string {
  const map: Record<string, string> = {
    New: 'ONU',
    Pristine: 'A+',
    Excellent: 'A',
    Good: 'B',
    Fair: 'C',
  };
  return map[condition ?? ''] ?? condition ?? '';
}

// ── INVENTORY REPORT ─────────────────────────────────────────────────────────

export interface InventoryUnit {
  stockInDate?: string;
  model: string;
  imei?: string;
  condition?: string;
  storage?: string;
  simType?: string;
  color?: string;
  supplier?: string;
  buyPrice?: number;
  stockLocation?: string;
  notes?: string;
  stockRestoredDate?: string | null;
}

function inventoryRow(u: InventoryUnit): Record<string, unknown> {
  return {
    'Stock In Date': dateStr(u.stockInDate),
    'Model': u.model,
    'IMEI': u.imei ?? '',
    'Grade': gradeLabel(u.condition),
    'Storage': u.storage ?? '',
    'SIM Type': u.simType ?? '',
    'Colour': u.color ?? '',
    'Supplier': u.supplier ?? '',
    'BP': gbp(u.buyPrice),
    'Stock Type': u.stockLocation ?? 'OFFICE',
    'Notes': u.notes ?? '',
    'Age (days)': ageDays(u.stockInDate),
    'Return Date': dateStr(u.stockRestoredDate),
  };
}

export function buildInventoryReportWorkbook(allUnits: InventoryUnit[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const office = allUnits.filter(u => (u.stockLocation ?? 'OFFICE').toUpperCase() === 'OFFICE');
  const shs    = allUnits.filter(u => (u.stockLocation ?? '').toUpperCase() === 'SHS');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(office.map(inventoryRow)), 'Office Stock');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shs.map(inventoryRow)), 'SHS Stock');
  return wb;
}

export function downloadInventoryReport(allUnits: InventoryUnit[], customFilename?: string): void {
  const wb = buildInventoryReportWorkbook(allUnits);
  dl(wb, customFilename ?? `inventory-report-all-time-${today()}.xlsx`);
}

// ── SALES REPORT ─────────────────────────────────────────────────────────────

export interface SalesLineItem {
  date: string;
  channel: string;
  channelOrderId?: string;
  sku?: string;
  model: string;
  imei?: string;
  storage?: string;
  color?: string;
  condition?: string;
  supplier?: string;
  buyPrice?: number;
  sellPrice: number;
  category?: string;
  internalNotes?: string;
  quantity?: number;
  unitHistory?: Array<{ at: string; type: string; detail?: string; amount?: number; note?: string }>;
}

export const CHANNELS = ['AMAZON', 'BM', 'EBAY', 'ONBUY', 'TEMU', 'WEBSITE'] as const;
export type SupportedChannel = typeof CHANNELS[number];

function normaliseChannel(ch: string | undefined): SupportedChannel {
  const c = (ch ?? '').trim().toUpperCase();
  if (c.includes('AMAZON')) return 'AMAZON';
  if (c === 'BM' || c.includes('BACK') || c.includes('MARKET')) return 'BM';
  if (c.includes('EBAY')) return 'EBAY';
  if (c.includes('ONBUY')) return 'ONBUY';
  if (c.includes('TEMU')) return 'TEMU';
  return 'WEBSITE';
}

/**
 * Calculates channel-specific deductions, marginal tax, and net GP.
 * Fully mirrors the formulas in the reference report.
 */
function channelRow(s: SalesLineItem, ch: SupportedChannel): Record<string, unknown> {
  const bp = gbp(s.buyPrice);
  const sp = gbp(s.sellPrice);
  const diff = gbp(sp - bp);
  // UK Second-hand VAT margin scheme: 1/6th of gross margin
  const marginalTax = diff > 0 ? gbp(diff * (1 / 6)) : 0;

  let commission = 0;
  let cVat = 0;
  let dsf = 0;
  let dsfVat = 0;
  let rof = 0;
  let fvf = 0;
  let postage = 6.30;
  let pVat = 1.26;
  const acc = 1.00;
  let totalVat = 0;
  let gp = 0;
  let totalDeductions = 0;

  if (ch === 'AMAZON') {
    commission = gbp(sp * 0.07);
    cVat = gbp(commission * 0.20);
    dsf = gbp(commission * 0.02);
    dsfVat = gbp(dsf * 0.20);
    postage = 6.30;
    pVat = gbp(postage * 0.20);
    totalVat = gbp(cVat + dsfVat + pVat);
    totalDeductions = commission + cVat + dsf + dsfVat + postage + pVat + acc;
    gp = gbp(diff - marginalTax - totalDeductions);
  } else if (ch === 'BM') {
    commission = gbp(sp * 0.0621); // 6.9% - 10% discount
    rof = gbp(sp * 0.0035);
    const feeVat = gbp((commission + rof) * 0.20);
    postage = 4.65;
    pVat = gbp(postage * 0.20);
    totalVat = gbp(feeVat + pVat);
    totalDeductions = commission + rof + feeVat + postage + pVat + acc;
    gp = gbp(diff - marginalTax - totalDeductions);
  } else if (ch === 'EBAY') {
    commission = gbp(sp * 0.0621);
    rof = gbp(sp * 0.0035);
    fvf = 0.40;
    const feeVat = gbp((commission + rof + fvf) * 0.20);
    postage = 4.65;
    pVat = 0.00; // eBay zero-rated postage
    totalVat = feeVat;
    totalDeductions = commission + rof + fvf + feeVat + postage + pVat + acc;
    gp = gbp(diff - marginalTax - totalDeductions);
  } else if (ch === 'ONBUY') {
    commission = gbp(sp * 0.07);
    cVat = gbp(commission * 0.20);
    postage = 6.30;
    pVat = gbp(postage * 0.20);
    totalVat = gbp(cVat + pVat);
    totalDeductions = commission + cVat + postage + pVat + acc;
    gp = gbp(diff - marginalTax - totalDeductions);
  } else if (ch === 'TEMU') {
    commission = gbp(sp * 0.0396);
    cVat = gbp(commission * 0.20);
    postage = 6.30;
    pVat = gbp(postage * 0.20);
    totalVat = gbp(cVat + pVat);
    totalDeductions = commission + cVat + postage + pVat + acc;
    gp = gbp(diff - marginalTax - totalDeductions);
  } else {
    // WEBSITE (PayPal 2.9% + £0.30)
    commission = gbp(sp * 0.029 + 0.30);
    postage = 6.30;
    pVat = gbp(postage * 0.20);
    totalVat = pVat;
    totalDeductions = commission + postage + pVat + acc;
    gp = gbp(diff - marginalTax - totalDeductions);
  }

  const gpPercent = bp > 0 ? gbp((gp / bp) * 100) : 0;
  const totalVatNtp = gbp(marginalTax - totalVat);

  return {
    'Date': dateStr(s.date),
    'Order Number': s.channelOrderId ?? '',
    'SKU': s.sku ?? '',
    'IMEI': s.imei ?? '',
    'Model': s.model,
    'Colour': s.color ?? '',
    'Storage': s.storage ?? '',
    'Supplier': s.supplier ?? '',
    'Quantity': s.quantity ?? 1,
    'BP': bp,
    'SP': sp,
    'SP-BP': diff,
    'Marginal Tax': marginalTax,
    'Commission': commission,
    'C. VAT': cVat,
    'Postage': postage,
    'P. VAT': pVat,
    'Acc': acc,
    'Total VAT': totalVat,
    'GP': gp,
    'GP %': gpPercent,
    'Total VAT NTP': totalVatNtp,
    'Postage Loss': 0,
    'Fees Kept': 0,
    'Repair Cost': 0,
    'Supplier Credit': 0,
    'Return Cost': 0,
    'Net GP £': gp,
    'Return Date': '',
    'Outcome': '',
    'Shipping Legs': '',
    'Return Reason': '',
    'Comments': s.internalNotes ?? '',
  };
}

function accessoriesRow(s: SalesLineItem): Record<string, unknown> {
  const bp = gbp(s.buyPrice);
  const sp = gbp(s.sellPrice);
  return {
    'Date': dateStr(s.date),
    'Marketplace': normaliseChannel(s.channel),
    'Order Number': s.channelOrderId ?? '',
    'SKU': s.sku ?? '',
    'Name': s.model,
    'Supplier': s.supplier ?? '',
    'Quantity': s.quantity ?? 1,
    'BP': bp,
    'SP': sp,
    'GP': gbp(sp - bp),
    'GP %': bp > 0 ? gbp(((sp - bp) / bp) * 100) : 0,
    'Comments': s.internalNotes ?? '',
  };
}

interface ChannelProfit {
  channel: SupportedChannel;
  sales: number;
  revenue: number;
  grossGP: number;
  returns: number;
  refunds: number;
  replacements: number;
  repairs: number;
  carriage: number;
  repairInvoices: number;
  supplierCredits: number;
  feesKept: number;
}

function aggregateByChannel(lines: SalesLineItem[], returns: ReturnRequest[]): ChannelProfit[] {
  const map = new Map<SupportedChannel, ChannelProfit>();

  for (const ch of CHANNELS) {
    map.set(ch, {
      channel: ch,
      sales: 0,
      revenue: 0,
      grossGP: 0,
      returns: 0,
      refunds: 0,
      replacements: 0,
      repairs: 0,
      carriage: 0,
      repairInvoices: 0,
      supplierCredits: 0,
      feesKept: 0,
    });
  }

  for (const l of lines) {
    const ch = normaliseChannel(l.channel);
    const c = map.get(ch)!;
    c.sales += 1;
    c.revenue += gbp(l.sellPrice);
    const rowCalc = channelRow(l, ch);
    c.grossGP += Number(rowCalc.GP ?? 0);
  }

  for (const r of returns) {
    const ch = normaliseChannel(r.channel);
    const c = map.get(ch)!;
    c.returns += 1;
    const outcome = (r.outcome ?? '').toLowerCase();
    c.refunds      += outcome === 'refund' ? 1 : 0;
    c.replacements += outcome === 'replacement' ? 1 : 0;
    c.repairs      += outcome === 'repair' ? 1 : 0;
    const legs = r.shippingLegs ?? 2;
    const legCost = gbp(r.carriageCost ?? 0);
    c.carriage        += gbp(legCost * legs);
    c.repairInvoices  += gbp(r.repairCost ?? 0);
    c.supplierCredits += gbp(r.supplierCredit ?? 0);
    c.feesKept        += gbp(r.feesKept ?? 0);
  }

  return Array.from(map.values());
}

function returnDetailRow(r: ReturnRequest): Record<string, unknown> {
  const item = r.items[0];
  const legs = r.shippingLegs ?? 2;
  const legCost = gbp(r.carriageCost ?? 0);
  return {
    'Return Date': dateStr(r.createdAt),
    'Unit IMEI': item?.imei ?? '',
    'Model': item?.model ?? '',
    'Storage': item?.storage ?? '',
    'Colour': item?.color ?? '',
    'Supplier': item?.supplier ?? '',
    'Original Sale Date': '',
    'Original Sale Price': gbp(item?.price),
    'Marketplace': normaliseChannel(r.channel),
    'Return Type': r.stockRestoredDate ? 'Back to Inventory' : 'To Supplier',
    'Outcome': r.outcome,
    'Reason': r.reason,
    'Comments': r.staffNote ?? r.note ?? '',
    'Leg Cost £': legCost,
    'Shipping Legs': legs,
    'Postage Loss £': gbp(legCost * legs),
    'Fee Loss £': gbp(r.feesKept),
    'Stock In Date': dateStr(r.stockRestoredDate),
  };
}

function unitHistoryRows(lines: SalesLineItem[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const l of lines) {
    for (const ev of (l.unitHistory ?? [])) {
      rows.push({
        'Unit IMEI': l.imei ?? '',
        'Model': l.model,
        'Event Date': dateStr(ev.at),
        'Event': ev.type,
        'Detail': ev.detail ?? '',
        'Amount £': gbp(ev.amount),
        'Comments': ev.note ?? '',
      });
    }
  }
  return rows;
}

export interface SalesReportOptions {
  /**
   * Finance exports contain supplier cost, tax and GP.  Operational staff get
   * the same sales/return evidence without commercially sensitive columns.
   */
  includeProfit?: boolean;
}

function operationalSaleRow(s: SalesLineItem): Record<string, unknown> {
  return {
    'Date': dateStr(s.date),
    'Order Number': s.channelOrderId ?? '',
    'SKU': s.sku ?? '',
    'IMEI': s.imei ?? '',
    'Model': s.model,
    'Colour': s.color ?? '',
    'Storage': s.storage ?? '',
    'Condition': s.condition ?? '',
    'Quantity': s.quantity ?? 1,
    'Sale Price': gbp(s.sellPrice),
  };
}

function operationalReturnRow(r: ReturnRequest): Record<string, unknown> {
  const item = r.items[0];
  return {
    'Return Date': dateStr(r.createdAt),
    'Order Number': r.orderId ?? '',
    'Unit IMEI': item?.imei ?? '',
    'Model': item?.model ?? '',
    'Storage': item?.storage ?? '',
    'Colour': item?.color ?? '',
    'Outcome': r.outcome,
    'Reason': r.reason,
    'Comments': r.staffNote ?? r.note ?? '',
    'Stock In Date': dateStr(r.stockRestoredDate),
  };
}

function buildOperationalSalesReportWorkbook(lines: SalesLineItem[], returns: ReturnRequest[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const byChannel = new Map<string, number>();
  for (const line of lines) {
    const channel = normaliseChannel(line.channel);
    byChannel.set(channel, (byChannel.get(channel) ?? 0) + (line.quantity ?? 1));
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Website Sales Report'],
    ['Period: All Time'],
    ['This operational export intentionally excludes supplier cost, tax, fees and gross-profit figures.'],
    [],
    ['Marketplace', 'Units sold'],
    ...Array.from(byChannel, ([channel, units]) => [channel, units]),
    ['TOTAL', lines.reduce((sum, line) => sum + (line.quantity ?? 1), 0)],
  ]), 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lines.map(operationalSaleRow)), 'WEBSITE');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Period', 'All Time'],
    ['Total Returns', returns.length],
    ['Refunds', returns.filter(r => (r.outcome ?? '').toLowerCase() === 'refund').length],
    ['Replacements', returns.filter(r => (r.outcome ?? '').toLowerCase() === 'replacement').length],
    ['Repairs', returns.filter(r => (r.outcome ?? '').toLowerCase() === 'repair').length],
  ]), 'Returns Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returns.map(operationalReturnRow)), 'Returns Detail');
  return wb;
}

export function buildSalesReportWorkbook(lines: SalesLineItem[], returns: ReturnRequest[], options: SalesReportOptions = {}): XLSX.WorkBook {
  // Keep this low-level helper backwards-compatible for existing finance
  // callers/tests. Every staff-facing caller must pass its capability
  // explicitly (DashboardPage and ReportsPage do), rather than relying on it.
  if (options.includeProfit === false) return buildOperationalSalesReportWorkbook(lines, returns);
  const wb = XLSX.utils.book_new();

  const phones = lines.filter(l => (l.category ?? '').toLowerCase() !== 'accessories');
  const accs   = lines.filter(l => (l.category ?? '').toLowerCase() === 'accessories');

  const channelProfits = aggregateByChannel(phones, returns);

  // 1. Summary sheet (Audit summary)
  const summaryAoa: unknown[][] = [
    ['Sales Report – Audit Summary'],
    ['Period: All Time'],
    ['This working report breaks down sales, returns, and gross profit by marketplace channel.'],
    [],
    ['Marketplace', 'Sales', 'Refunds', 'Replacements', 'Repairs', 'Gross GP £', 'Return Cost £', 'Net GP £', 'Net GP %'],
  ];

  let totSales = 0; let totRefunds = 0; let totRepl = 0; let totRep = 0;
  let totGrossGP = 0; let totRetCost = 0; let totNetGP = 0; let totRev = 0;

  for (const cp of channelProfits) {
    const returnCost = gbp(cp.carriage + cp.repairInvoices + cp.feesKept - cp.supplierCredits);
    const netGP = gbp(cp.grossGP - returnCost);
    const netGPPct = cp.revenue > 0 ? gbp((netGP / cp.revenue) * 100) : 0;

    summaryAoa.push([
      cp.channel, cp.sales, cp.refunds, cp.replacements, cp.repairs,
      gbp(cp.grossGP), returnCost, netGP, `${netGPPct}%`,
    ]);

    totSales += cp.sales; totRefunds += cp.refunds; totRepl += cp.replacements; totRep += cp.repairs;
    totGrossGP += cp.grossGP; totRetCost += returnCost; totNetGP += netGP; totRev += cp.revenue;
  }

  summaryAoa.push([
    'TOTAL', totSales, totRefunds, totRepl, totRep,
    gbp(totGrossGP), gbp(totRetCost), gbp(totNetGP), totRev > 0 ? `${gbp((totNetGP / totRev) * 100)}%` : '0%',
  ]);

  summaryAoa.push([]);
  summaryAoa.push(['Notes']);
  summaryAoa.push(['• Refunds + Repairs + Return-to-Supplier each eat 2 shipping legs (outbound + inbound). Replacements eat 3.']);
  summaryAoa.push(['• Postage Loss = (postage + P.VAT) * legs, snapshotted at Process Return time. eBay legs carry no VAT.']);
  summaryAoa.push(['• Fees Kept = what the marketplace did not give back on a refund: Amazon min(20% * commission, £5) + VAT; eBay £0.40 + VAT; Back Market / OnBuy / Temu keep every fee.']);
  summaryAoa.push(['• WEBSITE: Channel 7 (Lehart / Mobilephonetech.co.uk) incurs 0% marketplace commission — only standard PayPal gateway fee.']);

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoa), 'Summary');

  // 2. Channel Sheets
  for (const ch of CHANNELS) {
    const chLines = phones.filter(l => normaliseChannel(l.channel) === ch);
    const sheetData = chLines.map(l => channelRow(l, ch));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), ch);
  }

  // 3. Returns & Profit Sheet
  const profitSheetRows = channelProfits.map(cp => {
    const returnCost = gbp(cp.carriage + cp.repairInvoices + cp.feesKept - cp.supplierCredits);
    const netGP = gbp(cp.grossGP - returnCost);
    return {
      'Marketplace': cp.channel,
      'Sales': cp.sales,
      'Revenue £': gbp(cp.revenue),
      'Gross GP £': gbp(cp.grossGP),
      'Returns': cp.returns,
      'Refunds': cp.refunds,
      'Replacements': cp.replacements,
      'Repairs': cp.repairs,
      'To Supplier': 0,
      'Carriage £': gbp(cp.carriage),
      'Repair Invoices £': gbp(cp.repairInvoices),
      'Supplier Credits £': gbp(cp.supplierCredits),
      'Fees Kept £': gbp(cp.feesKept),
      'Return Cost £': returnCost,
      'Net GP £': netGP,
      'Net GP %': cp.revenue > 0 ? gbp((netGP / cp.revenue) * 100) : 0,
      'Costs Outstanding': '',
    };
  });

  // Total row for profit sheet
  profitSheetRows.push({
    'Marketplace': 'TOTAL' as any,
    'Sales': totSales,
    'Revenue £': gbp(totRev),
    'Gross GP £': gbp(totGrossGP),
    'Returns': returns.length,
    'Refunds': totRefunds,
    'Replacements': totRepl,
    'Repairs': totRep,
    'To Supplier': 0,
    'Carriage £': gbp(channelProfits.reduce((s, c) => s + c.carriage, 0)),
    'Repair Invoices £': gbp(channelProfits.reduce((s, c) => s + c.repairInvoices, 0)),
    'Supplier Credits £': gbp(channelProfits.reduce((s, c) => s + c.supplierCredits, 0)),
    'Fees Kept £': gbp(channelProfits.reduce((s, c) => s + c.feesKept, 0)),
    'Return Cost £': gbp(totRetCost),
    'Net GP £': gbp(totNetGP),
    'Net GP %': totRev > 0 ? gbp((totNetGP / totRev) * 100) : 0,
    'Costs Outstanding': '',
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profitSheetRows), 'Returns & Profit');

  // 4. Accessories Sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accs.map(accessoriesRow)), 'Accessories');

  // 5. Returns Summary Sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Period', 'All Time'],
    ['Total Returns',  returns.length],
    ['Refunds',        returns.filter(r => (r.outcome ?? '').toLowerCase() === 'refund').length],
    ['Replacements',   returns.filter(r => (r.outcome ?? '').toLowerCase() === 'replacement').length],
    ['Repairs',        returns.filter(r => (r.outcome ?? '').toLowerCase() === 'repair').length],
    ['To Supplier',    0],
    ['Written Off',    0],
  ]), 'Returns Summary');

  // 6. Returns Detail Sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returns.map(returnDetailRow)), 'Returns Detail');

  // 7. Unit Histories Sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitHistoryRows(lines)), 'Unit Histories');

  return wb;
}

export function downloadSalesReport(lines: SalesLineItem[], returns: ReturnRequest[], customFilename?: string, options?: SalesReportOptions): void {
  const wb = buildSalesReportWorkbook(lines, returns, options);
  dl(wb, customFilename ?? `sales-report-${today()}.xlsx`);
}

// ── Webhook payload shape ─────────────────────────────────────────────────────

export interface WebhookOrderPayload {
  channel: string;
  channelOrderId: string;
  date: string;
  items: Array<{
    sku?: string;
    imei?: string;
    model: string;
    storage?: string;
    colour?: string;
    grade?: string;
    supplier?: string;
    buyPrice: number;
    sellPrice: number;
    quantity: number;
    category?: string;
  }>;
  customerName?: string;
  customerEmail?: string;
  internalNotes?: string;
}
