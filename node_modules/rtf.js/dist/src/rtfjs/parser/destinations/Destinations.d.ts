import { Document } from "../../Document";
import { GlobalState } from "../Containers";
import { DestinationFactory } from "./DestinationBase";
export declare const Destinations: {
    [key: string]: ((new (parser: GlobalState, inst: Document, name: string, param: number) => any) | DestinationFactory<any>);
};
