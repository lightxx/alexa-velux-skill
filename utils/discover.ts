import { v4 as uuidv4 } from "uuid";
import * as shared from "velux-alexa-integration-shared";
import AWS from "aws-sdk";

const userId =
  "amzn1.ask.account.AMATPR2XCCYAAUCZ23A6YZRTYCACGRRMNRS7SQ6KNONYVYM26NWRQRLF3OCO2TFNGMYOMP2D7FUPKSNJS3Q7C2ALYQZYZTQBKFU4X7E6NLVDP4LLWANKEN23D6BWWYLTEUZ6KRPAPJ46VAQJ6YIMD6IQHLURKNG7L6JUJVUL4FNBW4DB66BM43PVW6LY7TKGC2JIRH2M2R3TVOQQOZ7A7Z7S4GRCOPEL3KFLBRBTB7ZA";

AWS.config.update({ region: "eu-west-1" });

async function getHomeInfo(): Promise<void> {
  shared.state.storedUserId = userId;
  await shared.warmUp();

  let endpoints: any = [];

  try {
    const homeInfo = await shared.getHomeInfoWithRetry();
    
    homeInfo.data.body.homes[0].modules.forEach((module) => {
      if (!module.velux_type || module.velux_type !== "shutter") return;
      
      let bla = {
        endpointId: module.id,
        manufacturerName: "Velux",
        friendlyName: "Roller Shutter " + module.name,
        description: "A Velux roller shutter",
        displayCategories: ["EXTERIOR_BLIND"],
        additionalAttributes: {
          manufacturer: "Velux",
          model: module.type,
          customIdentifier: module.id,
        },
        cookie: {},
        capabilities: [
          {
            type: "AlexaInterface",
            interface: "Alexa",
            version: "3",
          },
          {
            type: "AlexaInterface",
            interface: "Alexa.ModeController",
            version: "3",
            instance: "Shutter.Position",
            capabilityResources: {
              friendlyNames: [
                {
                  "@type": "text",
                  value: {
                    text: "Shutter",
                    locale: "en-US",
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
            },
            configuration: {
              ordered: false,
              supportedModes: [
                {
                  value: "open",
                  modeResources: {
                    friendlyNames: [
                      {
                        "@type": "text",
                        value: {
                          text: "open",
                          locale: "en-US",
                        },
                      },
                      {
                        "@type": "text",
                        value: {
                          text: "öffnen",
                          locale: "de-DE",
                        },
                      },
                    ],
                  },
                },
                {
                  value: "close",
                  modeResources: {
                    friendlyNames: [
                      {
                        "@type": "text",
                        value: {
                          text: "close",
                          locale: "en-US",
                        },
                      },
                      {
                        "@type": "text",
                        value: {
                          text: "schließen",
                          locale: "de-DE",
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
                  name: "mode",
                },
              ],
              proactivelyReported: false,
              retrievable: true,
            },
          },
          {
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
          },
        ],
      };

      endpoints.push(bla);
    });

    const discoveryResponse = {
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

    console.log("Discovery Reply: " + JSON.stringify(discoveryResponse, null, 2));
  } catch (error) {
    console.error("error: " + error);
  }


}

getHomeInfo();
//console.log(JSON.stringify(discoveryResponse, null, 2));
