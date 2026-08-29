import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { adminMe, nonCollectionAlerts, adminOrderAction } from "@/lib/admin.functions";
import { useBranchScope } from "@/lib/branch-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/non-collection")({
  head: () => ({
    meta: [
      { title: "Non-collection | Nalla Kadai" },
      {
        name: "description",
        content: "Customers whose orders were not collected, with reasons and a way to clear flags.",
      },
      { property: "og:title", content: "Non-collection | Nalla Kadai" },
      { property: "og:description", content: "Track and clear non-collection flags." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NonCollectionPage,
});

function NonCollectionPage() {
  const { branchId } = useBranchScope();
  const me = useQuery({ queryKey: ["adminMe"], queryFn: () => adminMe() });
  const branches = (me.data?.branches ?? []).filter((b) => (branchId ? b.id === branchId : true));

  const results = useQueries({
    queries: branches.map((b) => ({
      queryKey: ["nonCollection", b.id],
      queryFn: () => nonCollectionAlerts({ data: { branchId: b.id } }),
    })),
  });

  async function clear(orderId: string, refetch: () => void) {
    await adminOrderAction({ data: { orderId, action: "clear_non_collect", reason: null } });
    toast.success("Flag cleared");
    refetch();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Non-collection</h1>
        <p className="text-sm text-muted-foreground">
          Orders flagged as not collected. Clear the flag once the customer has been spoken to.
        </p>
      </div>

      {branches.map((b, i) => {
        const rows = results[i]?.data ?? [];
        return (
          <section key={b.id} className="card-warm overflow-hidden">
            <h2 className="border-b px-5 py-3 font-display text-lg">
              {b.name} · {rows.length} flagged
            </h2>
            <div className="divide-y">
              {rows.map((r) => {
                const c = r.customers as unknown as { name: string; mobile: string } | null;
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <div className="min-w-44">
                      <div className="font-medium">{c?.name}</div>
                      <div className="text-muted-foreground">{c?.mobile}</div>
                    </div>
                    <div className="text-muted-foreground">{r.order_no}</div>
                    <div className="text-muted-foreground">
                      {r.non_collection_reason || "No reason recorded"}
                    </div>
                    <div className="ml-auto flex gap-2">
                      <a
                        href={`tel:${c?.mobile}`}
                        className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                      >
                        Call
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => clear(r.id, () => results[i]?.refetch())}
                      >
                        Clear flag
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!rows.length && (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                  No non-collection flags.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
