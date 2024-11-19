import { RequestHandler, ErrorHandler, HandlerInput } from "ask-sdk-core";
import { SkillBuilders } from "ask-sdk";

import random from "random-string-alphanumeric-generator";
import * as shared from "velux-alexa-integration-shared";
import { Callback, Context } from "aws-lambda";

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

// Intent handler for opening the shutters
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
  event: any,
  context: Context,
  callback: Callback
) => {
  console.log("Request:", JSON.stringify(event, null, 2));

  // Check if the event is a Smart Home directive
  if (event.directive) {
    try {
      const namespace = event.directive.header.namespace;

      if (namespace === "Alexa.Discovery") {
        // Handle Alexa Discovery Directive
        console.log("Handling Alexa Discovery request...");
        const discoveryResponse = await DeviceDiscoveryHandler();
        return discoveryResponse; // Directly return the response to Alexa
      } else {
        // Handle Smart Home directives (e.g., SetMode, TurnOn, TurnOff)
        console.log(
          `Handling Smart Home directive for namespace: ${namespace}`
        );
        const smartHomeResponse = await SmartHomeHandler(event);
        return smartHomeResponse; // Directly return the response to Alexa
      }
    } catch (error) {
      console.error("Smart Home directive error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal Server Error" }),
      };
    }
  } else {
    // Otherwise, treat it as a Custom Skill request
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

      // Wrap the custom skill handler in a promise
      const result = await new Promise((resolve, reject) => {
        customSkillHandler(event, context, (err: any, response: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        });
      });

      return result; // Return the response to Alexa
    } catch (error) {
      console.error("Custom Skill directive error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal Server Error" }),
      };
    }
  }
};

const DeviceDiscoveryHandler = async () => {
  const discoveryResponse = {
    "event": {
      "header": {
        "namespace": "Alexa.Discovery",
        "name": "Discover.Response",
        "payloadVersion": "3",
        "messageId": "0a58ace0-e6ab-47de-b6af-b600b5ab8a7a"
      },
      "payload": {
        "endpoints": [
          {
            "endpointId": "velux-endpoint-01",
            "manufacturerName": "Velux",
            "friendlyName": "Velux Roller Shutter",
            "description": "A Velux roller shutter that supports open and close modes",
            "displayCategories": [
              "EXTERIOR_BLIND"
            ],
            "cookie": {},
            "capabilities": [
              {
                "type": "AlexaInterface",
                "interface": "Alexa",
                "version": "3"
              },
              {
                "type": "AlexaInterface",
                "interface": "Alexa.ModeController",
                "version": "3",
                "instance": "Shutter.Position",
                "capabilityResources": {
                  "friendlyNames": [
                    {
                      "@type": "text",
                      "value": {
                        "text": "Shutter",
                        "locale": "en-US"
                      }
                    },
                    {
                      "@type": "text",
                      "value": {
                        "text": "Rolladen",
                        "locale": "de-DE"
                      }
                    }
                  ]
                },
                "configuration": {
                  "ordered": true,
                  "supportedModes": [
                    {
                      "value": "open",
                      "modeResources": {
                        "friendlyNames": [
                          {
                            "@type": "text",
                            "value": {
                              "text": "open",
                              "locale": "en-US"
                            }
                          },
                          {
                            "@type": "text",
                            "value": {
                              "text": "öffnen",
                              "locale": "de-DE"
                            }
                          }
                        ]
                      }
                    },
                    {
                      "value": "close",
                      "modeResources": {
                        "friendlyNames": [
                          {
                            "@type": "text",
                            "value": {
                              "text": "close",
                              "locale": "en-US"
                            }
                          },
                          {
                            "@type": "text",
                            "value": {
                              "text": "schließen",
                              "locale": "de-DE"
                            }
                          }
                        ]
                      }
                    }
                  ]
                },
                "properties": {
                  "supported": [
                    {
                      "name": "mode"
                    }
                  ],
                  "proactivelyReported": false,
                  "retrievable": true
                }
              },
              {
                "type": "AlexaInterface",
                "interface": "Alexa.EndpointHealth",
                "version": "3",
                "properties": {
                  "supported": [
                    {
                      "name": "connectivity"
                    }
                  ],
                  "proactivelyReported": false,
                  "retrievable": true
                }
              }
            ]
          },
          {
            "endpointId": "scene-close-all-shutters",
            "manufacturerName": "Velux",
            "friendlyName": "Close All Shutters",
            "description": "A scene to close all Velux roller shutters",
            "displayCategories": [
              "SCENE_TRIGGER"
            ],
            "cookie": {},
            "capabilities": [
              {
                "type": "AlexaInterface",
                "interface": "Alexa.SceneController",
                "version": "3",
                "supportsDeactivation": false,
                "capabilityResources": {
                  "friendlyNames": [
                    {
                      "@type": "text",
                      "value": {
                        "text": "Close All Shutters",
                        "locale": "en-US"
                      }
                    },
                    {
                      "@type": "text",
                      "value": {
                        "text": "Alle Rollläden schließen",
                        "locale": "de-DE"
                      }
                    }
                  ]
                }
              }
            ]
          },
          {
            "endpointId": "scene-open-all-shutters",
            "manufacturerName": "Velux",
            "friendlyName": "Open All Shutters",
            "description": "A scene to open all Velux roller shutters",
            "displayCategories": [
              "SCENE_TRIGGER"
            ],
            "cookie": {},
            "capabilities": [
              {
                "type": "AlexaInterface",
                "interface": "Alexa.SceneController",
                "version": "3",
                "supportsDeactivation": false,
                "capabilityResources": {
                  "friendlyNames": [
                    {
                      "@type": "text",
                      "value": {
                        "text": "Open All Shutters",
                        "locale": "en-US"
                      }
                    },
                    {
                      "@type": "text",
                      "value": {
                        "text": "Alle Rollläden öffnen",
                        "locale": "de-DE"
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    }
  };

  return discoveryResponse;
};

const SmartHomeHandler = async (event: any) => {
  if (event.directive.header.namespace === "Alexa.ModeController") {
    const directiveName = event.directive.header.name;
    const endpointId = event.directive.endpoint.endpointId;

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
