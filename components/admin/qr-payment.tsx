import { Button } from "@/components/ui/button";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupText,
} from "@/components/ui/input-group";

// Shared by BookingDetailDialog (amount prefilled from a booking's service
// price) and QuickQrDialog (amount always starts empty, entered by hand) –
// both just own the amount as state and hand it down here.
export function QrPayment({
    amount,
    onAmountChange,
    autoFocus,
    quickAmounts,
}: {
    amount: string;
    onAmountChange: (value: string) => void;
    autoFocus?: boolean;
    // One-tap amounts (the service prices) so the usual case needs no
    // typing on the tablet; the field below still takes anything else.
    quickAmounts?: number[];
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
                      // Rendered at up to 288 px; 2x for sharp edges on
                      // the tablet's retina screen.
                      size: "600",
                      branding: "false",
                  }
              ).toString()}`
            : undefined;

    return (
        <div className="flex flex-col gap-5">
            {qrUrl ? (
                // Bigger on the tablet: the client scans it with her phone
                // from across the desk.
                // eslint-disable-next-line @next/next/no-img-element -- dynamic external QR image, no benefit from next/image
                <img
                    src={qrUrl}
                    alt="QR platba"
                    className="mx-auto size-60 rounded-lg border md:size-72"
                    width={288}
                    height={288}
                />
            ) : (
                <div className="mx-auto flex size-60 items-center justify-center rounded-lg border text-center text-sm text-muted-foreground md:size-72">
                    Zadejte částku.
                </div>
            )}

            {quickAmounts && quickAmounts.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {quickAmounts.map((value) => (
                        <Button
                            key={value}
                            type="button"
                            size="lg"
                            variant={
                                Number(amount) === value ? "default" : "outline"
                            }
                            onClick={() => onAmountChange(String(value))}
                        >
                            {value.toLocaleString("cs-CZ")} Kč
                        </Button>
                    ))}
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
