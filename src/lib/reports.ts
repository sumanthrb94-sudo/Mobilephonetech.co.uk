/**
 * reports.ts -- Client-side Excel report generation using SheetJS.
 *
 * Produces two downloadable .xlsx files that exactly match the column layout
 * and sheet structure of the external inventory-manager application:
 *
 *   inventory-report-{date}.xlsx
 *     - Office Stock
 *     - SHS Stock
 *
 *   sales-report-{date}.xlsx
 *     - Sales
 *     - Returns & Profit
 *     - Accessories
 *     - Returns Summary
 *     - Returns Detail
 *     - Unit Histories
 */

import * as XLSX from 'xlsx';
import type { ReturnRequest } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

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
  return Math.floor(ms / 86_400_000);
}

function dl(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename);
}

/** Map Lehart ProductGrade to the report Grade label (A, ONU, A+, B, C). */
function gradeLabel(condition: string | undefined): string {
  const map: Record<string, string> = {
    New: 'ONU', Pristine: 'A+', Excellent: 'A', Good: 'B', Fair: 'C',
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

export function downloadInventoryReport(allUnits: InventoryUnit[]): void {
  const wb = XLSX.utils.book_new();
  const office = allUnits.filter(u => (u.stockLocation ?? 'OFFICE') === 'OFFICE');
  const shs    = allUnits.filter(u => u.stockLocation === 'SHS');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(office.map(inventoryRow)), 'Office Stock');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shs.map(inventoryRow)),    'SHS Stock');
  dl(wb, `inventory-report-all-time-${today()}.xlsx`);
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
  unitHistory?: Array<{ at: string; type: string; detail?: string; amount?: number; note?: string }>;
}

function salesRow(s: SalesLineItem): Record<string, unknown> {
  const bp = gbp(s.buyPrice); const sp = gbp(s.sellPrice);
  return {
    'Date': dateStr(s.date), 'Marketplace': s.channel,
    'Order Number': s.channelOrderId ?? '', 'SKU': s.sku ?? '',
    'Name': s.model, 'IMEI': s.imei ?? '', 'Storage': s.storage ?? '',
    'Colour': s.color ?? '', 'Grade': gradeLabel(s.condition),
    'Supplier': s.supplier ?? '', 'BP': bp, 'SP': sp,
    'GP': gbp(sp - bp),
    'GP %': bp > 0 ? gbp(((sp - bp) / bp) * 100) : 0,
    'Comments': s.internalNotes ?? '',
  };
}

function accessoriesRow(s: SalesLineItem): Record<string, unknown> {
  const bp = gbp(s.buyPrice); const sp = gbp(s.sellPrice);
  return {
    'Date': dateStr(s.date), 'Marketplace': s.channel,
    'Order Number': s.channelOrderId ?? '', 'SKU': s.sku ?? '',
    'Name': s.model, 'Supplier': s.supplier ?? '', 'Quantity': 1,
    'BP': bp, 'SP': sp, 'GP': gbp(sp - bp),
    'GP %': bp > 0 ? gbp(((sp - bp) / bp) * 100) : 0,
    'Comments': s.internalNotes ?? '',
  };
}

interface ChannelProfit {
  channel: string; sales: number; revenue: number; grossGP: number;
  returns: number; refunds: number; replacements: number; repairs: number;
  carriage: number; repairInvoices: number; supplierCredits: number; feesKept: number;
}

function aggregateByChannel(lines: SalesLineItem[], returns: ReturnRequest[]): ChannelProfit[] {
  const map = new Map<string, ChannelProfit>();
  const init = (ch: string): ChannelProfit => ({
    channel: ch, sales: 0, revenue: 0, grossGP: 0,
    returns: 0, refunds: 0, replacements: 0, repairs: 0,
    carriage: 0, repairInvoices: 0, supplierCredits: 0, feesKept: 0,
  });
  for (const l of lines) {
    const ch = l.channel || 'WEBSITE';
    if (!map.has(ch)) map.set(ch, init(ch));
    const c = map.get(ch)!;
    c.sales += 1; c.revenue += gbp(l.sellPrice);
    c.grossGP += gbp(l.sellPrice - (l.buyPrice ?? 0));
  }
  for (const r of returns) {
    const ch = r.channel || 'WEBSITE';
    if (!map.has(ch)) map.set(ch, init(ch));
    const c = map.get(ch)!;
    c.returns += 1;
    c.refunds      += r.outcome === 'refund'      ? 1 : 0;
    c.replacements += r.outcome === 'replacement' ? 1 : 0;
    c.repairs      += r.outcome === 'repair'      ? 1 : 0;
    c.carriage        += gbp(r.carriageCost);
    c.repairInvoices  += gbp(r.repairCost);
    c.supplierCredits += gbp(r.supplierCredit);
    c.feesKept        += gbp(r.feesKept);
  }
  return Array.from(map.values());
}

function profitRow(c: ChannelProfit): Record<string, unknown> {
  const returnCost = gbp(c.carriage + c.repairInvoices + c.feesKept - c.supplierCredits);
  const netGP      = gbp(c.grossGP - returnCost);
  return {
    'Marketplace': c.channel, 'Sales': c.sales,
    'Revenue £': gbp(c.revenue), 'Gross GP £': gbp(c.grossGP),
    'Returns': c.returns, 'Refunds': c.refunds,
    'Replacements': c.replacements, 'Repairs': c.repairs, 'To Supplier': 0,
    'Carriage £': gbp(c.carriage), 'Repair Invoices £': gbp(c.repairInvoices),
    'Supplier Credits £': gbp(c.supplierCredits), 'Fees Kept £': gbp(c.feesKept),
    'Return Cost £': returnCost, 'Net GP £': netGP,
    'Net GP %': c.revenue > 0 ? gbp((netGP / c.revenue) * 100) : 0,
    'Costs Outstanding': '',
  };
}

function returnDetailRow(r: ReturnRequest): Record<string, unknown> {
  const item = r.items[0];
  const legs = r.shippingLegs ?? 2;
  const legCost = gbp(r.carriageCost ?? 0);
  return {
    'Return Date': dateStr(r.createdAt), 'Unit IMEI': item?.imei ?? '',
    'Model': item?.model ?? '', 'Storage': item?.storage ?? '',
    'Colour': item?.color ?? '', 'Supplier': item?.supplier ?? '',
    'Original Sale Date': '', 'Original Sale Price': gbp(item?.price),
    'Marketplace': r.channel ?? '',
    'Return Type': r.stockRestoredDate ? 'Back to Inventory' : 'To Supplier',
    'Outcome': r.outcome, 'Reason': r.reason,
    'Comments': r.staffNote ?? r.note ?? '',
    'Leg Cost £': legCost, 'Shipping Legs': legs,
    'Postage Loss £': gbp(legCost * legs), 'Fee Loss £': gbp(r.feesKept),
    'Stock In Date': dateStr(r.stockRestoredDate),
  };
}

function unitHistoryRows(lines: SalesLineItem[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const l of lines) {
    for (const ev of (l.unitHistory ?? [])) {
      rows.push({
        'Unit IMEI': l.imei ?? '', 'Model': l.model,
        'Event Date': dateStr(ev.at), 'Event': ev.type,
        'Detail': ev.detail ?? '', 'Amount £': gbp(ev.amount),
        'Comments': ev.note ?? '',
      });
    }
  }
  return rows;
}

export function downloadSalesReport(lines: SalesLineItem[], returns: ReturnRequest[]): void {
  const wb = XLSX.utils.book_new();
  const phones = lines.filter(l => l.category !== 'Accessories');
  const accs   = lines.filter(l => l.category === 'Accessories');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(phones.map(salesRow)), 'Sales');

  const profitData = aggregateByChannel(phones, returns);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profitData.map(profitRow)), 'Returns & Profit');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accs.map(accessoriesRow)), 'Accessories');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Period', 'All Time'],
    ['Total Returns',  returns.length],
    ['Refunds',        returns.filter(r => r.outcome === 'refund').length],
    ['Replacements',   returns.filter(r => r.outcome === 'replacement').length],
    ['Repairs',        returns.filter(r => r.outcome === 'repair').length],
    ['To Supplier', 0],
    ['Written Off',  0],
  ]), 'Returns Summary');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returns.map(returnDetailRow)), 'Returns Detail');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitHistoryRows(lines)), 'Unit Histories');

  dl(wb, `sales-report-${today()}.xlsx`);
}

// ── Webhook payload shape ─────────────────────────────────────────────────────
// The external inventory manager POSTs orders in this shape.

export interface WebhookOrderPayload {
  channel: string;
  channelOrderId: string;
  date: string;
  items: Array<{
    sku?: string; imei?: string; model: string;
    storage?: string; colour?: string; grade?: string;
    supplier?: string; buyPrice: number; sellPrice: number;
    quantity: number; category?: string;
  }>;
  customerName?: string;
  customerEmail?: string;
  internalNotes?: string;
}
