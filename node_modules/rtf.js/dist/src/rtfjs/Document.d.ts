import { ISettings } from "./DocumentFacade";
import { IColor } from "./parser/destinations/ColortblDestinations";
import { FonttblDestinationSub } from "./parser/destinations/FonttblDestinations";
import { Renderer } from "./renderer/Renderer";
export declare class Document {
    _settings: ISettings;
    _meta: {
        [key: string]: any;
    };
    _fonts: FonttblDestinationSub[];
    _colors: IColor[];
    _autoColor: number;
    _stylesheets: {
        index: number;
        name: string;
    }[];
    _ins: (string | ((renderer: Renderer) => void))[];
    constructor(settings: ISettings);
    _lookupColor(idx: number): null | IColor;
    addIns(ins: string | ((renderer: Renderer) => void)): void;
}
