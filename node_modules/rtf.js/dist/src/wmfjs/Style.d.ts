import { Bitmap16, DIBitmap, PatternBitmap16 } from "./Bitmap";
import { Blob } from "./Blob";
import { Obj, PointS } from "./Primitives";
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
    pattern: Bitmap16;
    colorusage: number;
    dibpatternpt: DIBitmap;
    hatchstyle: number;
    constructor(reader: Blob, copy: Brush | number, forceDibPattern?: boolean | PatternBitmap16);
    clone(): Brush;
    toString(): string;
}
export declare class Pen extends Obj {
    style: number;
    width: PointS;
    color: ColorRef;
    linecap: number;
    join: number;
    constructor(reader: Blob, style?: number, width?: PointS, color?: ColorRef, linecap?: number, join?: number);
    clone(): Pen;
    toString(): string;
}
export declare class PaletteEntry {
    flag: number;
    b: number;
    g: number;
    r: number;
    constructor(reader: Blob, copy?: PaletteEntry);
    clone(): PaletteEntry;
}
export declare class Palette extends Obj {
    start: number;
    entries: PaletteEntry[];
    constructor(reader: Blob, copy?: Palette);
    clone(): Palette;
    toString(): string;
}
