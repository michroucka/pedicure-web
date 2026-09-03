import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupText,
} from "@/components/ui/input-group.tsx";

// Shared by BookingDetailDialog (amount prefilled from a booking's service
// price) and QuickQrDialog (amount always starts empty, entered by hand) —
// both just own the amount as state and hand it down here.
export function QrPayment({
    amount,
    onAmountChange,
    autoFocus,
}: {
    amount: string;
    onAmountChange: (value: string) => void;
    autoFocus?: boolean;
}) {
    const amountValue = Number(amount);
    const qrUrl =
        amountValue > 0
            ? `https://api.paylibo.com/paylibo/generator/czech/image?${new URLSearchParams(
                  {
                      accountPrefix: process.env.NEXT_PUBLIC_BANK_PREFIX ?? "",
                      accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "",
                      bankCode: process.env.NEXT_PUBLIC_BANK_CODE ?? "",
                      amount,
                      currency: "CZK",
                      message: "Pedikúra",
                      size: "300",
                      branding: "false",
                  }
              ).toString()}`
            : undefined;

    return (
        <div className="flex flex-col gap-5">
            {qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic external QR image, no benefit from next/image
                <img
                    src={qrUrl}
                    alt="QR platba"
                    className="mx-auto rounded-lg border"
                    width={240}
                    height={240}
                />
            ) : (
                <div
                    className="mx-auto flex items-center justify-center rounded-lg border text-center text-sm text-muted-foreground"
                    style={{ width: 240, height: 240 }}
                >
                    Zadejte částku.
                </div>
            )}

            <div className="flex items-center justify-center gap-2">
                <span className="font-medium">Částka:</span>
                <InputGroup className="w-auto max-w-32">
                    <InputGroupInput
                        type="number"
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => onAmountChange(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        autoFocus={autoFocus}
                    />
                    <InputGroupAddon align="inline-end">
                        <InputGroupText>Kč</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </div>
        </div>
    );
}
