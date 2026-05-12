export interface IRendererSettings {
    width: string;
    height: string;
    wExt: number;
    hExt: number;
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
