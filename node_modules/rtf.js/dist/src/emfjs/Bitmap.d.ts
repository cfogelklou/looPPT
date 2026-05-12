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
    private _location;
    private _info;
    constructor(reader: Blob, bitmapInfo?: any);
    getWidth(): number;
    getHeight(): number;
    totalSize(): number;
    makeBitmapFileHeader(): string;
    base64ref(): string;
}
export {};
