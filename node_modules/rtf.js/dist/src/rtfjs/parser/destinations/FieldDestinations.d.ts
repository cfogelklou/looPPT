import { Document } from "../../Document";
import { GlobalState } from "../Containers";
import { DestinationBase, DestinationFormattedTextBase, DestinationTextBase } from "./DestinationBase";
import { RtfDestination } from "./RtfDestination";
export interface IField {
    renderFieldBegin(field: FieldDestination, rtf: RtfDestination, records: number): boolean;
    renderFieldEnd(field: FieldDestination, rtf: RtfDestination, records: number): void;
}
export declare class FieldDestination extends DestinationBase {
    private _haveInst;
    private _parsedInst;
    private _result;
    constructor();
    apply(): void;
    setInst(inst: IField | Promise<IField | null>): void;
    getInst(): IField;
    setResult(inst: FldrsltDestination): void;
}
export declare class FldinstDestination extends DestinationTextBase {
    private parser;
    private inst;
    constructor(parser: GlobalState, inst: Document);
    apply(): void;
    private parseType;
}
export declare class FldrsltDestination extends DestinationFormattedTextBase {
    constructor(parser: GlobalState, inst: Document);
    apply(): void;
    renderBegin(rtf: RtfDestination, records: number): boolean;
    renderEnd(rtf: RtfDestination, records: number): void;
}
