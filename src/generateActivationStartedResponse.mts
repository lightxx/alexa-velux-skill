import { v4 as uuidv4 } from "uuid";
import { ActivationStartedEvent } from "./types/ActivationStartedEvent.mjs";

export const generateActivationStartedResponse = (correlationToken: string, token: string, endpointId: string) => {
  const activationStartedResponse: ActivationStartedEvent = {
    event: {
      header: {
        namespace: "Alexa.SceneController",
        name: "ActivationStarted",
        messageId: uuidv4(),
        correlationToken: correlationToken,
        payloadVersion: "3"
      },
      endpoint: {
        scope: {
          type: "BearerToken",
          token: token
        },
        endpointId: endpointId
      },
      payload: {
        cause: {
          type: "VOICE_INTERACTION"
        },
        timestamp: new Date()
      }
    },
    context: {}
  };

  return activationStartedResponse;
};
