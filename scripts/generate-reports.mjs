#!/usr/bin/env node
/**
 * scripts/generate-reports.mjs
 *
 * Generates the full-fidelity multi-channel Excel reports from repository data:
 *   - sales-report-{date}.xlsx
 *   - inventory-report-all-time-{date}.xlsx
 */

import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const sales = JSON.parse(readFileSync(join(root, 'data/sales.json'), 'utf8'));
const returns = JSON.parse(readFileSync(join(root, 'data/returns.json'), 'utf8'));
const inventory = JSON.parse(readFileSync(join(root, 'data/inventory.json'), 'utf8'));

const today = new Date().toISOString().slice(0, 10);
const outDir = join(root, 'dist-reports');
mkdirSync(outDir, { recursive: true });

// --- 1. INVENTORY WORKBOOK ---
console.log('Building inventory report...');
const invWb = XLSX.utils.book_new();

function gradeLabel(condition) {
  const map = { New: 'ONU', Pristine: 'A+', Excellent: 'A', Good: 'B', Fair: 'C' };
  return map[condition] || condition || '';
}

function ageDays(stockInDate) {
  if (!stockInDate) return 0;
  const ms = Date.now() - new Date(stockInDate).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

const officeUnits = inventory.filter(u => (u.stockLocation || 'OFFICE').toUpperCase() === 'OFFICE');
const shsUnits = inventory.filter(u => (u.stockLocation || '').toUpperCase() === 'SHS');

function invRow(u) {
  return {
    'Stock In Date': u.stockInDate || '',
    'Model': u.model || '',
    'IMEI': u.imei || '',
    'Grade': gradeLabel(u.condition),
    'Storage': u.storage || '',
    'SIM Type': u.simType || '',
    'Colour': u.color || '',
    'Supplier': u.supplier || '',
    'BP': Number(u.buyPrice || 0),
    'Stock Type': u.stockLocation || 'OFFICE',
    'Notes': u.notes || '',
    'Age (days)': ageDays(u.stockInDate),
    'Return Date': u.stockRestoredDate || '',
  };
}

XLSX.utils.book_append_sheet(invWb, XLSX.utils.json_to_sheet(officeUnits.map(invRow)), 'Office Stock');
XLSX.utils.book_append_sheet(invWb, XLSX.utils.json_to_sheet(shsUnits.map(invRow)), 'SHS Stock');

const invFilename = `inventory-report-all-time-${today}.xlsx`;
const invFilePath = join(outDir, invFilename);
XLSX.writeFile(invWb, invFilePath);
console.log(`✓ Saved inventory report: ${invFilePath} (${inventory.length} total units)`);

// --- 2. SALES WORKBOOK ---
console.log('Building multi-channel sales report...');
const salesWb = XLSX.utils.book_new();

const CHANNELS = ['AMAZON', 'BM', 'EBAY', 'ONBUY', 'TEMU', 'WEBSITE'];

function normaliseChannel(ch) {
  const c = (ch || '').trim().toUpperCase();
  if (c.includes('AMAZON')) return 'AMAZON';
  if (c === 'BM' || c.includes('BACK') || c.includes('MARKET')) return 'BM';
  if (c.includes('EBAY')) return 'EBAY';
  if (c.includes('ONBUY')) return 'ONBUY';
  if (c.includes('TEMU')) return 'TEMU';
  return 'WEBSITE';
}

function gbp(n) {
  return Number((Number(n) || 0).toFixed(2));
}

function channelRow(s, ch) {
  const bp = gbp(s.buyPrice);
  const sp = gbp(s.sellPrice);
  const diff = gbp(sp - bp);
  const marginalTax = diff > 0 ? gbp(diff * (1 / 6)) : 0;

  let commission = 0, cVat = 0, dsf = 0, dsfVat = 0, rof = 0, fvf = 0;
  let postage = 6.30, pVat = 1.26, acc = 1.00, totalVat = 0, gp = 0;

  if (ch === 'AMAZON') {
    commission = gbp(sp * 0.07);
    cVat = gbp(commission * 0.20);
    dsf = gbp(commission * 0.02);
    dsfVat = gbp(dsf * 0.20);
    postage = 6.30;
    pVat = gbp(postage * 0.20);
    totalVat = gbp(cVat + dsfVat + pVat);
    gp = gbp(diff - marginalTax - (commission + cVat + dsf + dsfVat + postage + pVat + acc));
  } else if (ch === 'BM') {
    commission = gbp(sp * 0.0621);
    rof = gbp(sp * 0.0035);
    const feeVat = gbp((commission + rof) * 0.20);
    postage = 4.65;
    pVat = gbp(postage * 0.20);
    totalVat = gbp(feeVat + pVat);
    gp = gbp(diff - marginalTax - (commission + rof + feeVat + postage + pVat + acc));
  } else if (ch === 'EBAY') {
    commission = gbp(sp * 0.0621);
    rof = gbp(sp * 0.0035);
    fvf = 0.40;
    const feeVat = gbp((commission + rof + fvf) * 0.20);
    postage = 4.65;
    pVat = 0.00;
    totalVat = feeVat;
    gp = gbp(diff - marginalTax - (commission + rof + fvf + feeVat + postage + pVat + acc));
  } else if (ch === 'ONBUY') {
    commission = gbp(sp * 0.07);
    cVat = gbp(commission * 0.20);
    postage = 6.30;
    pVat = gbp(postage * 0.20);
    totalVat = gbp(cVat + pVat);
    gp = gbp(diff - marginalTax - (commission + cVat + postage + pVat + acc));
  } else if (ch === 'TEMU') {
    commission = gbp(sp * 0.0396);
    cVat = gbp(commission * 0.20);
    postage = 6.30;
    pVat = gbp(postage * 0.20);
    totalVat = gbp(cVat + pVat);
    gp = gbp(diff - marginalTax - (commission + cVat + postage + pVat + acc));
  } else {
    // WEBSITE (PayPal 2.9% + 30p)
    commission = gbp(sp * 0.029 + 0.30);
    postage = 6.30;
    pVat = gbp(postage * 0.20);
    totalVat = pVat;
    gp = gbp(diff - marginalTax - (commission + postage + pVat + acc));
  }

  const gpPercent = bp > 0 ? gbp((gp / bp) * 100) : 0;
  const totalVatNtp = gbp(marginalTax - totalVat);

  return {
    'Date': s.date || '',
    'Order Number': s.channelOrderId || '',
    'SKU': s.sku || '',
    'IMEI': s.imei || '',
    'Model': s.model || '',
    'Colour': s.color || '',
    'Storage': s.storage || '',
    'Supplier': s.supplier || '',
    'Quantity': s.quantity || 1,
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
    'Comments': s.internalNotes || '',
  };
}

// 1. Summary
const channelTotals = {};
for (const ch of CHANNELS) {
  channelTotals[ch] = {
    sales: 0, revenue: 0, grossGP: 0, returns: 0, refunds: 0,
    replacements: 0, repairs: 0, carriage: 0, feesKept: 0,
  };
}

for (const s of sales) {
  const ch = normaliseChannel(s.channel);
  const row = channelRow(s, ch);
  channelTotals[ch].sales++;
  channelTotals[ch].revenue += Number(s.sellPrice || 0);
  channelTotals[ch].grossGP += Number(row.GP || 0);
}

for (const r of returns) {
  const ch = normaliseChannel(r.channel);
  channelTotals[ch].returns++;
  const outc = (r.outcome || '').toLowerCase();
  if (outc === 'refund') channelTotals[ch].refunds++;
  else if (outc === 'replacement') channelTotals[ch].replacements++;
  else if (outc === 'repair') channelTotals[ch].repairs++;
  const legs = Number(r.shippingLegs || 2);
  const legCost = Number(r.carriageCost || 0);
  channelTotals[ch].carriage += (legCost * legs);
  channelTotals[ch].feesKept += Number(r.feesKept || 0);
}

const summaryAoa = [
  ['Sales Report – Audit Summary'],
  ['Period: All Time'],
  ['This working report breaks down sales, returns, and gross profit by marketplace channel.'],
  [],
  ['Marketplace', 'Sales', 'Refunds', 'Replacements', 'Repairs', 'Gross GP £', 'Return Cost £', 'Net GP £', 'Net GP %'],
];

let totS = 0, totRef = 0, totRep = 0, totGross = 0, totRetC = 0, totNet = 0, totRev = 0;

for (const ch of CHANNELS) {
  const c = channelTotals[ch];
  const retCost = gbp(c.carriage + c.feesKept);
  const netGP = gbp(c.grossGP - retCost);
  const netGPPct = c.revenue > 0 ? gbp((netGP / c.revenue) * 100) : 0;
  summaryAoa.push([
    ch, c.sales, c.refunds, c.replacements, c.repairs,
    gbp(c.grossGP), retCost, netGP, `${netGPPct}%`,
  ]);
  totS += c.sales; totRef += c.refunds; totGross += c.grossGP;
  totRetC += retCost; totNet += netGP; totRev += c.revenue;
}

summaryAoa.push([
  'TOTAL', totS, totRef, 0, 0,
  gbp(totGross), gbp(totRetC), gbp(totNet), totRev > 0 ? `${gbp((totNet / totRev) * 100)}%` : '0%',
]);

summaryAoa.push([]);
summaryAoa.push(['Notes']);
summaryAoa.push(['• Refunds + Repairs + Return-to-Supplier each eat 2 shipping legs (outbound + inbound). Replacements eat 3.']);
summaryAoa.push(['• Postage Loss = (postage + P.VAT) * legs, snapshotted at Process Return time. eBay legs carry no VAT.']);
summaryAoa.push(['• Fees Kept = what the marketplace did not give back on a refund: Amazon min(20% * commission, £5) + VAT; eBay £0.40 + VAT; Back Market / OnBuy / Temu keep every fee.']);
summaryAoa.push(['• WEBSITE: Channel 7 (Lehart / Mobilephonetech.co.uk) incurs 0% marketplace commission — only standard PayPal gateway fee.']);

XLSX.utils.book_append_sheet(salesWb, XLSX.utils.aoa_to_sheet(summaryAoa), 'Summary');

// 2. Channel tabs
for (const ch of CHANNELS) {
  const chSales = sales.filter(s => normaliseChannel(s.channel) === ch);
  const rows = chSales.map(s => channelRow(s, ch));
  XLSX.utils.book_append_sheet(salesWb, XLSX.utils.json_to_sheet(rows), ch);
}

// 3. Returns & Profit
const pRows = CHANNELS.map(ch => {
  const c = channelTotals[ch];
  const retCost = gbp(c.carriage + c.feesKept);
  const netGP = gbp(c.grossGP - retCost);
  return {
    'Marketplace': ch,
    'Sales': c.sales,
    'Revenue £': gbp(c.revenue),
    'Gross GP £': gbp(c.grossGP),
    'Returns': c.returns,
    'Refunds': c.refunds,
    'Replacements': c.replacements,
    'Repairs': c.repairs,
    'To Supplier': 0,
    'Carriage £': gbp(c.carriage),
    'Repair Invoices £': 0,
    'Supplier Credits £': 0,
    'Fees Kept £': gbp(c.feesKept),
    'Return Cost £': retCost,
    'Net GP £': netGP,
    'Net GP %': c.revenue > 0 ? gbp((netGP / c.revenue) * 100) : 0,
    'Costs Outstanding': '',
  };
});

pRows.push({
  'Marketplace': 'TOTAL',
  'Sales': totS,
  'Revenue £': gbp(totRev),
  'Gross GP £': gbp(totGross),
  'Returns': returns.length,
  'Refunds': totRef,
  'Replacements': 0,
  'Repairs': 0,
  'To Supplier': 0,
  'Carriage £': gbp(Object.values(channelTotals).reduce((s, c) => s + c.carriage, 0)),
  'Repair Invoices £': 0,
  'Supplier Credits £': 0,
  'Fees Kept £': gbp(Object.values(channelTotals).reduce((s, c) => s + c.feesKept, 0)),
  'Return Cost £': gbp(totRetC),
  'Net GP £': gbp(totNet),
  'Net GP %': totRev > 0 ? gbp((totNet / totRev) * 100) : 0,
  'Costs Outstanding': '',
});

XLSX.utils.book_append_sheet(salesWb, XLSX.utils.json_to_sheet(pRows), 'Returns & Profit');

// 4. Accessories
XLSX.utils.book_append_sheet(salesWb, XLSX.utils.json_to_sheet([]), 'Accessories');

// 5. Returns Summary
XLSX.utils.book_append_sheet(salesWb, XLSX.utils.aoa_to_sheet([
  ['Period', 'All Time'],
  ['Total Returns', returns.length],
  ['Refunds', returns.filter(r => (r.outcome || '').toLowerCase() === 'refund').length],
  ['Replacements', returns.filter(r => (r.outcome || '').toLowerCase() === 'replacement').length],
  ['Repairs', returns.filter(r => (r.outcome || '').toLowerCase() === 'repair').length],
  ['To Supplier', 0],
  ['Written Off', 0],
]), 'Returns Summary');

// 6. Returns Detail
const retRows = returns.map(r => {
  const item = (r.items && r.items[0]) || {};
  const legs = Number(r.shippingLegs || 2);
  const legCost = Number(r.carriageCost || 0);
  return {
    'Return Date': r.createdAt || '',
    'Unit IMEI': item.imei || '',
    'Model': item.model || '',
    'Storage': item.storage || '',
    'Colour': item.color || '',
    'Supplier': item.supplier || '',
    'Original Sale Date': '',
    'Original Sale Price': Number(item.price || 0),
    'Marketplace': normaliseChannel(r.channel),
    'Return Type': r.stockRestoredDate ? 'Back to Inventory' : 'To Supplier',
    'Outcome': r.outcome || 'refund',
    'Reason': r.reason || '',
    'Comments': r.staffNote || '',
    'Leg Cost £': legCost,
    'Shipping Legs': legs,
    'Postage Loss £': gbp(legCost * legs),
    'Fee Loss £': Number(r.feesKept || 0),
    'Stock In Date': r.stockRestoredDate || '',
  };
});
XLSX.utils.book_append_sheet(salesWb, XLSX.utils.json_to_sheet(retRows), 'Returns Detail');

// 7. Unit Histories
XLSX.utils.book_append_sheet(salesWb, XLSX.utils.json_to_sheet([]), 'Unit Histories');

const salesFilename = `sales-report-${today}.xlsx`;
const salesFilePath = join(outDir, salesFilename);
XLSX.writeFile(salesWb, salesFilePath);
console.log(`✓ Saved sales report: ${salesFilePath} (${sales.length} sales rows across ${CHANNELS.length} channels)`);

// Also copy to Downloads folder if exists
const downloadsFolder = join(process.env.USERPROFILE || 'C:\\Users\\Dell', 'Downloads');
if (existsSync(downloadsFolder)) {
  copyFileSync(salesFilePath, join(downloadsFolder, salesFilename));
  copyFileSync(invFilePath, join(downloadsFolder, invFilename));
  console.log(`✓ Copied both reports to ${downloadsFolder} for immediate access!`);
}
