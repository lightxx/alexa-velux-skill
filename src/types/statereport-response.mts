export interface StateReport {
    event:   Event;
    context: Context;
}

export interface Context {
    properties: Property[];
}

export interface Property {
    namespace:                 string;
    name:                      string;
    instance?:                 string;
    value:                     ValueClass | number | string;
    timeOfSample:              Date;
    uncertaintyInMilliseconds: number;
}

export interface ValueClass {
    value: string;
}

export interface Event {
    header:   Header;
    endpoint: Endpoint;
    payload:  Payload;
}

export interface Endpoint {
    endpointId: string;
}

export interface Header {
    namespace:        string;
    name:             string;
    messageId:        string;
    correlationToken: string;
    payloadVersion:   string;
}

export interface Payload {
}
