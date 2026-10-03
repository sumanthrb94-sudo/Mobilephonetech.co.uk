import { describe, it, expect } from 'vitest';
import {
  buildSalesReportWorkbook,
  buildInventoryReportWorkbook,
  type SalesLineItem,
  type InventoryUnit,
} from '../../lib/reports';
import type { ReturnRequest } from '../../types';

describe('reports.ts', () => {
  it('builds a multi-channel sales workbook with all expected sheets and channels', () => {
    const sampleSales: SalesLineItem[] = [
      {
        date: '2026-10-02',
        channel: 'AMAZON',
        channelOrderId: '205-6237735-3041939',
        sku: 'ASI-IP-SE3-128-MN-EX',
        model: 'iPhone SE3',
        imei: '359968971043836',
        storage: '128GB',
        color: 'Black',
        condition: 'Excellent',
        supplier: 'NIHAL',
        buyPrice: 108,
        sellPrice: 159.99,
      },
      {
        date: '2026-10-02',
        channel: 'WEBSITE',
        channelOrderId: 'ORD-1001',
        sku: 'SG-S22-128-BK',
        model: 'Galaxy S22',
        imei: '357452521508426',
        storage: '128GB',
        color: 'Black',
        condition: 'Excellent',
        supplier: 'MHL',
        buyPrice: 148,
        sellPrice: 199.99,
      },
    ];

    const sampleReturns: ReturnRequest[] = [
      {
        id: 'ret-1',
        orderId: 'ORD-1',
        userId: 'user-1',
        customerName: 'Customer A',
        customerEmail: 'test@example.com',
        channel: 'AMAZON',
        status: 'approved',
        outcome: 'refund',
        reason: 'changed_mind',
        legalBasis: 'cooling_off',
        photoUrls: [],
        history: [],
        refundAmount: 419.99,
        carriageCost: 7.56,
        shippingLegs: 2,
        feesKept: 5.0,
        createdAt: '2026-09-29',
        updatedAt: '2026-09-29',
        items: [{
          productId: 'prod-1',
          model: 'iPad 11th Gen',
          brand: 'Apple',
          imei: 'SD12HG9HYC3',
          price: 419.99,
          quantity: 1,
        }],
      },
    ];

    const wb = buildSalesReportWorkbook(sampleSales, sampleReturns);

    expect(wb.SheetNames).toContain('Summary');
    expect(wb.SheetNames).toContain('AMAZON');
    expect(wb.SheetNames).toContain('BM');
    expect(wb.SheetNames).toContain('EBAY');
    expect(wb.SheetNames).toContain('ONBUY');
    expect(wb.SheetNames).toContain('TEMU');
    expect(wb.SheetNames).toContain('WEBSITE');
    expect(wb.SheetNames).toContain('Returns & Profit');
    expect(wb.SheetNames).toContain('Returns Detail');
  });

  it('builds an inventory workbook with Office Stock and SHS Stock', () => {
    const sampleUnits: InventoryUnit[] = [
      {
        stockInDate: '2026-10-02',
        model: 'GALAXY S21 Fe',
        imei: '350799511538038',
        condition: 'Pristine',
        storage: '128GB',
        simType: 'Physical SIM + eSIM',
        color: 'Grey',
        supplier: 'ABC',
        buyPrice: 108,
        stockLocation: 'OFFICE',
      },
      {
        stockInDate: '2026-09-17',
        model: 'Pixel 6A',
        condition: 'Excellent',
        storage: '128GB',
        simType: 'Physical SIM + eSIM',
        color: 'Black',
        supplier: 'MHL',
        buyPrice: 95,
        stockLocation: 'SHS',
      },
    ];

    const wb = buildInventoryReportWorkbook(sampleUnits);

    expect(wb.SheetNames).toEqual(['Office Stock', 'SHS Stock']);
  });
});
