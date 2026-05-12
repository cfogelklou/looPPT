import { Document } from "../../Document";
import { GlobalState } from "../Containers";
import { DestinationBase } from "./DestinationBase";
export declare class FonttblDestinationSub extends DestinationBase {
    index: number;
    fontname: string;
    altfontname: string;
    family: string;
    pitch: number;
    bias: number;
    charset: number;
    private _fonttbl;
    constructor(fonttbl: FonttblDestination);
    handleKeyword(keyword: string, param: number): boolean;
    appendText(text: string): void;
    apply(): void;
    setAltFontName(name: string): void;
}
export declare class FonttblDestination extends DestinationBase {
    private _fonts;
    private _sub;
    private inst;
    constructor(parser: GlobalState, inst: Document);
    sub(): FonttblDestinationSub;
    apply(): void;
    appendText(text: string): void;
    handleKeyword(keyword: string, param: number): void;
    addSub(sub: FonttblDestinationSub): void;
}
