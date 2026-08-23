import { cn } from "@/lib/utils"

const steps = ["Termín", "Údaje", "Potvrzení"]

export function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
    return (
        <div className="py-3 my-3 max-w-md mx-auto">
            <div className="flex gap-2">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-1.5 flex-1 rounded-full",
                            i + 1 <= currentStep ? "bg-primary" : "bg-muted"
                        )}
                    />
                ))}
            </div>
            <div className="mt-2 flex gap-2">
                {steps.map((label, i) => (
                    <span
                        key={label}
                        className={cn(
                            "flex-1 text-center text-xs text-muted-foreground",
                            i + 1 === currentStep &&
                                "font-medium text-foreground"
                        )}
                    >
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
}