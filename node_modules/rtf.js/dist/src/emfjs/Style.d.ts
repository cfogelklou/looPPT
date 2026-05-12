import { DIBitmap } from "./Bitmap";
import { Blob } from "./Blob";
import { Obj } from "./Primitives";
export declare class ColorRef {
    r: number;
    g: number;
    b: number;
    constructor(reader: Blob, r?: number, g?: number, b?: number);
    clone(): ColorRef;
    toHex(): string;
    toString(): string;
}
export declare class Font extends Obj {
    height: number;
    width: number;
    escapement: number;
    orientation: number;
    weight: number;
    italic: number;
    underline: number;
    strikeout: number;
    charset: number;
    outprecision: number;
    clipprecision: number;
    quality: number;
    pitch: number;
    family: number;
    facename: string;
    constructor(reader: Blob, copy: Font | number);
    clone(): Font;
    toString(): string;
}
export declare class Brush extends Obj {
    style: number;
    color: ColorRef;
    pattern: DIBitmap;
    dibpatternpt: DIBitmap;
    hatchstyle: number;
    constructor(reader: Blob, copy?: {
        style?: number;
        color?: ColorRef;
        pattern?: DIBitmap;
        dibpatternpt?: DIBitmap;
        hatchstyle?: number;
    });
    clone(): Brush;
    toString(): string;
}
export declare class Pen extends Obj {
    style: number | {
        header: {
            off: number;
            size: number;
        };
        data: {
            off: number;
            size: number;
        };
    };
    width: number;
    brush: Brush;
    color: ColorRef;
    constructor(reader: Blob, style?: number | {
        header: {
            off: number;
            size: number;
        };
        data: {
            off: number;
            size: number;
        };
    }, width?: number, color?: ColorRef, brush?: Brush);
    clone(): Pen;
    toString(): string;
}
