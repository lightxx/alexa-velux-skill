import { Endpoint } from "./Endpoint.mjs";
import { Header } from "./Header.mjs";
import { Scope } from "./Scope.mjs";

export interface SmartHomeDirective {
  directive: Directive;
}

export interface Directive {
  header:    Header;
  payload:   Payload;
  endpoint?: Endpoint;
}

export interface Payload {
  scope?: Scope;
  mode?:  string;
}
