export function getOpenApiSpec(baseUrl?: string) {
  const host = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://jacxishipping.com';
  return {
    openapi: '3.1.0',
    info: {
      title: 'Jacxi Shipping Logistics AI API',
      description:
        'AI Agent and Chatbot tool API for searching vehicles by VIN and ocean containers in Jacxi Shipping.',
      version: '1.0.0',
    },
    servers: [
      {
        url: host.replace(/\/$/, ''),
        description: 'Jacxi Shipping Production Server',
      },
    ],
    paths: {
      '/api/ai/search-vin': {
        get: {
          operationId: 'searchVin',
          summary: 'Search vehicle by VIN or lot number',
          description:
            'Search for a vehicle shipment by full or partial VIN, lot number, or shipment ID. Returns vehicle specs, shipment status, inland dispatch, and ocean container assignment.',
          parameters: [
            {
              name: 'vin',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'Vehicle Identification Number (17-char or partial), lot number, or shipment ID',
            },
            {
              name: 'includeTracking',
              in: 'query',
              required: false,
              schema: { type: 'boolean', default: true },
              description: 'Whether to include tracking milestone history',
            },
          ],
          responses: {
            '200': {
              description: 'Matching vehicle shipment details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      found: { type: 'boolean' },
                      count: { type: 'integer' },
                      results: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/ai/search-container': {
        get: {
          operationId: 'searchContainer',
          summary: 'Search ocean container by number or booking',
          description:
            'Search for an ocean freight container by container number, booking number, or tracking number. Returns shipping line, vessel name, voyage, loading and destination ports, ETAs, and all vehicles loaded inside.',
          parameters: [
            {
              name: 'number',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'Container number (e.g. CAAU5189072), booking number, or tracking ID',
            },
            {
              name: 'includeShipments',
              in: 'query',
              required: false,
              schema: { type: 'boolean', default: true },
              description: 'Whether to list all vehicles loaded inside this container',
            },
          ],
          responses: {
            '200': {
              description: 'Container details and loaded vehicles list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      found: { type: 'boolean' },
                      count: { type: 'integer' },
                      results: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/ai/track': {
        get: {
          operationId: 'universalTrack',
          summary: 'Universal live tracking for VIN or container',
          description:
            'Real-time universal tracking for any VIN, container number, booking number, or lot number with full journey milestones.',
          parameters: [
            {
              name: 'query',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'VIN, Container number, Booking number, or Lot number',
            },
          ],
          responses: {
            '200': {
              description: 'Tracking status, milestones, and timeline events',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      found: { type: 'boolean' },
                      tracking: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/ai/overview': {
        get: {
          operationId: 'getShippingOverview',
          summary: 'Get logistics operational overview stats',
          description:
            'Returns count of active containers, yard on-hand inventory, and total shipments breakdown by status.',
          responses: {
            '200': {
              description: 'Shipping statistics summary',
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT or API Key',
          description: 'Enter your Jacxi MCP API key or login code',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Custom API Key header',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
      {
        ApiKeyAuth: [],
      },
    ],
  };
}

/**
 * Official ChatGPT Plugin Manifest (.well-known/ai-plugin.json)
 */
export function getChatGPTPluginManifest(baseUrl?: string) {
  const host = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://jacxishipping.com').replace(/\/$/, '');
  const hasKey = Boolean(process.env.MCP_API_KEY || process.env.JACXI_API_KEY);

  return {
    schema_version: 'v1',
    name_for_human: 'Jacxi Shipping',
    name_for_model: 'jacxishipping',
    description_for_human:
      'Search vehicle shipments by VIN or lot number and track ocean freight containers with Jacxi Shipping.',
    description_for_model:
      'Plugin for Jacxi Shipping web app. Allows searching vehicle shipments by VIN, lot number, or shipment ID; searching ocean containers by container number, booking number, or tracking number; and obtaining real-time tracking milestones.',
    auth: hasKey
      ? {
          type: 'service_http',
          authorization_type: 'bearer',
          verification_tokens: {},
        }
      : {
          type: 'none',
        },
    api: {
      type: 'openapi',
      url: `${host}/openapi.json`,
      is_user_authenticated: false,
    },
    logo_url: `${host}/favicon.png`,
    contact_email: 'support@jacxishipping.com',
    legal_info_url: `${host}`,
  };
}

/**
 * OpenAI / ChatGPT / xAI Grok Tool Calling Definition
 */
export function getOpenAITools() {
  return [
    {
      type: 'function',
      function: {
        name: 'search_vin',
        description:
          'Search for a vehicle shipment in Jacxi Shipping by full or partial VIN, lot number, or shipment ID. Returns vehicle specs, current shipment status, inland dispatch, and ocean container assignment.',
        parameters: {
          type: 'object',
          properties: {
            vin: {
              type: 'string',
              description:
                'Vehicle Identification Number (17 digits or partial), auction lot number, or shipment ID',
            },
            includeTracking: {
              type: 'boolean',
              description: 'Whether to include tracking milestone events (default: true)',
              default: true,
            },
          },
          required: ['vin'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_container',
        description:
          'Search for an ocean freight shipping container by container number (e.g. CAAU5189072), booking number, or tracking ID. Returns shipping line, vessel name, voyage, loading and destination ports, ETAs, and all vehicles loaded inside.',
        parameters: {
          type: 'object',
          properties: {
            containerNumber: {
              type: 'string',
              description:
                'Container number (e.g. CAAU5189072, MSKU...), booking number, or tracking ID',
            },
            includeShipments: {
              type: 'boolean',
              description: 'Whether to list all vehicles loaded inside (default: true)',
              default: true,
            },
          },
          required: ['containerNumber'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'track',
        description:
          'Universal live tracking for any VIN, container number, booking number, or lot number. Returns milestone progress and journey timeline.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'VIN, Container number, booking number, or lot number',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_shipping_overview',
        description:
          'Get operational shipping statistics from the Jacxi Shipping web app, including total shipments, containers, in-transit units, and yard inventory.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    },
  ];
}

/**
 * Google Gemini Tool Calling Definition (Function Declarations)
 */
export function getGeminiTools() {
  return [
    {
      functionDeclarations: [
        {
          name: 'search_vin',
          description:
            'Search for a vehicle shipment in Jacxi Shipping by full or partial VIN, lot number, or shipment ID. Returns vehicle specs, current shipment status, inland dispatch, and ocean container assignment.',
          parameters: {
            type: 'OBJECT',
            properties: {
              vin: {
                type: 'STRING',
                description:
                  'Vehicle Identification Number (17 digits or partial), auction lot number, or shipment ID',
              },
              includeTracking: {
                type: 'BOOLEAN',
                description: 'Whether to include tracking milestone events (default: true)',
              },
            },
            required: ['vin'],
          },
        },
        {
          name: 'search_container',
          description:
            'Search for an ocean freight shipping container by container number, booking number, or tracking ID. Returns shipping line, vessel, ports, ETAs, and loaded vehicles.',
          parameters: {
            type: 'OBJECT',
            properties: {
              containerNumber: {
                type: 'STRING',
                description:
                  'Container number (e.g. CAAU5189072), booking number, or tracking ID',
              },
              includeShipments: {
                type: 'BOOLEAN',
                description: 'Whether to list all vehicles loaded inside (default: true)',
              },
            },
            required: ['containerNumber'],
          },
        },
        {
          name: 'track',
          description:
            'Universal live tracking for any VIN, container number, booking number, or lot number.',
          parameters: {
            type: 'OBJECT',
            properties: {
              query: {
                type: 'STRING',
                description: 'VIN, Container number, booking number, or lot number',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_shipping_overview',
          description:
            'Get operational shipping statistics including total shipments, containers, in-transit units, and yard inventory.',
          parameters: {
            type: 'OBJECT',
            properties: {},
          },
        },
      ],
    },
  ];
}

/**
 * Anthropic Claude Tool Calling Definition
 */
export function getClaudeTools() {
  return [
    {
      name: 'search_vin',
      description:
        'Search for a vehicle shipment in Jacxi Shipping by full or partial VIN, lot number, or shipment ID.',
      input_schema: {
        type: 'object',
        properties: {
          vin: {
            type: 'string',
            description: 'Vehicle Identification Number or lot number',
          },
          includeTracking: {
            type: 'boolean',
            description: 'Whether to include tracking milestone history',
            default: true,
          },
        },
        required: ['vin'],
      },
    },
    {
      name: 'search_container',
      description:
        'Search for an ocean freight container by container number, booking number, or tracking ID.',
      input_schema: {
        type: 'object',
        properties: {
          containerNumber: {
            type: 'string',
            description: 'Container number (e.g. CAAU5189072), booking number, or tracking ID',
          },
          includeShipments: {
            type: 'boolean',
            description: 'Whether to list loaded vehicles inside container',
            default: true,
          },
        },
        required: ['containerNumber'],
      },
    },
    {
      name: 'track',
      description: 'Universal tracking for any VIN, container number, or lot number.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'VIN, Container number, or lot number',
          },
        },
        required: ['query'],
      },
    },
  ];
}

