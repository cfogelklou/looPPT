import { Blob } from "./Blob";
import { GDIContext } from "./GDIContext";
export declare class WMFRecords {
    private _records;
    constructor(reader: Blob, first: number);
    play(gdi: GDIContext): void;
}
