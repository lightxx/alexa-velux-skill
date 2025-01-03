export interface Header {
    namespace:         string;
    name:              string;
    payloadVersion:    string;
    messageId:         string;
    correlationToken?: string;
    instance?:         string;
  }