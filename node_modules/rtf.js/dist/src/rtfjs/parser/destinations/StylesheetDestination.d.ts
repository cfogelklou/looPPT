import { Document } from "../../Document";
import { GlobalState } from "../Containers";
import { DestinationBase } from "./DestinationBase";
export declare class StylesheetDestinationSub extends DestinationBase {
    private _stylesheet;
    private index;
    private name;
    private handler;
    private paragraph?;
    constructor(stylesheet: StylesheetDestination);
    handleKeyword(keyword: string, param: number): boolean;
    appendText(text: string): void;
    apply(): void;
    private _handleKeywordCommon;
}
export declare class StylesheetDestination extends DestinationBase {
    private _stylesheets;
    private inst;
    constructor(parser: GlobalState, inst: Document);
    sub(): StylesheetDestinationSub;
    apply(): void;
    addSub(sub: {
        index: number;
        name: string;
    }): void;
}
