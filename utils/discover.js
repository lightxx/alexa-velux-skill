var discoveryResponse = {
    event: {
        header: {
            namespace: "Alexa.Discovery",
            name: "Discover.Response",
            payloadVersion: "3",
            messageId: "message-1234",
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
                                        name: "mode",
                                    },
                                ],
                                retrievable: false,
                            },
                            capabilityResources: {
                                friendlyNames: [
                                    {
                                        "@type": "text",
                                        value: {
                                            text: "mode",
                                            locale: "de-DE",
                                        },
                                    },
                                ],
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
                                                        locale: "de-DE",
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
                                        value: {
                                            instance: "close",
                                            labels: [
                                                {
                                                    "@type": "text",
                                                    value: {
                                                        text: "close",
                                                        locale: "de-DE",
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
                        },
                    ],
                },
            ],
        },
    },
};
console.log(JSON.stringify(discoveryResponse));
