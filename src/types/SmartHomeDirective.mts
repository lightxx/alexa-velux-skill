export interface SmartHomeDirective {
  directive: Directive;
}

export interface Directive {
  header:    Header;
  payload:   Payload;
  endpoint?: Endpoint;
}

export interface Endpoint {
  scope:      Scope;
  endpointId: string;
  cookie:     Cookie;
}

export interface Cookie {
}

export interface Scope {
  type:  string;
  token: string;
}

export interface Header {
  namespace:         string;
  name:              string;
  payloadVersion:    string;
  messageId:         string;
  correlationToken?: string;
  instance?:         string;
}

export interface Payload {
  scope?: Scope;
  mode?:  string;
}
