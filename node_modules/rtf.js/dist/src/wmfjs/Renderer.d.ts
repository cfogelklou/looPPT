export interface IRendererSettings {
    width: string;
    height: string;
    xExt: number;
    yExt: number;
    mapMode: number;
}
export declare class Renderer {
    private _img;
    constructor(blob: ArrayBuffer);
    render(info: IRendererSettings): SVGElement;
    private parse;
    private _render;
}
