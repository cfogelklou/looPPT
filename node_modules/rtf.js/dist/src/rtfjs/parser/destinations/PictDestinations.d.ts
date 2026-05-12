import { Document } from "../../Document";
import { GlobalState } from "../Containers";
import { DestinationFactory, DestinationTextBase, IDestination } from "./DestinationBase";
export interface IPictGroupDestination extends IDestination {
    isLegacy(): boolean;
}
export declare class PictGroupDestinationFactory extends DestinationFactory<IPictGroupDestination> {
    constructor(legacy: boolean);
}
export declare class PictDestination extends DestinationTextBase {
    _displaysize: {
        width: number;
        height: number;
    };
    _size: {
        width: number;
        height: number;
    };
    private _type;
    private _blob;
    private parser;
    private inst;
    [key: string]: any;
    private _pictHandlers;
    private _pictTypeHandler;
    constructor(parser: GlobalState, inst: Document);
    handleKeyword(keyword: string, param: number): boolean;
    handleBlob(blob: ArrayBuffer): void;
    apply(rendering?: boolean): {
        isLegacy: boolean;
        element: HTMLElement;
    };
    private _setPropValueRequired;
}
