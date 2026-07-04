import {
  ALL_FINANCE_RECORD_TYPES,
  type FinanceRecordType,
} from "@/lib/constants";

export function isFinanceRecordType(value: string): value is FinanceRecordType {
  return (ALL_FINANCE_RECORD_TYPES as readonly string[]).includes(value);
}
