import { Document } from "../Document";
import { Renderer } from "../renderer/Renderer";
export declare class Parser {
    private inst;
    private parser;
    constructor(document: Document, blob: ArrayBuffer, renderer: Renderer);
    parse(): Promise<void>;
    private eof;
    private readChar;
    private unreadChar;
    private readBlob;
    private applyDestination;
    private applyText;
    private summarizeText;
    private pushState;
    private popState;
    private changeDestination;
    private processKeyword;
    private appendText;
    private applyBlob;
    private parseKeyword;
    private parseLoop;
}
