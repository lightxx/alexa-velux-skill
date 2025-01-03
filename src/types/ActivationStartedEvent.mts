import { Endpoint } from "./Endpoint.mjs";
import { Header } from "./Header.mjs";

export interface ActivationStartedEvent {
    event:   Event;
    context: Context;
}

export interface Context {
}

export interface Event {
    header:   Header;
    endpoint: Endpoint;
    payload:  Payload;
}

export interface Payload {
    cause:     Cause;
    timestamp: Date;
}

export interface Cause {
    type: string;
}
