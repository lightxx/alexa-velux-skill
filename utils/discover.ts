import { v4 as uuidv4 } from "uuid";
import * as shared from "velux-alexa-integration-shared";
import AWS from "aws-sdk";
import {
  Description,
  DiscoveryResponse,
  DisplayCategory,
  Endpoint,
  Instance,
  Interface,
  Manufacturer,
  Type,
  TypeEnum,
  Text,
  Locale,
  AssetID,
  ValueEnum,
  Name,
} from "../src/types/discovery-response.mts";
import { SkillType } from "velux-alexa-integration-shared/dist/interfaces/interfaces.mjs";

AWS.config.update({ region: "eu-west-1" });

async function createDiscoveryResponse(): Promise<DiscoveryResponse> {
  await shared.warmUpSmartHome("e6c6b2b5-108f-47c0-b337-eee873b2842d");

  console.log("State: " + JSON.stringify(shared.state, null, 2));

  let endpoints: Array<Endpoint> = [];

  try {
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
  } catch (error) {
    console.error("error: " + error);
    throw error; 
  }
}

const homeInfo = await createDiscoveryResponse();

console.log("homeInfo: " + JSON.stringify(homeInfo, null, 2));