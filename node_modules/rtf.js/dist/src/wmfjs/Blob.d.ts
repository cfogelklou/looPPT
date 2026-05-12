export declare class Blob {
    pos: number;
    private blob;
    private data;
    constructor(blob: Blob | ArrayBuffer, offset?: number);
    eof(): boolean;
    seek(newpos: number): void;
    skip(cnt: number): void;
    readBinary(cnt: number): string;
    readInt8(): number;
    readUint8(): number;
    readInt32(): number;
    readUint32(): number;
    readUint16(): number;
    readInt16(): number;
    readString(length: number): string;
    readNullTermString(maxSize: number): string;
}
