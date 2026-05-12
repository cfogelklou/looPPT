import { Document } from "../../Document";
import { GlobalState } from "../Containers";
import { DestinationBase } from "./DestinationBase";
export interface IColor {
    r: number;
    g: number;
    b: number;
    tint: number;
    shade: number;
    theme: null;
}
export declare class ColortblDestination extends DestinationBase {
    private _colors;
    private _current;
    private _autoIndex;
    private inst;
    constructor(parser: GlobalState, inst: Document);
    appendText(text: string): void;
    handleKeyword(keyword: string, param: number): boolean;
    apply(): void;
    private _startNewColor;
    private _validateColorValueRange;
}
