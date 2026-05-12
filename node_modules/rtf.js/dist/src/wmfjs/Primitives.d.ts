import { Blob } from "./Blob";
export declare class PointS {
    x: number;
    y: number;
    constructor(reader: Blob, x?: number, y?: number);
    clone(): PointS;
    toString(): string;
}
export declare class Rect {
    bottom: number;
    right: number;
    top: number;
    left: number;
    constructor(reader: Blob, left?: number, top?: number, right?: number, bottom?: number);
    clone(): Rect;
    toString(): string;
    empty(): boolean;
    intersect(rect: Rect): null | Rect;
}
export declare class Obj {
    type: string;
    constructor(type: string);
    clone(): Obj;
    toString(): string;
}
