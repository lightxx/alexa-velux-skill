// To parse this data:
//
//   import { Convert, DiscoveryResponse } from "./file";
//
//   const discoveryResponse = Convert.toDiscoveryResponse(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface DiscoveryResponse {
    event: Event;
}

export interface Event {
    header:  Header;
    payload: Payload;
}

export interface Header {
    namespace:      string;
    name:           string;
    payloadVersion: string;
    messageId:      string;
}

export interface Payload {
    endpoints: Endpoint[];
}

export interface Endpoint {
    endpointId:           string;
    manufacturerName:     Manufacturer;
    friendlyName:         string;
    description:          Description;
    displayCategories:    DisplayCategory[];
    additionalAttributes: AdditionalAttributes;
    cookie:               Cookie;
    capabilities:         Capability[];
}

export interface AdditionalAttributes {
    manufacturer:     Manufacturer;
    model:            string;
    customIdentifier: string;
}

export enum Manufacturer {
    Velux = "Velux",
}

export interface Capability {
    type:                 TypeEnum;
    interface:            Interface;
    version:              string;
    instance?:            Instance;
    capabilityResources?: CapabilityResources;
    configuration?:       Configuration;
    properties?:          Properties;
}

export interface CapabilityResources {
    friendlyNames: CapabilityResourcesFriendlyName[];
}

export interface CapabilityResourcesFriendlyName {
    "@type": Type;
    value:   PurpleValue;
}

export enum Type {
    Asset = "asset",
    Text = "text",
}

export interface PurpleValue {
    text?:    Text;
    locale?:  Locale;
    assetId?: AssetID;
}

export enum AssetID {
    AlexaDeviceNameShade = "Alexa.DeviceName.Shade",
}

export enum Locale {
    DeDE = "de-DE",
    EnUS = "en-US",
}

export enum Text {
    Rolladen = "Rolladen",
    Shutter = "Shutter",
}

export interface Configuration {
    ordered:        boolean;
    supportedModes: SupportedMode[];
}

export interface SupportedMode {
    value:         ValueEnum;
    modeResources: ModeResources;
}

export interface ModeResources {
    friendlyNames: ModeResourcesFriendlyName[];
}

export interface ModeResourcesFriendlyName {
    "@type": Type;
    value:   FluffyValue;
}

export interface FluffyValue {
    text:   ValueEnum;
    locale: Locale;
}

export enum ValueEnum {
    Close = "close",
    Open = "open",
    Schließen = "schließen",
    Öffnen = "öffnen",
}

export enum Instance {
    ShutterPosition = "Shutter.Position",
}

export enum Interface {
    Alexa = "Alexa",
    AlexaEndpointHealth = "Alexa.EndpointHealth",
    AlexaModeController = "Alexa.ModeController",
}

export interface Properties {
    supported:           Supported[];
    proactivelyReported: boolean;
    retrievable:         boolean;
}

export interface Supported {
    name: Name;
}

export enum Name {
    Connectivity = "connectivity",
    Mode = "mode",
}

export enum TypeEnum {
    AlexaInterface = "AlexaInterface",
}

export interface Cookie {
}

export enum Description {
    AVeluxRollerShutter = "A Velux roller shutter",
}

export enum DisplayCategory {
    ExteriorBlind = "EXTERIOR_BLIND",
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toDiscoveryResponse(json: string): DiscoveryResponse {
        return cast(JSON.parse(json), r("DiscoveryResponse"));
    }

    public static discoveryResponseToJson(value: DiscoveryResponse): string {
        return JSON.stringify(uncast(value, r("DiscoveryResponse")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "DiscoveryResponse": o([
        { json: "event", js: "event", typ: r("Event") },
    ], false),
    "Event": o([
        { json: "header", js: "header", typ: r("Header") },
        { json: "payload", js: "payload", typ: r("Payload") },
    ], false),
    "Header": o([
        { json: "namespace", js: "namespace", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "payloadVersion", js: "payloadVersion", typ: "" },
        { json: "messageId", js: "messageId", typ: "" },
    ], false),
    "Payload": o([
        { json: "endpoints", js: "endpoints", typ: a(r("Endpoint")) },
    ], false),
    "Endpoint": o([
        { json: "endpointId", js: "endpointId", typ: "" },
        { json: "manufacturerName", js: "manufacturerName", typ: r("Manufacturer") },
        { json: "friendlyName", js: "friendlyName", typ: "" },
        { json: "description", js: "description", typ: r("Description") },
        { json: "displayCategories", js: "displayCategories", typ: a(r("DisplayCategory")) },
        { json: "additionalAttributes", js: "additionalAttributes", typ: r("AdditionalAttributes") },
        { json: "cookie", js: "cookie", typ: r("Cookie") },
        { json: "capabilities", js: "capabilities", typ: a(r("Capability")) },
    ], false),
    "AdditionalAttributes": o([
        { json: "manufacturer", js: "manufacturer", typ: r("Manufacturer") },
        { json: "model", js: "model", typ: r("Model") },
        { json: "customIdentifier", js: "customIdentifier", typ: "" },
    ], false),
    "Capability": o([
        { json: "type", js: "type", typ: r("TypeEnum") },
        { json: "interface", js: "interface", typ: r("Interface") },
        { json: "version", js: "version", typ: "" },
        { json: "instance", js: "instance", typ: u(undefined, r("Instance")) },
        { json: "capabilityResources", js: "capabilityResources", typ: u(undefined, r("CapabilityResources")) },
        { json: "configuration", js: "configuration", typ: u(undefined, r("Configuration")) },
        { json: "properties", js: "properties", typ: u(undefined, r("Properties")) },
    ], false),
    "CapabilityResources": o([
        { json: "friendlyNames", js: "friendlyNames", typ: a(r("CapabilityResourcesFriendlyName")) },
    ], false),
    "CapabilityResourcesFriendlyName": o([
        { json: "@type", js: "@type", typ: r("Type") },
        { json: "value", js: "value", typ: r("PurpleValue") },
    ], false),
    "PurpleValue": o([
        { json: "text", js: "text", typ: u(undefined, r("Text")) },
        { json: "locale", js: "locale", typ: u(undefined, r("Locale")) },
        { json: "assetId", js: "assetId", typ: u(undefined, r("AssetID")) },
    ], false),
    "Configuration": o([
        { json: "ordered", js: "ordered", typ: true },
        { json: "supportedModes", js: "supportedModes", typ: a(r("SupportedMode")) },
    ], false),
    "SupportedMode": o([
        { json: "value", js: "value", typ: r("ValueEnum") },
        { json: "modeResources", js: "modeResources", typ: r("ModeResources") },
    ], false),
    "ModeResources": o([
        { json: "friendlyNames", js: "friendlyNames", typ: a(r("ModeResourcesFriendlyName")) },
    ], false),
    "ModeResourcesFriendlyName": o([
        { json: "@type", js: "@type", typ: r("Type") },
        { json: "value", js: "value", typ: r("FluffyValue") },
    ], false),
    "FluffyValue": o([
        { json: "text", js: "text", typ: r("ValueEnum") },
        { json: "locale", js: "locale", typ: r("Locale") },
    ], false),
    "Properties": o([
        { json: "supported", js: "supported", typ: a(r("Supported")) },
        { json: "proactivelyReported", js: "proactivelyReported", typ: true },
        { json: "retrievable", js: "retrievable", typ: true },
    ], false),
    "Supported": o([
        { json: "name", js: "name", typ: r("Name") },
    ], false),
    "Cookie": o([
    ], false),
    "Manufacturer": [
        "Velux",
    ],
    "Model": [
        "NXO",
    ],
    "Type": [
        "asset",
        "text",
    ],
    "AssetID": [
        "Alexa.DeviceName.Shade",
    ],
    "Locale": [
        "de-DE",
        "en-US",
    ],
    "Text": [
        "Rolladen",
        "Shutter",
    ],
    "ValueEnum": [
        "close",
        "open",
        "schließen",
        "öffnen",
    ],
    "Instance": [
        "Shutter.Position",
    ],
    "Interface": [
        "Alexa",
        "Alexa.EndpointHealth",
        "Alexa.ModeController",
    ],
    "Name": [
        "connectivity",
        "mode",
    ],
    "TypeEnum": [
        "AlexaInterface",
    ],
    "Description": [
        "A Velux roller shutter",
    ],
    "DisplayCategory": [
        "EXTERIOR_BLIND",
    ],
};
