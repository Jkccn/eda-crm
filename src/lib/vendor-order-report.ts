import { quarterKey } from "@/lib/oem-registration";

export const VENDOR_BOOKING_DONE_STATUS = "Done";

export type DoneVendorBookingRow = {
  orderDate: Date | null;
  opportunity: { customerId: string };
};

export type CustomerVendorOrderInfo = {
  hasVendorOrderDone: boolean;
  vendorOrderDate: Date | null;
};

/** 按客户汇总：是否存在状态为 Done 的原厂下单，及最早下单日 */
export function buildCustomerVendorOrderMap(
  bookings: DoneVendorBookingRow[],
): Map<string, CustomerVendorOrderInfo> {
  const map = new Map<string, CustomerVendorOrderInfo>();

  for (const booking of bookings) {
    const customerId = booking.opportunity.customerId;
    const existing = map.get(customerId) ?? {
      hasVendorOrderDone: false,
      vendorOrderDate: null,
    };
    existing.hasVendorOrderDone = true;

    if (booking.orderDate) {
      if (!existing.vendorOrderDate || booking.orderDate < existing.vendorOrderDate) {
        existing.vendorOrderDate = booking.orderDate;
      }
    }

    map.set(customerId, existing);
  }

  return map;
}

export function countOrderedCustomersByQuarter(
  bookings: DoneVendorBookingRow[],
  registeredCustomerIds?: Set<string>,
): Map<string, number> {
  const byQuarter = new Map<string, Set<string>>();

  for (const booking of bookings) {
    const customerId = booking.opportunity.customerId;
    if (registeredCustomerIds && !registeredCustomerIds.has(customerId)) continue;

    const date = booking.orderDate;
    if (!date) continue;
    const key = quarterKey(date);
    const set = byQuarter.get(key) ?? new Set<string>();
    set.add(customerId);
    byQuarter.set(key, set);
  }

  return new Map([...byQuarter.entries()].map(([q, set]) => [q, set.size]));
}

export function countRegisteredCustomersWithVendorOrder(
  vendorOrderByCustomer: Map<string, CustomerVendorOrderInfo>,
  registeredCustomerIds: Set<string>,
): number {
  let count = 0;
  for (const customerId of registeredCustomerIds) {
    if (vendorOrderByCustomer.get(customerId)?.hasVendorOrderDone) count += 1;
  }
  return count;
}
