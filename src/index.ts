import { RequestHandler, ErrorHandler, HandlerInput } from "ask-sdk-core";
import { SkillBuilders } from 'ask-sdk';

import random from "random-string-alphanumeric-generator";
import * as shared from "velux-alexa-integration-shared";

let code: string | null = null;

const SetupEnvironmentIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "SetupEnvironmentIntent"
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
      await shared.postRequest("wake_up");
      const speakOutput = "Die Rolläden werden geöffnet!";

      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("API Error: ", error.message);
      }

      const errorMessage = "Beim Öffnen der Rolläden ist ein Fehler aufgetreten.";
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
      await shared.postRequest("bedtime");
      const speakOutput = "Die Rolläden werden geschlossen!";

      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("API Error: ", error.message);
      }

      const errorMessage = "Beim Schließen der Rolläden ist ein Fehler aufgetreten!";
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

export const handler = async (event: any, context: any, callback: any) => {
  console.log('Request:', JSON.stringify(event, null, 2));

  // Check if the event is a Smart Home directive
  if (event.directive) {
    if (event.directive.header.namespace === "Alexa.Discovery") {
      callback(null, await DeviceDiscoveryHandler());
    } else {
      callback(null, await SmartHomeHandler(event));
    }
  } else {
    // Otherwise, treat it as a Custom Skill request
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

    // Use the custom skill handler to process the request
    return customSkillHandler(event, context, callback);
  }
};

// Device Discovery Handler
const DeviceDiscoveryHandler = async () => {
  return {
    event: {
      header: {
        namespace: "Alexa.Discovery",
        name: "Discover.Response",
        payloadVersion: "3",
        messageId: "message-1234"
      },
      payload: {
        endpoints: [
          {
            endpointId: "velux-shutter",
            manufacturerName: "Velux",
            friendlyName: "Rolläden",
            description: "Velux Shutters",
            displayCategories: ["INTERIOR_BLIND"],
            capabilities: [
              {
                type: "AlexaInterface",
                interface: "Alexa.ModeController",
                instance: "Velux.Shutter.Mode",
                version: "3",
                properties: {
                  supported: [
                    {
                      name: "mode"
                    }
                  ],
                  retrievable: false
                },
                capabilityResources: {
                  friendlyNames: [
                    {
                      "@type": "text",
                      value: {
                        text: "mode",
                        locale: "de-DE"
                      }
                    }
                  ]
                },
                configuration: {
                  ordered: false,
                  supportedModes: [
                    {
                      value: {
                        instance: "open",
                        labels: [
                          {
                            "@type": "text",
                            value: {
                              text: "open",
                              locale: "de-DE"
                            }
                          },
                          {
                            "@type": "text",
                            value: {
                              text: "öffnen",
                              locale: "de-DE"
                            }
                          }
                        ]
                      }
                    },
                    {
                      value: {
                        instance: "close",
                        labels: [
                          {
                            "@type": "text",
                            value: {
                              text: "close",
                              locale: "de-DE"
                            }
                          },
                          {
                            "@type": "text",
                            value: {
                              text: "schließen",
                              locale: "de-DE"
                            }
                          }
                        ]
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
};

const SmartHomeHandler = async (event: any) => {
  if (event.directive.header.namespace === "Alexa.ModeController") {
    const directiveName = event.directive.header.name;
    const endpointId = event.directive.endpoint.endpointId;

    if (endpointId === "velux-shutter") {
      if (directiveName === "SetMode") {
        const mode = event.directive.payload.mode;

        if (mode === "open") {
          await shared.postRequest("wake_up"); // Open the shutters
          return generateSmartHomeResponse("SUCCESS");
        } else if (mode === "close") {
          await shared.postRequest("bedtime"); // Close the shutters
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
        messageId: "message-1234"
      },
      endpoint: {
        endpointId: "velux-shutter"
      },
      payload: {}
    }
  };
};