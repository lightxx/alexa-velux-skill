import { Scope } from "./Scope.mjs";

export interface Endpoint {
    scope:      Scope;
    endpointId: string;
    cookie?:     Cookie;
  }

export interface Cookie {
}