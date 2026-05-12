import { Blob } from "./Blob";
import { Obj, Rect } from "./Primitives";
export declare class Region extends Obj {
    bounds: Rect;
    scans: Scan[];
    complexity: number;
    constructor(reader: Blob, copy?: Region);
    clone(): Region;
    toString(): string;
    _updateComplexity(): void;
    subtract(rect: Rect): void;
    intersect(rect: Rect): void;
    offset(offX: number, offY: number): void;
}
export declare function CreateSimpleRegion(left: number, top: number, right: number, bottom: number): Region;
export declare class Scan {
    top: number;
    bottom: number;
    scanlines: {
        left: number;
        right: number;
    }[];
    constructor(reader: Blob, copy?: Scan, top?: number, bottom?: number, scanlines?: {
        left: number;
        right: number;
    }[]);
    clone(): Scan;
    subtract(left: number, right: number): boolean;
    intersect(left: number, right: number): boolean;
    toString(): string;
}
