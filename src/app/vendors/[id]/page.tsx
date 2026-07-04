import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VendorContactsPanel } from "@/components/vendors/vendor-contacts-panel";
import { VendorProfilePanel } from "@/components/vendors/vendor-profile-panel";
import { VendorRelationsPanel } from "@/components/vendors/vendor-relations-panel";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGlobalViewer } from "@/lib/rbac";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function VendorDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isGlobalViewer(user.role)) redirect("/dashboard");

  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) notFound();

  return (
    <div className="space-y-6">
      <Link href="/vendors" className="link-hover inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft className="h-4 w-4" />
        返回供应商列表
      </Link>

      <VendorProfilePanel initial={vendor} />

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-slate-200">供应商联系人</h2></CardHeader>
        <CardBody><VendorContactsPanel vendorId={vendor.id} /></CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-200">关系维护（节日 / 礼品）</h2>
        </CardHeader>
        <CardBody><VendorRelationsPanel vendorId={vendor.id} /></CardBody>
      </Card>
    </div>
  );
}
