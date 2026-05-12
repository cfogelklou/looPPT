import { Document } from "../../Document";
import { GlobalState } from "../Containers";
import { DestinationBase, DestinationFactory, IDestination } from "./DestinationBase";
export declare class InfoDestination extends DestinationBase {
    private _metadata;
    private inst;
    constructor(parser: GlobalState, inst: Document, name: string);
    apply(): void;
    setMetadata(prop: string, val: any): void;
}
export interface IMetaPropertyDestination extends IDestination {
    apply(): void;
}
export declare class MetaPropertyDestinationFactory extends DestinationFactory<IMetaPropertyDestination> {
    constructor(metaprop: string);
}
export interface IMetaPropertyTimeDestination extends IDestination {
    handleKeyword(keyword: string, param: number): boolean;
    apply(): void;
}
export declare class MetaPropertyTimeDestinationFactory extends DestinationFactory<IMetaPropertyTimeDestination> {
    constructor(metaprop: string);
}
