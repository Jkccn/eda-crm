"use client";

import { Input } from "@/components/ui/input";

export type OemFormFields = {
  oemOpportunityNo: string;
  oemOpportunityName: string;
  oemRegisterStartAt: string;
  oemRegisterExpiresAt: string;
};

export const emptyOemFormFields: OemFormFields = {
  oemOpportunityNo: "",
  oemOpportunityName: "",
  oemRegisterStartAt: "",
  oemRegisterExpiresAt: "",
};

export function OemRegistrationFields({
  form,
  onChange,
}: {
  form: OemFormFields;
  onChange: (next: OemFormFields) => void;
}) {
  return (
    <div className="space-y-3 border-t border-white/10 pt-4">
      <p className="text-xs font-medium text-slate-500">原厂客户报备（可选）</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">商机号码</label>
          <Input
            value={form.oemOpportunityNo}
            onChange={(e) => onChange({ ...form, oemOpportunityNo: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">商机名称</label>
          <Input
            value={form.oemOpportunityName}
            onChange={(e) => onChange({ ...form, oemOpportunityName: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">开始时间</label>
          <Input
            type="date"
            value={form.oemRegisterStartAt}
            onChange={(e) => onChange({ ...form, oemRegisterStartAt: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">过期时间</label>
          <Input
            type="date"
            value={form.oemRegisterExpiresAt}
            onChange={(e) => onChange({ ...form, oemRegisterExpiresAt: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
