export declare class SVGFilters {
    flood(filter: SVGFilterElement, resultId: string, color: string, opacity: number, _settings?: any): void;
    composite(filter: SVGFilterElement, resultId: string, in1: string, in2: string, k1?: number, k2?: number, k3?: number, k4?: number, _settings?: any): void;
}
export declare class SVGPathBuilder {
    private _path;
    move(x: number, y: number): void;
    path(): string;
    line(pts: number[][]): void;
    curveC(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void;
    close(): void;
}
export declare class SVG {
    filters: SVGFilters;
    private _svg;
    private _defs;
    constructor(svg: SVGElement);
    svg(parent: Element, x: number, y: number, width: number, height: number, settings?: any): SVGElement;
    image(parent: Element, x: number, y: number, width: number, height: number, url: string, settings?: any): SVGImageElement;
    rect(parent: Element, x: number, y: number, width: number, height: number, rx?: number, ry?: number, settings?: any): SVGRectElement;
    rect(parent: Element, x: number, y: number, width: number, height: number, settings?: any): SVGRectElement;
    line(parent: Element, x1: number, y1: number, x2: number, y2: number, settings?: any): SVGLineElement;
    polygon(parent: Element, points: number[][], settings?: any): SVGPolygonElement;
    polyline(parent: Element, points: number[][], settings?: any): SVGPolylineElement;
    ellipse(parent: Element, cx: number, cy: number, rx: number, ry: number, settings?: any): SVGEllipseElement;
    path(parent: SVGElement, builder: SVGPathBuilder, settings?: any): SVGPathElement;
    text(parent: Element, x: number, y: number, value: string, settings?: any): SVGTextElement;
    filter(parent: Element, id: string, x: number, y: number, width: number, height: number, settings?: any): SVGFilterElement;
    pattern(parent: Element, resultId: string, x: number, y: number, width: number, height: number, settings?: any): SVGPatternElement;
    defs(): SVGDefsElement;
    clipPath(parent: Element, resultId: string, units?: string, settings?: any): SVGClipPathElement;
    createPath(): SVGPathBuilder;
    private _appendSettings;
}
