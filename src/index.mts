import { SkillBuilders } from "ask-sdk";

import * as shared from "velux-alexa-integration-shared";
import { Callback, Context } from "aws-lambda";
import { RequestEnvelope } from "ask-sdk-model";
import { SmartHomeDirective } from "./types/SmartHomeDirective.mjs";

import { DeviceDiscoveryHandler } from "./DeviceDiscoveryHandler.mjs";
import { SetupEnvironmentIntentHandler } from "./CustomSkillIntentHandlers.mjs";
import { ReportStateHandler } from "./ReportStateHandler.mjs";
import {
  OpenShuttersIntentHandler,
  CloseShuttersIntentHandler,
  SkillErrorHandler,
  UserIdInterceptor,
  LaunchRequestHandler,
} from "./CustomSkillIntentHandlers.mjs";
import { generateActivationStartedResponse } from "./generateActivationStartedResponse.mjs";

export const handler = async (
  event: RequestEnvelope | SmartHomeDirective,
  context: Context,
  callback: Callback
) => {
  console.log("Request: ", JSON.stringify(event, null, 2));

  if (isSmartHomeDirective(event)) {
    try {
      const namespace = event.directive.header.namespace;

      if (namespace === "Alexa.Discovery") {
        console.log("Handling Alexa Discovery request...");
        const discoveryResponse = await DeviceDiscoveryHandler(event);
        return discoveryResponse;
      } else if (
        namespace === "Alexa" &&
        event.directive.header.name === "ReportState"
      ) {
        const reportStateResponse = await ReportStateHandler(event);
        return reportStateResponse;
      } else {
        console.log(
          `Handling Smart Home directive for namespace: ${namespace}`
        );
        const smartHomeResponse = await SmartHomeHandler(event);
        return smartHomeResponse;
      }
    } catch (error) {
      console.error("Smart Home directive error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal Server Error" }),
      };
    }
  } else {
    try {
      const customSkillHandler = SkillBuilders.custom()
        .addRequestInterceptors(UserIdInterceptor)
        .addRequestHandlers(
          LaunchRequestHandler,
          SetupEnvironmentIntentHandler,
          OpenShuttersIntentHandler,
          CloseShuttersIntentHandler
        )
        .addErrorHandlers(SkillErrorHandler)
        .lambda();

      const result = await new Promise((resolve, reject) => {
        customSkillHandler(event, context, (err: any, response: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        });
      });

      return result;
    } catch (error) {
      console.error("Custom Skill directive error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal Server Error" }),
      };
    }
  }
};

function isSmartHomeDirective(event: any): event is SmartHomeDirective {
  return (
    event &&
    event.directive &&
    event.directive.header &&
    event.directive.header.namespace !== undefined
  );
}

const SmartHomeHandler = async (event: SmartHomeDirective) => {
  if (event.directive.header.namespace === "Alexa.ModeController") {
    const directiveName = event.directive.header.name;
    const endpointId = event.directive.endpoint!.endpointId;

    if (endpointId === "velux-shutter") {
      if (directiveName === "SetMode") {
        const mode = event.directive.payload.mode;

        if (mode === "open") {
          await shared.sendScenarioRequestWithRetry("wake_up");
          return generateSmartHomeResponse("SUCCESS");
        } else if (mode === "close") {
          await shared.sendScenarioRequestWithRetry("bedtime");
          return generateSmartHomeResponse("SUCCESS");
        }
      }
    }
  } else if (event.directive.header.namespace === "Alexa.SceneController") {
    const directiveName = event.directive.header.name;
    const endpointId = event.directive.endpoint!.endpointId;
    const token = event.directive.endpoint!.scope.token;
    const correlationToken = event.directive.header.correlationToken!;

    if (directiveName === "Activate") {
      if (endpointId === "open-all-shutters") {
        await shared.sendScenarioRequestWithRetry("wake_up");
        return generateActivationStartedResponse(correlationToken, token, endpointId);
      } else if (endpointId === "close-all-shutters") {
        await shared.sendScenarioRequestWithRetry("bedtime");
        return generateActivationStartedResponse(correlationToken, token, endpointId);
      }
    }
  }

  return generateSmartHomeResponse("ERROR");
};

const generateSmartHomeResponse = (status: string) => {
  return {
    event: {
      header: {
        namespace: "Alexa",
        name: status === "SUCCESS" ? "Response" : "ErrorResponse",
        payloadVersion: "3",
        messageId: "message-1234",
      },
      endpoint: {
        endpointId: "velux-endpoint-01",
      },
      payload: {},
    },
  };
};


