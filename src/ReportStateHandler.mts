import { v4 as uuidv4 } from "uuid";
import * as shared from "velux-alexa-integration-shared";
import { SmartHomeDirective } from "./types/SmartHomeDirective.mjs";
import { StateReport } from "./types/statereport-response.mjs";

export const ReportStateHandler = async (event: SmartHomeDirective) => {
  const token = event.directive.endpoint!.scope.token;
  const correlationToken = event.directive.header.correlationToken!;
  const endpointId = event.directive.endpoint!.endpointId;

  await shared.warmUpSmartHome(token);

  const homeInfo = await shared.getHomeStatusWithRetry();
  const module = homeInfo.data.body.home.modules.find(
    (module) => module.id === endpointId
  );

  if (module) {
    const stateReport: StateReport = {
      event: {
        header: {
          namespace: "Alexa",
          name: "StateReport",
          messageId: uuidv4(),
          correlationToken: correlationToken,
          payloadVersion: "3",
        },
        endpoint: {
          endpointId: endpointId,
        },
        payload: {},
      },
      context: {
        properties: [
          {
            namespace: "Alexa.RangeController",
            name: "rangeValue",
            instance: "Blind.Lift",
            value: module.current_position!,
            timeOfSample: new Date(),
            uncertaintyInMilliseconds: 0
          },
          {
            namespace: "Alexa.EndpointHealth",
            name: "connectivity",
            value: {
              value: module.reachable ? "OK" : "UNREACHABLE"
            },
            timeOfSample: new Date(),
            uncertaintyInMilliseconds: 0
          }
        ],
      },
    };

    return stateReport;
  }

  return "";
};
