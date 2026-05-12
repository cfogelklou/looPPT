import { IContainerElement } from "./renderer/Renderer";
export interface ISettings {
    onHyperlink?(create: () => HTMLElement, hyperlink: {
        url: () => string;
    }): IContainerElement;
    /**
     * Callback which is called with information about the type of picture and a function to render it.
     * The callback can then decide the output to be rendered.
     * @param isLegacy Null if the picture is the only one provided. Otherwise specifies whether the picture
     * is a legacy picture (e.g. if both an emf and a wmf version of a picture are available).
     * @param create A function which returns the result of rendering the picture.
     * @return The {HTMLElement} you want to display
     */
    onPicture?(isLegacy: null | boolean, create: () => HTMLElement): HTMLElement;
    onImport?(relUrls: string, callback: (data: {
        error?: Error;
        keyword?: string;
        blob?: ArrayBuffer;
        width?: number;
        height?: number;
    }) => void): void;
}
export declare class DocumentFacade {
    private _document;
    private _renderer;
    private _parsed;
    constructor(blob: ArrayBuffer, settings: ISettings);
    metadata(): {
        [key: string]: any;
    };
    render(): Promise<HTMLElement[]>;
}
