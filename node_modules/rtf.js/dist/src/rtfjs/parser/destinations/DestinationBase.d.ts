import { Document } from "../../Document";
import { GlobalState } from "../Containers";
import { RtfDestination } from "./RtfDestination";
export declare abstract class DestinationFactory<T extends IDestination> {
    class: new (parser: GlobalState, inst: Document, name: string, param: number) => T;
    newDestination(parser: GlobalState, inst: Document, name: string, param: number): T;
}
export interface IDestination {
    _name: string;
    setMetadata?(metaprop: string, metavalue: any): void;
    apply?(): void;
    appendText?(text: string): void;
    sub?(): IDestination;
    handleKeyword?(keyword: string, param: number): void | boolean;
    handleBlob?(blob: ArrayBuffer): void;
    [key: string]: any;
}
export declare const findParentDestination: (parser: GlobalState, dest: string) => IDestination;
export declare class DestinationBase implements IDestination {
    _name: string;
    constructor(name: string);
}
export declare class DestinationTextBase implements IDestination {
    _name: string;
    text: string;
    constructor(name: string);
    appendText(text: string): void;
}
export declare abstract class DestinationFormattedTextBase implements IDestination {
    _name: string;
    protected parser: GlobalState;
    private _records;
    constructor(parser: GlobalState, name: string);
    appendText(text: string): void;
    handleKeyword(keyword: string, param: number): void;
    apply(): void;
    abstract renderBegin(rtf: RtfDestination, records: number): boolean;
    abstract renderEnd(rtf: RtfDestination, records: number): void;
}
export interface IGenericPropertyDestination extends IDestination {
    apply(): void;
}
export declare class GenericPropertyDestinationFactory extends DestinationFactory<IGenericPropertyDestination> {
    constructor(parentdest: string, metaprop: string);
}
export interface IGenericSubTextPropertyDestination extends IDestination {
    apply(): void;
}
export declare class GenericSubTextPropertyDestinationFactory extends DestinationFactory<IGenericSubTextPropertyDestination> {
    constructor(name: string, parentDest: string, propOrFunc: string);
}
export declare class RequiredDestinationFactory extends DestinationFactory<IDestination> {
    constructor(name: string);
}
