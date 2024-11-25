import { RequestHandler, ErrorHandler, HandlerInput } from "ask-sdk-core";
import { SkillBuilders } from "ask-sdk";

import random from "random-string-alphanumeric-generator";
import * as shared from "velux-alexa-integration-shared";
import { Callback, Context } from "aws-lambda";
import { RequestEnvelope } from "ask-sdk-model";
import { SmartHomeDirective } from "./types/SmartHomeDirective.mjs";
import {
  Description,
  DisplayCategory,
  Endpoint,
  Instance,
  Interface,
  Locale,
  Manufacturer,
  Type,
  TypeEnum,
  Text,
  AssetID,
  ValueEnum,
  Name,
  DiscoveryResponse,
} from "./types/discovery-response.mjs";

import { v4 as uuidv4 } from "uuid";

let code: string | null = null;

const SetupEnvironmentIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name ===
        "SetupEnvironmentIntent"
    );
  },
  async handle(handlerInput: HandlerInput): Promise<any> {
    try {
      code = await shared.findKeyByValue(shared.state.storedUserId!);
      let spokenCode: string = "";

      if (!code) {
        code = random.randomAlphanumeric(6, "uppercase");
      }

      for (const c of code) {
        spokenCode += `<say-as interpret-as='spell-out'>${c}</say-as><break strength='strong'/>`;
      }

      const spokenURL = `
        alexa<say-as interpret-as='characters'>.t-h.cc</say-as>.
      `;

      const speakOutput = `
        <speak>
          <p>Willkommen! Bitte die Web App unter ${spokenURL} aufrufen und folgenden Token eingeben:</p>
          <break strength='strong'/>
          <p>${spokenCode}.</p>
          <break strength='strong'/>
          <p>Um den Token zu wiederholen, sage bitte erneut "Umgebung einrichten"</p>
        </speak>
      `;

      await shared.persistUserId(code);

      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }

      return handlerInput.responseBuilder
        .speak("Fehler beim Laden der Konfigurationsdaten!")
        .getResponse();
    }
  },
};

const LaunchRequestHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  },
  handle(handlerInput: HandlerInput): any {
    const speakOutput =
      "Willkommen beim Velux Rolläden Skill! Du kannst mich bitten die Rolläden zu öffnen oder zu schließen. Vor der ersten Verwendung sage bitte: Umgebung einrichten. Was soll ich tun?";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const OpenShuttersIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "OpenShuttersIntent"
    );
  },
  async handle(handlerInput: HandlerInput): Promise<any> {
    try {
      await shared.sendScenarioRequestWithRetry("wake_up");
      const speakOutput = "Die Rolläden werden geöffnet!";

      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("API Error: ", error.message);
      }

      const errorMessage =
        "Beim Öffnen der Rolläden ist ein Fehler aufgetreten.";
      return handlerInput.responseBuilder.speak(errorMessage).getResponse();
    }
  },
};

// Intent handler for closing the shutters
const CloseShuttersIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "CloseShuttersIntent"
    );
  },
  async handle(handlerInput: HandlerInput): Promise<any> {
    try {
      await shared.sendScenarioRequestWithRetry("bedtime");
      const speakOutput = "Die Rolläden werden geschlossen!";

      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("API Error: ", error.message);
      }

      const errorMessage =
        "Beim Schließen der Rolläden ist ein Fehler aufgetreten!";
      return handlerInput.responseBuilder.speak(errorMessage).getResponse();
    }
  },
};

// Error handler for any unhandled errors
const SkillErrorHandler: ErrorHandler = {
  canHandle(): boolean {
    return true;
  },
  handle(handlerInput: HandlerInput, error: Error): any {
    console.error(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak("Leider habe ich keine Ahnung was du von mir willst.")
      .reprompt("Leider habe ich keine Ahnung was du von mir willst.")
      .getResponse();
  },
};

// Interceptor for managing userId and warming up shared data
const UserIdInterceptor = {
  async process(handlerInput: HandlerInput): Promise<void> {
    const userId = handlerInput.requestEnvelope.session?.user?.userId;
    if (userId) {
      shared.state.storedUserId = userId;
      await shared.warmUp();
      console.log("State: " + JSON.stringify(shared.state, null, 2));
    }
  },
};

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
      } else if (namespace === "Alexa" && event.directive.header.name === "ReportState") {
        const reportStateResponse = await ReportStateHandler(event);
        return reportStateResponse;
      }
      else {
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

const DeviceDiscoveryHandler = async (event: SmartHomeDirective) => {
  const token = event.directive.payload!.scope!.token;

  await shared.warmUpSmartHome(token);

  let endpoints: Array<Endpoint> = [];

  const homeInfo = await shared.getHomeInfoWithRetry();

  homeInfo.data.body.homes[0].modules.forEach((module) => {
    if (!module.velux_type || module.velux_type !== "shutter") return;

    const endpoint: Endpoint = {
      endpointId: module.id,
      manufacturerName: Manufacturer.Velux,
      friendlyName: "Roller Shutter " + module.name,
      description: Description.AVeluxRollerShutter,
      displayCategories: [DisplayCategory.ExteriorBlind],
      additionalAttributes: {
        manufacturer: Manufacturer.Velux,
        model: module.type,
        customIdentifier: module.id,
      },
      cookie: {},
      capabilities: [
        {
          type: TypeEnum.AlexaInterface,
          interface: Interface.Alexa,
          version: "3",
        },
        {
          type: TypeEnum.AlexaInterface,
          interface: Interface.AlexaModeController,
          version: "3",
          instance: Instance.ShutterPosition,
          capabilityResources: {
            friendlyNames: [
              {
                "@type": Type.Text,
                value: {
                  text: Text.Shutter,
                  locale: Locale.EnUS,
                },
              },
              {
                "@type": Type.Text,
                value: {
                  text: Text.Rolladen,
                  locale: Locale.DeDE,
                },
              },
              {
                "@type": Type.Asset,
                value: {
                  assetId: AssetID.AlexaDeviceNameShade,
                },
              },
            ],
          },
          configuration: {
            ordered: false,
            supportedModes: [
              {
                value: ValueEnum.Open,
                modeResources: {
                  friendlyNames: [
                    {
                      "@type": Type.Text,
                      value: {
                        text: ValueEnum.Open,
                        locale: Locale.EnUS,
                      },
                    },
                    {
                      "@type": Type.Text,
                      value: {
                        text: ValueEnum.Öffnen,
                        locale: Locale.DeDE,
                      },
                    },
                  ],
                },
              },
              {
                value: ValueEnum.Close,
                modeResources: {
                  friendlyNames: [
                    {
                      "@type": Type.Text,
                      value: {
                        text: ValueEnum.Close,
                        locale: Locale.EnUS,
                      },
                    },
                    {
                      "@type": Type.Text,
                      value: {
                        text: ValueEnum.Schließen,
                        locale: Locale.DeDE,
                      },
                    },
                  ],
                },
              },
            ],
          },
          properties: {
            supported: [
              {
                name: Name.Mode,
              },
            ],
            proactivelyReported: false,
            retrievable: true,
          },
        },
        {
          type: TypeEnum.AlexaInterface,
          interface: Interface.AlexaEndpointHealth,
          version: "3",
          properties: {
            supported: [
              {
                name: Name.Connectivity,
              },
            ],
            proactivelyReported: false,
            retrievable: true,
          },
        },
      ],
    };

    endpoints.push(endpoint);
  });

  const discoveryResponse: DiscoveryResponse = {
    event: {
      header: {
        namespace: "Alexa.Discovery",
        name: "Discover.Response",
        payloadVersion: "3",
        messageId: uuidv4(),
      },
      payload: {
        endpoints: endpoints,
      },
    },
  };

  return discoveryResponse;
};

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

async function ReportStateHandler(event: SmartHomeDirective) {
  const token = event.directive.endpoint?.scope.token!;

  await shared.warmUpSmartHome(token);

  const homeInfo = await shared.getHomeStatusWithRetry();
}
