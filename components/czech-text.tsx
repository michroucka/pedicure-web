import {
    Children,
    cloneElement,
    isValidElement,
    type ReactElement,
    type ReactNode,
} from "react";
import { bindSingleLetterWords } from "@/lib/czech-typography";

function bindInTree(node: ReactNode): ReactNode {
    if (typeof node === "string") return bindSingleLetterWords(node);
    if (!isValidElement<{ children?: ReactNode }>(node)) return node;
    if (node.props.children === undefined) return node;

    return cloneElement(
        node as ReactElement<{ children?: ReactNode }>,
        undefined,
        ...(Children.map(node.props.children, bindInTree) ?? [])
    );
}

// Applies bindSingleLetterWords to every text in the JSX written inside it,
// so copy stays readable in the source instead of being littered with
// &nbsp;. It only sees what's passed as children here – text rendered
// inside another component (e.g. a <Card> that builds its own content)
// needs its own <CzechText>.
export function CzechText({ children }: { children: ReactNode }) {
    return <>{Children.map(children, bindInTree)}</>;
}
