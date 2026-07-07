"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CustomerDeleteButton({
  customerId,
  accountName,
}: {
  customerId: string;
  accountName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `确定删除客户「${accountName}」？其联系人、地址与关联商机等数据将一并删除，且不可恢复。`,
      )
    ) {
      return;
    }
    setDeleting(true);
    const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.push("/customers");
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="shrink-0 text-red-400 hover:bg-rose-500/20 hover:text-red-300"
      disabled={deleting}
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4" />
      {deleting ? "删除中…" : "删除客户"}
    </Button>
  );
}
