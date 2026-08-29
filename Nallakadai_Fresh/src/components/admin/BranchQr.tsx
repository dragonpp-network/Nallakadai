import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export type QrBranch = {
  id: string;
  name: string;
  whatsapp_number: string | null;
};

function defaultMessage(branchName: string) {
  return [
    `Hello Nalla Kadai (${branchName}), I would like to register for ordering.`,
    "",
    "Name:",
    "Mobile number:",
    "Delivery preference (Door Delivery / Customer Pickup):",
    "Delivery address / area:",
  ].join("\n");
}

/** Digits only, defaulting to the Indian country code when omitted. */
function waNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

export function BranchQrDialog({
  branch,
  onOpenChange,
}: {
  branch: QrBranch | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [png, setPng] = useState("");

  useEffect(() => {
    if (branch) setMessage(defaultMessage(branch.name));
  }, [branch]);

  const number = waNumber(branch?.whatsapp_number ?? "");
  const link = useMemo(
    () => (number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : ""),
    [number, message],
  );

  useEffect(() => {
    if (!link) return void setPng("");
    let cancelled = false;
    QRCode.toDataURL(link, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#7B1E1E", light: "#FFFFFF" },
    })
      .then((url) => !cancelled && setPng(url))
      .catch(() => !cancelled && setPng(""));
    return () => {
      cancelled = true;
    };
  }, [link]);

  function download() {
    if (!png || !branch) return;
    const a = document.createElement("a");
    a.href = png;
    a.download = `nalla-kadai-${branch.name.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    a.click();
  }

  function print() {
    if (!png || !branch) return;
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    w.document.write(
      `<html><head><title>${branch.name} QR</title></head>
       <body style="font-family:sans-serif;text-align:center;padding:40px">
       <h1 style="color:#7B1E1E">Nalla Kadai · ${branch.name}</h1>
       <p>Scan to register on WhatsApp</p>
       <img src="${png}" style="width:420px" />
       <p style="color:#555">www.nallakadai.in</p>
       </body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Dialog open={!!branch} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{branch?.name} · enquiry QR</DialogTitle>
          <DialogDescription>
            Scanning opens WhatsApp to this branch's enquiry number with the onboarding details
            pre-filled. Customers cannot self-register — an admin creates the record after calling.
          </DialogDescription>
        </DialogHeader>

        {!number ? (
          <p className="rounded-md bg-muted p-4 text-sm">
            Add a WhatsApp enquiry number for this branch first.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center rounded-lg bg-card p-4">
              {png ? (
                <img src={png} alt={`WhatsApp enquiry QR code for ${branch?.name}`} className="w-56" />
              ) : (
                <div className="h-56 w-56 animate-pulse rounded bg-muted" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Pre-filled message</Label>
              <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={download}>Download PNG</Button>
              <Button variant="outline" onClick={print}>
                Print
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(link);
                  toast.success("WhatsApp link copied");
                }}
              >
                Copy link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
