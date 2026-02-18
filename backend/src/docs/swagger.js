/**
 * OpenAPI 3.0 spec for Wallet Tracker API. Served as JSON at /api-docs.json and rendered by Swagger UI at /api-docs.
 */
import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Wallet Tracker API",
      version: "1.0.0",
      description:
        "API for deriving wallet addresses from a mnemonic or extended public key (xpub), and optionally enriching results (e.g., ETH balances).",
    },
    servers: [
      {
        url: "http://localhost:55001",
        description: "Local development server",
      },
    ],
    tags: [
      {
        name: "Wallet",
        description: "Wallet derivation and enrichment",
      },
    ],
    components: {
      schemas: {
        FetchWalletRequest: {
          type: "object",
          required: ["inputType", "currency", "value", "count", "startIdx"],
          properties: {
            inputType: {
              type: "string",
              description: "Input type to derive from.",
              enum: ["MNEMONIC", "XPUB"],
              example: "MNEMONIC",
            },
            currency: {
              type: "string",
              description: "Currency code to derive addresses for.",
              enum: ["ETH", "BTC", "LTC", "BCH", "SOL"],
              example: "ETH",
            },
            value: {
              type: "string",
              description: "Mnemonic phrase or xpub depending on inputType.",
              example:
                "test test test test test test test test test test test junk",
            },
            count: {
              type: "integer",
              description: "Number of addresses to derive.",
              example: 20,
              minimum: 1,
              maximum: 1000,
            },
            startIdx: {
              type: "integer",
              description: "Starting derivation index (used for pagination).",
              example: 0,
              minimum: 0,
            },
          },
        },
        WalletChildBase: {
          type: "object",
          required: ["srNo", "path", "address"],
          properties: {
            srNo: { type: "integer", example: 1 },
            path: { type: "string", example: "m/44'/60'/0'/0/0" },
            address: {
              type: "string",
              example: "0x0000000000000000000000000000000000000000",
            },
          },
        },
        WalletChildEth: {
          allOf: [
            { $ref: "#/components/schemas/WalletChildBase" },
            {
              type: "object",
              properties: {
                ethBalance: { type: "string", example: "0.0" },
                codexBalance: { type: "string", example: "0.0" },
              },
            },
          ],
        },
        FetchWalletResponse: {
          type: "object",
          required: ["currency", "count", "data"],
          properties: {
            currency: { type: "string", example: "ETH" },
            count: { type: "integer", example: 20 },
            data: {
              type: "array",
              items: {
                oneOf: [
                  { $ref: "#/components/schemas/WalletChildBase" },
                  { $ref: "#/components/schemas/WalletChildEth" },
                ],
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string", example: "Unsupported currency: DOGE" },
          },
        },
      },
    },
    paths: {
      "/api/wallet/fetch": {
        post: {
          tags: ["Wallet"],
          summary: "Derive wallet addresses (and enrich if supported)",
          description:
            "Derives addresses for the requested currency from a mnemonic or xpub. For ETH it also enriches each address with balances.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FetchWalletRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Derived addresses returned successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/FetchWalletResponse" },
                },
              },
            },
            400: {
              description: "Validation or derivation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
    },
  },
  // We keep this empty for now because this project defines routes in code,
  // and we provide a manual OpenAPI definition above.
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);
