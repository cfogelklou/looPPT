import { Blob } from "./Blob";
import { GDIContext } from "./GDIContext";
export declare class EMFRecords {
    private _records;
    private _header;
    constructor(reader: Blob, first: number);
    play(gdi: GDIContext): void;
}
