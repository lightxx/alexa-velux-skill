import { v4 as uuidv4 } from "uuid";
import * as shared from "velux-alexa-integration-shared";
import { Endpoint, DiscoveryResponse } from "./types/discovery-response.mjs";
import { SmartHomeDirective } from "./types/SmartHomeDirective.mjs";

export const DeviceDiscoveryHandler = async (event: SmartHomeDirective) => {
  const token = event.directive.payload!.scope!.token;

  await shared.warmUpSmartHome(token);

  let endpoints: Array<Endpoint> = [];

  const homeInfo = await shared.getHomeInfoWithRetry();

  const alexaCapability = {
    type: "AlexaInterface",
    interface: "Alexa",
    version: "3",
  };

  const endpointHealthCapability = {
    type: "AlexaInterface",
    interface: "Alexa.EndpointHealth",
    version: "3",
    properties: {
      supported: [
        {
          name: "connectivity",
        },
      ],
      proactivelyReported: false,
      retrievable: true,
    },
  };

  const capabilityResources = {
    friendlyNames: [
      {
        "@type": "asset",
        value: {
          assetId: "Alexa.Setting.Opening",
        },
      },
      {
        "@type": "text",
        value: {
          text: "Rolladen",
          locale: "de-DE",
        },
      },
      {
        "@type": "asset",
        value: {
          assetId: "Alexa.DeviceName.Shade",
        },
      },
    ],
  };

  const rangeControllerCapability = {
    type: "AlexaInterface",
    interface: "Alexa.RangeController",
    instance: "Blind.Lift",
    version: "3",
    properties: {
      supported: [
        {
          name: "rangeValue",
        },
      ],
      proactivelyReported: false,
      retrievable: true,
    },
    capabilityResources: capabilityResources,
    configuration: {
      supportedRange: {
        minimumValue: 0,
        maximumValue: 100,
        precision: 10,
      },
      unitOfMeasure: "Alexa.Unit.Percent",
    },
    semantics: {
      actionMappings: [
        {
          "@type": "ActionsToDirective",
          actions: ["Alexa.Actions.Close"],
          directive: {
            name: "SetRangeValue",
            payload: {
              rangeValue: 0,
            },
          },
        },
        {
          "@type": "ActionsToDirective",
          actions: ["Alexa.Actions.Open"],
          directive: {
            name: "SetRangeValue",
            payload: {
              rangeValue: 100,
            },
          },
        },
        {
          "@type": "ActionsToDirective",
          actions: ["Alexa.Actions.Lower"],
          directive: {
            name: "AdjustRangeValue",
            payload: {
              rangeValueDelta: -10,
              rangeValueDeltaDefault: false,
            },
          },
        },
        {
          "@type": "ActionsToDirective",
          actions: ["Alexa.Actions.Raise"],
          directive: {
            name: "AdjustRangeValue",
            payload: {
              rangeValueDelta: 10,
              rangeValueDeltaDefault: false,
            },
          },
        },
      ],
      stateMappings: [
        {
          "@type": "StatesToValue",
          states: ["Alexa.States.Closed"],
          value: 0,
        },
        {
          "@type": "StatesToRange",
          states: ["Alexa.States.Open"],
          range: {
            minimumValue: 10,
            maximumValue: 100,
          },
        },
      ],
    },
  };

  const sceneControllerCapability = {
    type: "AlexaInterface",
    interface: "Alexa.SceneController",
    version: "3",
    supportsDeactivation: false,
  };

  homeInfo.data.body.homes[0].modules.forEach((module) => {
    if (!module.velux_type || module.velux_type !== "shutter") return;

    const endpoint: Endpoint = {
      endpointId: module.id,
      manufacturerName: "Velux",
      friendlyName: "Rolladen " + module.name,
      description: "Ein Velux Rolladen",
      displayCategories: ["EXTERIOR_BLIND"],
      additionalAttributes: {
        manufacturer: "Velux",
        model: module.type,
        customIdentifier: module.id,
      },
      cookie: {},
      capabilities: [
        rangeControllerCapability,
        endpointHealthCapability,
        alexaCapability,
      ],
    };

    endpoints.push(endpoint);
  });

  const baseScene = {
    manufacturerName: "Velux",
    displayCategories: ["SCENE_TRIGGER"],
    cookie: {},
    capabilities: [sceneControllerCapability, alexaCapability],
  };

  const openScene: Endpoint = {
    ...baseScene,
    endpointId: "open-all-shutters",
    description: "öffnet alle Velux Rolläden",
    friendlyName: "Velux Morgen",
  };

  const closeScene: Endpoint = {
    ...baseScene,
    endpointId: "close-all-shutters",
    description: "schließt alle Velux Rolläden",
    friendlyName: "Velux Nacht",
  };

  endpoints.push(openScene, closeScene);

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
