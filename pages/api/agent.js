/**
 * API Route: /api/agent
 * Streams agent investigation events to the frontend via SSE
 */

import Anthropic from "@anthropic-ai/sdk";

export const config = {
  maxDuration: 60,
};

// SF Data Client - inline to avoid module issues on Vercel
const SF_BASE = "https://data.sfgov.org/resource";
const DATASETS = {
  building_permits: "i98e-djp9",
  dbi_complaints: "gm2e-bten",
  dbi_violations: "nbtm-fbw5",
  cases_311: "vw6y-z8j6",
  registered_businesses: "g8m3-pdis",
  fire_violations: "wb4c-6hwj",
  street_trees: "tkzw-k3nq",
  eviction_notices: "5cei-gny5",
  parcels: "acdm-wktn",
  assessor_property: "wv5m-vpq2",
};

async function sfQuery(datasetId, params = {}) {
  const url = new URL(`${SF_BASE}/${datasetId}.json`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v.toString());
  });
  const headers = { Accept: "application/json" };
  if (process.env.SF_DATA_APP_TOKEN) headers["X-App-Token"] = process.env.SF_DATA_APP_TOKEN;

  try {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error(`SODA error for ${datasetId}:`, e.message);
    return [];
  }
}

// Tool definitions
const TOOLS = [
  {
    name: "search_building_permits",
    description: "Search SF building permits by address. Returns permit types, status, descriptions, dates.",
    input_schema: { type: "object", properties: { address: { type: "string", description: "Street address or name" } }, required: ["address"] },
  },
  {
    name: "search_dbi_complaints",
    description: "Search DBI complaints by address. Returns complaint types, status, dates.",
    input_schema: { type: "object", properties: { address: { type: "string", description: "Address to search" } }, required: ["address"] },
  },
  {
    name: "search_dbi_violations",
    description: "Search DBI code violations by address. Formal notices from the city.",
    input_schema: { type: "object", properties: { address: { type: "string", description: "Address to search" } }, required: ["address"] },
  },
  {
    name: "search_311_cases",
    description: "Search 311 service requests by address. Categories: Tree Maintenance, Street Defects, Graffiti, Noise, etc.",
    input_schema: { type: "object", properties: { address: { type: "string", description: "Address to search" }, category: { type: "string", description: "Optional category" } }, required: ["address"] },
  },
  {
    name: "search_businesses",
    description: "Search registered businesses by address, type, or neighborhood.",
    input_schema: { type: "object", properties: { address: { type: "string", description: "Address or street" }, business_type: { type: "string", description: "NAICS description" }, neighborhood: { type: "string", description: "Neighborhood name" } }, required: ["address"] },
  },
  {
    name: "search_fire_violations",
    description: "Search fire code violations by address.",
    input_schema: { type: "object", properties: { address: { type: "string", description: "Address to search" } }, required: ["address"] },
  },
  {
    name: "search_eviction_notices",
    description: "Search eviction notices by address or neighborhood.",
    input_schema: { type: "object", properties: { address: { type: "string", description: "Address" }, neighborhood: { type: "string", description: "Neighborhood" } }, required: ["address"] },
  },
  {
    name: "search_street_trees",
    description: "Search SF street tree inventory by address.",
    input_schema: { type: "object", properties: { address: { type: "string", description: "Address or street" } }, required: ["address"] },
  },
  {
    name: "search_adu_permits",
    description: "Search ADU permits in a neighborhood.",
    input_schema: { type: "object", properties: { neighborhood: { type: "string", description: "Neighborhood name" } }, required: ["neighborhood"] },
  },
  {
    name: "investigate_address",
    description: "Full investigation — pulls permits, complaints, violations, fire, businesses, evictions, 311, and property details for one address.",
    input_schema: { type: "object", properties: { address: { type: "string", description: "Full address" } }, required: ["address"] },
  },
  {
    name: "sf_municipal_code_lookup",
    description: "Look up SF municipal code, housing code, planning code, tenant rights. Uses Claude's knowledge.",
    input_schema: { type: "object", properties: { topic: { type: "string", description: "Legal/regulatory topic" } }, required: ["topic"] },
  },
  {
    name: "lookup_parcel_zoning",
    description: "Look up EXACT zoning district for an address from official SF Parcel database. Returns zoning_code, zoning_district, block/lot, neighborhood.",
    input_schema: { type: "object", properties: { street_number: { type: "string", description: "Street number (optional)" }, street_name: { type: "string", description: "Street name" } }, required: ["street_name"] },
  },
  {
    name: "lookup_property_details",
    description: "Look up property details from SF Assessor: lot_area, lot_depth, lot_frontage, year_built, bedrooms, stories, units, assessed_value, zoning.",
    input_schema: { type: "object", properties: { address: { type: "string", description: "Property address" } }, required: ["address"] },
  },
  {
    name: "get_street_zoning_summary",
    description: "Get zoning breakdown for an entire street — how many parcels in each zone.",
    input_schema: { type: "object", properties: { street_name: { type: "string", description: "Street name" } }, required: ["street_name"] },
  },
  {
    name: "get_comparable_properties",
    description: "Find comparable properties in same neighborhood/zoning. Returns lot sizes, values, sale dates.",
    input_schema: { type: "object", properties: { neighborhood: { type: "string", description: "Neighborhood" }, zoning_code: { type: "string", description: "Zoning code" } }, required: ["neighborhood", "zoning_code"] },
  },
];

// Tool execution
async function executeTool(name, input) {
  const addr = (input.address || "").toUpperCase().trim();

  switch (name) {
    case "search_building_permits":
      return sfQuery(DATASETS.building_permits, { $where: `upper(street_name) LIKE '%${addr}%'`, $order: "filed_date DESC", $limit: "30" });

    case "search_dbi_complaints":
      return sfQuery(DATASETS.dbi_complaints, { $where: `upper(address) LIKE '%${addr}%'`, $order: "date_filed DESC", $limit: "30" });

    case "search_dbi_violations":
      return sfQuery(DATASETS.dbi_violations, { $where: `upper(address) LIKE '%${addr}%'`, $order: "novissuedate DESC", $limit: "30" });

    case "search_311_cases":
      if (input.category) {
        return sfQuery(DATASETS.cases_311, { $where: `upper(category) LIKE '%${input.category.toUpperCase()}%'`, $order: "opened DESC", $limit: "30" });
      }
      return sfQuery(DATASETS.cases_311, { $where: `upper(address) LIKE '%${addr}%'`, $order: "opened DESC", $limit: "20" });

    case "search_businesses":
      if (input.business_type && input.neighborhood) {
        return sfQuery(DATASETS.registered_businesses, {
          $where: `upper(naic_code_description) LIKE '%${input.business_type.toUpperCase()}%' AND upper(neighborhoods_analysis_boundaries) LIKE '%${input.neighborhood.toUpperCase()}%'`,
          $order: "location_start_date DESC", $limit: "30",
        });
      }
      return sfQuery(DATASETS.registered_businesses, { $where: `upper(full_business_address) LIKE '%${addr}%'`, $order: "location_start_date DESC", $limit: "30" });

    case "search_fire_violations":
      return sfQuery(DATASETS.fire_violations, { $where: `upper(address) LIKE '%${addr}%'`, $order: "violation_date DESC", $limit: "30" });

    case "search_eviction_notices":
      if (input.neighborhood) {
        return sfQuery(DATASETS.eviction_notices, { $where: `upper(neighborhood) LIKE '%${input.neighborhood.toUpperCase()}%'`, $order: "file_date DESC", $limit: "50" });
      }
      return sfQuery(DATASETS.eviction_notices, { $where: `upper(address) LIKE '%${addr}%'`, $order: "file_date DESC", $limit: "30" });

    case "search_street_trees":
      return sfQuery(DATASETS.street_trees, { $where: `upper(qaddress) LIKE '%${addr}%'`, $limit: "30" });

    case "search_adu_permits":
      const n = (input.neighborhood || "").toUpperCase();
      return sfQuery(DATASETS.building_permits, {
        $where: `(upper(description) LIKE '%ADU%' OR upper(description) LIKE '%ACCESSORY DWELLING%') AND upper(neighborhoods_analysis_boundaries) LIKE '%${n}%'`,
        $order: "filed_date DESC", $limit: "30",
      });

    case "investigate_address": {
      const [permits, complaints, violations, fire, biz, evictions, cases311, property] = await Promise.all([
        sfQuery(DATASETS.building_permits, { $where: `upper(street_name) LIKE '%${addr}%'`, $order: "filed_date DESC", $limit: "20" }),
        sfQuery(DATASETS.dbi_complaints, { $where: `upper(address) LIKE '%${addr}%'`, $order: "date_filed DESC", $limit: "20" }),
        sfQuery(DATASETS.dbi_violations, { $where: `upper(address) LIKE '%${addr}%'`, $limit: "20" }),
        sfQuery(DATASETS.fire_violations, { $where: `upper(address) LIKE '%${addr}%'`, $limit: "20" }),
        sfQuery(DATASETS.registered_businesses, { $where: `upper(full_business_address) LIKE '%${addr}%'`, $limit: "20" }),
        sfQuery(DATASETS.eviction_notices, { $where: `upper(address) LIKE '%${addr}%'`, $limit: "20" }),
        sfQuery(DATASETS.cases_311, { $where: `upper(address) LIKE '%${addr}%'`, $order: "opened DESC", $limit: "20" }),
        sfQuery(DATASETS.assessor_property, { $where: `upper(property_location) LIKE '%${addr}%'`, $order: "closed_roll_year DESC", $limit: "5" }),
      ]);
      return { permits: permits.length, complaints: complaints.length, violations: violations.length, fire_violations: fire.length, businesses: biz.length, evictions: evictions.length, cases_311: cases311.length, property_details: property, raw: { permits: permits.slice(0, 10), complaints: complaints.slice(0, 10), violations, fire, evictions, cases311: cases311.slice(0, 10) } };
    }

    case "sf_municipal_code_lookup":
      return { note: "Use your knowledge of SF Municipal Code, Housing Code, Planning Code, CA Civil Code to answer.", topic: input.topic };

    case "lookup_parcel_zoning": {
      // Strip common street type suffixes — parcel DB stores just the name (VALENCIA not VALENCIA ST)
      let sn = (input.street_name || "").toUpperCase().trim()
        .replace(/\b(STREET|ST|AVENUE|AVE|BOULEVARD|BLVD|DRIVE|DR|ROAD|RD|LANE|LN|WAY|PLACE|PL|COURT|CT|TERRACE|TER)\b/g, "")
        .trim();
      let where = `upper(street_name) LIKE '%${sn}%' AND active='true'`;
      if (input.street_number) {
        where = `from_address_num='${input.street_number}' AND upper(street_name) LIKE '%${sn}%' AND active='true'`;
      }
      return sfQuery(DATASETS.parcels, {
        $where: where,
        $select: "block_num,lot_num,street_name,street_type,from_address_num,to_address_num,zoning_code,zoning_district,supervisor_district,supname,analysis_neighborhood,planning_district",
        $limit: "20",
      });
    }

    case "lookup_property_details":
      return sfQuery(DATASETS.assessor_property, {
        $where: `upper(property_location) LIKE '%${addr}%'`,
        $select: "closed_roll_year,property_location,block,lot,use_definition,year_property_built,number_of_bathrooms,number_of_bedrooms,number_of_stories,number_of_units,zoning_code,construction_type,lot_depth,lot_frontage,property_area,lot_area,assessed_improvement_value,assessed_land_value,assessor_neighborhood,analysis_neighborhood,current_sales_date",
        $order: "closed_roll_year DESC", $limit: "5",
      });

    case "get_street_zoning_summary": {
      const street = (input.street_name || "").toUpperCase().trim()
        .replace(/\b(STREET|ST|AVENUE|AVE|BOULEVARD|BLVD|DRIVE|DR|ROAD|RD|LANE|LN|WAY|PLACE|PL|COURT|CT|TERRACE|TER)\b/g, "")
        .trim();
      return sfQuery(DATASETS.parcels, {
        $select: "zoning_code,zoning_district,count(*) as parcel_count",
        $where: `upper(street_name) LIKE '%${street}%' AND active='true'`,
        $group: "zoning_code,zoning_district",
        $order: "parcel_count DESC", $limit: "20",
      });
    }

    case "get_comparable_properties":
      return sfQuery(DATASETS.assessor_property, {
        $where: `analysis_neighborhood='${input.neighborhood}' AND zoning_code='${input.zoning_code}'`,
        $select: "property_location,lot_area,property_area,year_property_built,number_of_units,assessed_improvement_value,assessed_land_value,current_sales_date,closed_roll_year",
        $order: "closed_roll_year DESC", $limit: "20",
      });

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// System prompt
const SYSTEM_PROMPT = `You are the SF City Agent — an AI expert that helps people navigate San Francisco's complex bureaucracy, regulations, and city services.

You have access to REAL, LIVE data from San Francisco's Open Data Portal (DataSF). When a user asks a question:

1. INVESTIGATE: Use tools to pull real data. Be thorough — check multiple sources. Follow leads autonomously.
2. REASON: Connect dots across sources. Identify patterns, risks, shortcuts.
3. ADVISE: Clear action plan with departments, forms, phone numbers, deadlines, shortcuts, warnings.

KEY RULES:
- ALWAYS use lookup_parcel_zoning for zoning questions — never guess zoning.
- ALWAYS use lookup_property_details for lot size, year built, etc.
- For businesses: use get_street_zoning_summary + search_businesses for full picture.
- Cite specific code sections (SF Housing Code, CA Civil Code, SF Planning Code).
- Provide specific phone numbers and websites.
- Mark cost estimates as "(estimate — verify with department)".
- Clearly distinguish VERIFIED DATA (from databases) vs ESTIMATES/KNOWLEDGE (from AI).
- Be direct. If data shows bad news, say so.

You know SF Municipal Code, Housing Code, Planning Code, CA Civil Code, tenant rights, ADU law, business permits, 311 system, and emergency services deeply.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Sanitize history — only pass simple user/assistant text messages
    // This avoids tool_use/tool_result pairing issues from previous turns
    const cleanHistory = [];
    for (const m of history) {
      if (m.role === "user" && typeof m.content === "string") {
        cleanHistory.push({ role: "user", content: m.content });
      } else if (m.role === "assistant" && typeof m.content === "string") {
        cleanHistory.push({ role: "assistant", content: m.content });
      }
      // Skip any messages with tool_use/tool_result content
    }

    // Ensure alternating user/assistant and no consecutive same-role messages
    const validHistory = [];
    for (let i = 0; i < cleanHistory.length; i++) {
      const msg = cleanHistory[i];
      const prev = validHistory[validHistory.length - 1];
      if (!prev || prev.role !== msg.role) {
        validHistory.push(msg);
      }
      // Skip consecutive same-role messages
    }

    let messages = [
      ...validHistory,
      { role: "user", content: message },
    ];

    // Make sure first message is user
    if (messages.length > 1 && messages[0].role !== "user") {
      messages = messages.slice(1);
    }

    // Make sure we don't have consecutive user messages at the end
    if (messages.length >= 2 && messages[messages.length - 1].role === "user" && messages[messages.length - 2].role === "user") {
      // Merge them
      const last = messages.pop();
      const prev = messages.pop();
      messages.push({ role: "user", content: prev.content + "\n\n" + last.content });
    }

    let continueLoop = true;
    let iterations = 0;
    const MAX_ITERATIONS = 10; // Safety limit

    while (continueLoop && iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      // Collect tool uses from this response
      const toolUses = [];

      for (const block of response.content) {
        if (block.type === "text") {
          send({ type: "text", content: block.text });
        } else if (block.type === "tool_use") {
          send({ type: "tool_call", agent: block.name, input: block.input, id: block.id });

          const result = await executeTool(block.name, block.input);
          const resultStr = JSON.stringify(result);
          const truncated = resultStr.length > 15000 ? resultStr.slice(0, 15000) + "...[truncated]" : resultStr;
          const count = Array.isArray(result) ? result.length : (result.count || result.permits || "N/A");

          send({ type: "tool_result", agent: block.name, result: "done", id: block.id, resultCount: count });

          toolUses.push({ id: block.id, result: truncated });
        }
      }

      if (response.stop_reason === "tool_use" && toolUses.length > 0) {
        // Add assistant response + all tool results
        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: toolUses.map(t => ({
            type: "tool_result",
            tool_use_id: t.id,
            content: t.result,
          })),
        });
        continueLoop = true;
      } else {
        continueLoop = false;
      }
    }

    send({ type: "done" });
  } catch (error) {
    console.error("Agent error:", error?.message || error);
    console.error("Full error:", JSON.stringify(error, null, 2));
    send({ type: "error", content: `Error: ${error?.message || "Unknown error"}. Check that ANTHROPIC_API_KEY is set correctly in Vercel Environment Variables and that you redeployed after adding it.` });
  }

  res.end();
}
