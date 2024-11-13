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

// Lambda handler setup
export const handler = SkillBuilders.custom()
  .addRequestInterceptors(UserIdInterceptor)
  .addRequestHandlers(
    LaunchRequestHandler,
    SetupEnvironmentIntentHandler,
    OpenShuttersIntentHandler,
    CloseShuttersIntentHandler
  )
  .addErrorHandlers(SkillErrorHandler)
  .lambda();
