import { IColor } from "./parser/destinations/ColortblDestinations";
export declare class RTFJSError extends Error {
    constructor(message: string);
}
export declare function loggingEnabled(enabled: boolean): void;
export declare class Helper {
    static JUSTIFICATION: {
        LEFT: string;
        CENTER: string;
        RIGHT: string;
        JUSTIFY: string;
    };
    static BREAKTYPE: {
        NONE: string;
        COL: string;
        EVEN: string;
        ODD: string;
        PAGE: string;
    };
    static PAGENUMBER: {
        DECIMAL: string;
        UROM: string;
        LROM: string;
        ULTR: string;
        LLTR: string;
    };
    static UNDERLINE: {
        NONE: string;
        CONTINUOUS: string;
        DOTTED: string;
        DASHED: string;
        DASHDOTTED: string;
        DASHDOTDOTTED: string;
        DOUBLE: string;
        HEAVYWAVE: string;
        LONGDASHED: string;
        THICK: string;
        THICKDOTTED: string;
        THICKDASHED: string;
        THICKDASHDOTTED: string;
        THICKDASHDOTDOTTED: string;
        THICKLONGDASH: string;
        DOUBLEWAVE: string;
        WORD: string;
        WAVE: string;
    };
    static FONTPITCH: {
        DEFAULT: number;
        FIXED: number;
        VARIABLE: number;
    };
    static CHARACTER_TYPE: {
        LOWANSI: string;
        HIGHANSI: string;
        DOUBLE: string;
    };
    static SUPERSUBSCRIPT: {
        SUPERSCRIPT: number;
        NONE: number;
        SUBSCRIPT: number;
    };
    static log(message: string): void;
    static _isalpha(str: string): boolean;
    static _isdigit(str: string): boolean;
    static _parseHex(str: string): number;
    static _blobToBinary(blob: ArrayBuffer): string;
    static _hexToBlob(str: string): ArrayBuffer;
    static _hexToBinary(str: string): string;
    static _mapCharset(idx: number): number;
    static _mapColorTheme(name: string): null;
    static _colorToStr(color: IColor): string;
    static _twipsToPt(twips: number): number;
    static _twipsToPx(twips: number): number;
    static _pxToTwips(px: number): number;
    private static _A;
    private static _a;
    private static _F;
    private static _f;
    private static _Z;
    private static _z;
    private static _0;
    private static _9;
    private static _charsetMap;
    private static _colorThemeMap;
}
