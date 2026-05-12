import { Blob } from "./Blob";
interface Bitmap {
    getWidth(): number;
    getHeight(): number;
}
declare class BitmapCoreHeader {
    width: number;
    height: number;
    planes: number;
    bitcount: number;
    constructor(reader: Blob, skipsize: boolean);
    colors(): number;
}
declare class BitmapInfoHeader {
    width: number;
    height: number;
    planes: number;
    bitcount: number;
    compression: number;
    sizeimage: number;
    xpelspermeter: number;
    ypelspermeter: number;
    clrused: number;
    clrimportant: number;
    constructor(reader: Blob, skipsize: boolean);
    colors(): number;
}
export declare class BitmapInfo implements Bitmap {
    private _reader;
    private _offset;
    private _usergb;
    private _infosize;
    private _header;
    constructor(reader: Blob, usergb: boolean);
    getWidth(): number;
    getHeight(): number;
    infosize(): number;
    header(): BitmapCoreHeader | BitmapInfoHeader;
}
export declare class DIBitmap implements Bitmap {
    private _reader;
    private _offset;
    private _size;
    private _info;
    constructor(reader: Blob, size: number);
    getWidth(): number;
    getHeight(): number;
    base64ref(): string;
    private makeBitmapFileHeader;
}
export declare class Bitmap16 implements Bitmap {
    type: number;
    width: number;
    height: number;
    widthBytes: number;
    planes: number;
    bitsPixel: number;
    bitsOffset: number;
    bitsSize: number;
    private _reader;
    private _offset;
    private _size;
    constructor(reader: Blob, size: number | Bitmap16);
    getWidth(): number;
    getHeight(): number;
    clone(): Bitmap16;
}
export declare class PatternBitmap16 extends Bitmap16 {
    constructor(reader: Blob, size: number | Bitmap16);
    clone(): PatternBitmap16;
}
export {};
