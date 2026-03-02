/**
 * SF City Agent - Orchestration Engine
 * 
 * Uses Claude with tool_use to dispatch specialized agents
 * that query real SF open data and reason about results.
 */

const Anthropic = require("@anthropic-ai/sdk");
const { SFDataClient } = require("./sf-data-client");

const client = new Anthropic();
const sfData = new SFDataClient();

// ========================================
// TOOL DEFINITIONS - Each tool = one agent capability
// ========================================

const TOOLS = [
  {
    name: "search_building_permits",
    description:
      "Search SF building permits by address or street name. Returns permit types, status, descriptions, dates. Use to check what construction/renovation has happened at an address, or what permits are required for a specific type of work.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Street address or street name to search (e.g., '123 Main St' or 'Valencia')",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "search_dbi_complaints",
    description:
      "Search Department of Building Inspection complaints by address. Returns complaint types (housing, building, electrical, plumbing, code enforcement), status, dates. Use to check a building's complaint history or find patterns of violations.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Address to search for complaints",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "search_dbi_violations",
    description:
      "Search DBI code violations (Notices of Violation) by address. Returns violation type, status, dates. More serious than complaints — these are formal notices from the city.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Address to search for violations",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "search_311_cases",
    description:
      "Search SF 311 service requests by address or category. Categories include: Tree Maintenance, Street Defects, Graffiti, Noise, Homeless Concerns, Sewer Issues, Streetlight, etc. Use for neighborhood-level issues.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Address to search near",
        },
        category: {
          type: "string",
          description: "Optional category filter (e.g., 'Tree Maintenance', 'Street Defects')",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "search_businesses",
    description:
      "Search registered businesses by address or by type in a neighborhood. Use to check competition, see what businesses operate at an address, or analyze a commercial corridor.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Address or street to search",
        },
        business_type: {
          type: "string",
          description: "Optional NAICS description to filter (e.g., 'restaurant', 'coffee', 'retail')",
        },
        neighborhood: {
          type: "string",
          description: "Optional neighborhood name (e.g., 'Mission', 'Sunset', 'Hayes Valley')",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "search_fire_violations",
    description:
      "Search fire code violations by address. Returns violation type, date, status. Critical for safety assessments.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Address to search",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "search_eviction_notices",
    description:
      "Search eviction notices filed at an address or in a neighborhood. Returns eviction type (Owner Move-In, Ellis Act, etc.), dates. Use to assess landlord behavior and tenant risk.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Address to search",
        },
        neighborhood: {
          type: "string",
          description: "Optional neighborhood for broader search",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "search_street_trees",
    description:
      "Search the SF street tree inventory by address. Returns tree species, size, condition, maintenance responsibility. Use for tree-related inquiries or hazard assessments.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Address or street to search",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "search_adu_permits",
    description:
      "Search for ADU (Accessory Dwelling Unit) permits in a neighborhood. Returns recent ADU applications, their status, and construction details. Use for ADU planning research.",
    input_schema: {
      type: "object",
      properties: {
        neighborhood: {
          type: "string",
          description: "Neighborhood name (e.g., 'Sunset', 'Richmond', 'Mission')",
        },
      },
      required: ["neighborhood"],
    },
  },
  {
    name: "investigate_address",
    description:
      "Comprehensive investigation of a specific address — pulls permits, complaints, violations, fire violations, businesses, evictions, and 311 cases all at once. Use when you need a complete picture of a property.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Full address to investigate",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "sf_municipal_code_lookup",
    description:
      "Look up SF municipal code, housing code, planning code, or tenant rights information. Use this for legal questions about regulations, zoning rules, tenant protections, permit requirements, and city procedures. This tool uses Claude's knowledge of SF regulations — not a live database.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "The legal/regulatory topic to look up (e.g., 'tenant heating requirements', 'ADU zoning rules', 'food service permit process', 'rent control rules')",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "lookup_parcel_zoning",
    description:
      "Look up the EXACT zoning district for a specific parcel/address from the official SF Parcel database. Returns the zoning_code (e.g., NCT-24, RH-1, C-3-O), zoning_district name, block/lot number, supervisor district, and neighborhood. This is the authoritative source — use this instead of guessing zoning. You can search by street name and number, or by street name alone to see all zoning along a corridor.",
    input_schema: {
      type: "object",
      properties: {
        street_number: {
          type: "string",
          description: "Street number (e.g., '3256'). Optional — omit to see all parcels on street.",
        },
        street_name: {
          type: "string",
          description: "Street name without type (e.g., 'VALENCIA', 'IRVING', '24TH')",
        },
      },
      required: ["street_name"],
    },
  },
  {
    name: "lookup_property_details",
    description:
      "Look up detailed property information from the SF Assessor's records. Returns: lot_area (sq ft), lot_depth, lot_frontage, property_area, year_built, bedrooms, bathrooms, stories, units, construction_type, zoning_code, assessed_land_value, assessed_improvement_value, last_sale_date, neighborhood. CRITICAL for ADU calculations (need lot size), property valuations, and building investigations.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Property address to look up",
        },
        block: {
          type: "string",
          description: "Optional — block number for more precise lookup",
        },
        lot: {
          type: "string",
          description: "Optional — lot number for more precise lookup",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "get_street_zoning_summary",
    description:
      "Get a summary of all zoning districts along a street. Shows how many parcels fall in each zoning category. Use this to understand the zoning landscape of a street/corridor (e.g., 'What's the zoning on Valencia Street?' or 'Is 24th Street zoned for commercial use?').",
    input_schema: {
      type: "object",
      properties: {
        street_name: {
          type: "string",
          description: "Street name (e.g., 'VALENCIA', '24TH', 'IRVING')",
        },
      },
      required: ["street_name"],
    },
  },
  {
    name: "get_comparable_properties",
    description:
      "Find comparable properties in the same neighborhood with similar zoning and use type. Returns lot sizes, property sizes, assessed values, and sale dates. Use for market analysis, price validation, and ADU feasibility research.",
    input_schema: {
      type: "object",
      properties: {
        neighborhood: {
          type: "string",
          description: "Neighborhood name (e.g., 'Sunset/Parkside', 'Mission', 'Inner Richmond')",
        },
        zoning_code: {
          type: "string",
          description: "Zoning code (e.g., 'RH-1', 'NCT-24', 'RH-2')",
        },
        use_code: {
          type: "string",
          description: "Optional use code for filtering (e.g., 'SFR' for single family residential)",
        },
      },
      required: ["neighborhood", "zoning_code"],
    },
  },
];

// ========================================
// TOOL EXECUTION
// ========================================

async function executeTool(toolName, toolInput) {
  switch (toolName) {
    case "search_building_permits":
      return await sfData.getPermitsByAddress(toolInput.address);

    case "search_dbi_complaints":
      return await sfData.getComplaintsByAddress(toolInput.address);

    case "search_dbi_violations":
      return await sfData.getViolationsByAddress(toolInput.address);

    case "search_311_cases":
      if (toolInput.category) {
        return await sfData.get311CasesByCategory(toolInput.category, toolInput.address);
      }
      return await sfData.get311CasesByAddress(toolInput.address);

    case "search_businesses":
      if (toolInput.business_type && toolInput.neighborhood) {
        return await sfData.getBusinessesByType(toolInput.business_type, toolInput.neighborhood);
      }
      return await sfData.getBusinessesByAddress(toolInput.address);

    case "search_fire_violations":
      return await sfData.getFireViolationsByAddress(toolInput.address);

    case "search_eviction_notices":
      if (toolInput.neighborhood) {
        return await sfData.getEvictionsByNeighborhood(toolInput.neighborhood);
      }
      return await sfData.getEvictionsByAddress(toolInput.address);

    case "search_street_trees":
      return await sfData.getStreetTreesByAddress(toolInput.address);

    case "search_adu_permits":
      return await sfData.getADUPermits(toolInput.neighborhood);

    case "investigate_address":
      return await sfData.investigateAddress(toolInput.address);

    case "sf_municipal_code_lookup":
      // This tool returns a prompt for Claude to answer from its knowledge
      return {
        note: "Use your knowledge of SF Municipal Code, Housing Code, Planning Code, CA Civil Code, and tenant rights to answer this query.",
        topic: toolInput.topic,
      };

    case "lookup_parcel_zoning":
      return await sfData.getParcelByAddress(toolInput.street_number || null, toolInput.street_name);

    case "lookup_property_details":
      if (toolInput.block && toolInput.lot) {
        return await sfData.getPropertyByBlockLot(toolInput.block, toolInput.lot);
      }
      return await sfData.getPropertyDetails(toolInput.address);

    case "get_street_zoning_summary":
      return await sfData.getStreetZoning(toolInput.street_name);

    case "get_comparable_properties":
      return await sfData.getComparableProperties(
        toolInput.neighborhood,
        toolInput.zoning_code,
        toolInput.use_code || null
      );

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ========================================
// SYSTEM PROMPT
// ========================================

const SYSTEM_PROMPT = `You are the SF City Agent — an AI expert that helps people navigate San Francisco's complex bureaucracy, regulations, and city services.

You have access to REAL, LIVE data from San Francisco's Open Data Portal (DataSF). When a user asks a question, you should:

1. INVESTIGATE: Use your tools to pull real data from SF city databases. Be thorough — check multiple data sources. Follow leads autonomously (e.g., if you find a complaint at an address, also check for violations and permits).

2. REASON: Analyze the data you find. Connect dots across sources. Identify patterns, risks, shortcuts, and opportunities that a human wouldn't easily see.

3. ADVISE: Provide a clear, actionable response with:
   - What you found in the real data
   - What it means for the user
   - Step-by-step action plan with specific departments, forms, phone numbers, and deadlines
   - Shortcuts or insider knowledge that most people don't know
   - Warnings about potential pitfalls

KEY BEHAVIORS:
- Always search real data FIRST before giving advice. Don't guess when you can look it up.
- For ZONING questions: ALWAYS use the lookup_parcel_zoning tool to get the EXACT zoning district from the official parcel database. Never guess zoning — always look it up.
- For PROPERTY questions: ALWAYS use lookup_property_details to get exact lot size, year built, units, assessed value, etc. This is critical for ADU calculations and property analysis.
- For BUSINESS PLANNING: Use get_street_zoning_summary to understand the full zoning landscape of a street/corridor, and search_businesses for competition analysis.
- When you find something concerning (violations, complaints, patterns), proactively investigate further without being asked.
- Cite specific code sections (SF Housing Code, CA Civil Code, SF Planning Code) when relevant.
- Provide specific phone numbers, websites, and office locations for SF city departments.
- Be direct and honest about what you find, even if it's bad news.
- If you can't find data for a specific address, say so and explain why (the data may not cover that area, the address format may be different, etc.)

ACCURACY POLICY — THIS IS CRITICAL:
- Data from city databases (permits, complaints, violations, zoning, property details, etc.) = state it as FACT. This is real government data.
- Cost estimates, fee schedules, and processing times that are NOT from a live database = mark as "(estimate — verify with the department)". Example: "Permit fees: ~$2,800-$4,200 (estimate — verify current fees with DBI at 628-652-3200)"
- Legal/regulatory advice from your knowledge = cite the specific code section and add "verify current regulations" for anything that could have changed.
- NEVER present an estimate as a definitive fact. If you're not 100% certain from live data, say so clearly.

FORMAT YOUR RESPONSES:
- Start with a brief summary of what you found
- Present each agent's findings clearly
- End with a prioritized action plan
- Include relevant warnings
- Clearly distinguish between VERIFIED DATA (from city databases) and ESTIMATES/KNOWLEDGE (from AI)

IMPORTANT: You are querying REAL city databases. The data you return is real and current. Always note this to the user — they're seeing actual government records, not simulated data.

You are based in San Francisco and deeply knowledgeable about:
- SF Planning Code & Zoning (use districts, height limits, conditional use)
- SF Housing Code & tenant protections (strongest in the US)
- SF Rent Ordinance & Rent Board procedures
- DBI permit process & complaint procedures
- 311 system & city services
- CA Civil Code (landlord-tenant, habitability, repair-and-deduct)
- ADU regulations (state AB 2221 & local implementation)
- SF business licensing & permit requirements
- Emergency services & Public Works procedures`;

// ========================================
// MAIN AGENT EXECUTION
// ========================================

/**
 * Run the SF City Agent with streaming
 * Returns an async generator of events for real-time UI updates
 */
async function* runAgent(userMessage, conversationHistory = []) {
  const messages = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  let continueLoop = true;

  while (continueLoop) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: messages,
    });

    // Process each content block
    for (const block of response.content) {
      if (block.type === "text") {
        yield { type: "text", content: block.text };
      } else if (block.type === "tool_use") {
        // Yield the tool call event (for UI to show agent spinning up)
        yield {
          type: "tool_call",
          agent: block.name,
          input: block.input,
          id: block.id,
        };

        // Execute the tool
        const result = await executeTool(block.name, block.input);

        // Truncate large results to stay within context limits
        const truncatedResult = JSON.stringify(result).length > 20000
          ? JSON.stringify(result).slice(0, 20000) + "... [truncated]"
          : JSON.stringify(result);

        // Yield the result (for UI to show agent completing)
        yield {
          type: "tool_result",
          agent: block.name,
          result: truncatedResult,
          id: block.id,
          resultCount: Array.isArray(result) ? result.length : (result.count || "N/A"),
        };

        // Add assistant message and tool result to conversation
        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: block.id,
              content: truncatedResult,
            },
          ],
        });
      }
    }

    // Check if we need to continue (more tool calls) or stop
    if (response.stop_reason === "end_turn") {
      continueLoop = false;
    } else if (response.stop_reason === "tool_use") {
      // Continue the loop to process tool results
      continueLoop = true;
    } else {
      continueLoop = false;
    }
  }

  yield { type: "done" };
}

/**
 * Non-streaming version for simpler use cases
 */
async function runAgentSync(userMessage, conversationHistory = []) {
  const events = [];
  for await (const event of runAgent(userMessage, conversationHistory)) {
    events.push(event);
  }
  return events;
}

module.exports = { runAgent, runAgentSync, TOOLS };
