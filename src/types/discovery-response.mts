export interface DiscoveryResponse {
    event: Event;
}

export interface Event {
    header:  Header;
    payload: EventPayload;
}

export interface Header {
    namespace:      string;
    name:           string;
    payloadVersion: string;
    messageId:      string;
}

export interface EventPayload {
    endpoints: Endpoint[];
}

export interface Endpoint {
    endpointId:           string;
    manufacturerName:     string;
    description:          string;
    friendlyName:         string;
    displayCategories:    string[];
    additionalAttributes?: AdditionalAttributes;
    cookie:               Cookie;
    capabilities:         Capability[];
}

export interface AdditionalAttributes {
    manufacturer:     string;
    model:            string;
    customIdentifier: string;
}

export interface Capability {
    type:                 string;
    interface:            string;
    instance?:            string;
    version:              string;
    properties?:          Properties;
    capabilityResources?: CapabilityResources;
    configuration?:       Configuration;
    semantics?:           Semantics;
}

export interface CapabilityResources {
    friendlyNames: FriendlyName[];
}

export interface FriendlyName {
    "@type": string;
    value:   Value;
}

export interface Value {
    assetId?: string;
    text?: string;
    locale?: string;
}

export interface Configuration {
    supportedRange: SupportedRange;
    unitOfMeasure:  string;
}

export interface SupportedRange {
    minimumValue: number;
    maximumValue: number;
    precision:    number;
}

export interface Properties {
    supported:           Supported[];
    proactivelyReported: boolean;
    retrievable:         boolean;
}

export interface Supported {
    name: string;
}

export interface Semantics {
    actionMappings: ActionMapping[];
    stateMappings:  StateMapping[];
}

export interface ActionMapping {
    "@type":   string;
    actions:   string[];
    directive: Directive;
}

export interface Directive {
    name:    string;
    payload: DirectivePayload;
}

export interface DirectivePayload {
    rangeValue?:             number;
    rangeValueDelta?:        number;
    rangeValueDeltaDefault?: boolean;
}

export interface StateMapping {
    "@type": string;
    states:  string[];
    value?:  number;
    range?:  Range;
}

export interface Range {
    minimumValue: number;
    maximumValue: number;
}

export interface Cookie {
}
