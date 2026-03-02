/**
 * SF City Data Client
 * Connects to real San Francisco Open Data (SODA) APIs
 * 
 * Data sources:
 * - Building Permits: https://data.sfgov.org/resource/i98e-djp9.json
 * - DBI Complaints: https://data.sfgov.org/resource/gm2e-bten.json
 * - DBI Violations: https://data.sfgov.org/resource/nbtm-fbw5.json
 * - 311 Cases: https://data.sfgov.org/resource/vw6y-z8j6.json
 * - Registered Businesses: https://data.sfgov.org/resource/g8m3-pdis.json
 * - Zoning Districts: https://data.sfgov.org/resource/p5b7-5n3h.json
 * - Fire Violations: https://data.sfgov.org/resource/wb4c-6hwj.json
 * - Street Tree List: https://data.sfgov.org/resource/tkzw-k3nq.json
 * - Eviction Notices: https://data.sfgov.org/resource/5cei-gny5.json
 * - Affordable Housing: https://data.sfgov.org/resource/9rdx-httc.json
 * - Land Use / Zoning: https://data.sfgov.org/resource/p5b7-5n3h.json
 */

const BASE_URL = "https://data.sfgov.org/resource";

// Dataset IDs for each data source
const DATASETS = {
  building_permits: "i98e-djp9",
  dbi_complaints: "gm2e-bten",
  dbi_violations: "nbtm-fbw5",
  cases_311: "vw6y-z8j6",
  registered_businesses: "g8m3-pdis",
  zoning_districts: "p5b7-5n3h",
  fire_violations: "wb4c-6hwj",
  street_trees: "tkzw-k3nq",
  eviction_notices: "5cei-gny5",
  affordable_housing: "9rdx-httc",
  planning_permits: "iaiu-ynpx",
  rent_board_petitions: "jtm5-funn",
  parcels: "acdm-wktn",
  assessor_property: "wv5m-vpq2",
  zoning_districts_map: "xvjh-uu28",
  zoning_height_bulk: "rwdp-2k4t",
};

class SFDataClient {
  constructor(appToken = null) {
    this.appToken = appToken || process.env.SF_DATA_APP_TOKEN || null;
  }

  /**
   * Core SODA query method
   */
  async query(datasetId, params = {}) {
    const url = new URL(`${BASE_URL}/${datasetId}.json`);

    // Add query parameters
    if (params.$where) url.searchParams.set("$where", params.$where);
    if (params.$select) url.searchParams.set("$select", params.$select);
    if (params.$order) url.searchParams.set("$order", params.$order);
    if (params.$limit) url.searchParams.set("$limit", params.$limit.toString());
    if (params.$offset) url.searchParams.set("$offset", params.$offset.toString());
    if (params.$q) url.searchParams.set("$q", params.$q);
    if (params.$group) url.searchParams.set("$group", params.$group);
    if (params.$having) url.searchParams.set("$having", params.$having);

    const headers = {
      Accept: "application/json",
    };
    if (this.appToken) {
      headers["X-App-Token"] = this.appToken;
    }

    try {
      const response = await fetch(url.toString(), { headers, next: { revalidate: 3600 } });
      if (!response.ok) {
        throw new Error(`SODA API error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error querying dataset ${datasetId}:`, error);
      return [];
    }
  }

  // ========================================
  // BUILDING PERMITS
  // ========================================

  /**
   * Get building permits for a specific address
   */
  async getPermitsByAddress(address) {
    const normalized = address.toUpperCase().trim();
    return this.query(DATASETS.building_permits, {
      $where: `upper(street_name) LIKE '%${normalized}%'`,
      $order: "filed_date DESC",
      $limit: 50,
    });
  }

  /**
   * Get permits by block/lot (parcel number)
   */
  async getPermitsByParcel(block, lot) {
    return this.query(DATASETS.building_permits, {
      $where: `block='${block}' AND lot='${lot}'`,
      $order: "filed_date DESC",
      $limit: 50,
    });
  }

  /**
   * Get recent permits in a specific area/neighborhood
   */
  async getRecentPermitsByType(permitType, neighborhood = null, limit = 20) {
    let where = `permit_type='${permitType}'`;
    if (neighborhood) {
      where += ` AND neighborhoods_analysis_boundaries='${neighborhood}'`;
    }
    return this.query(DATASETS.building_permits, {
      $where: where,
      $order: "filed_date DESC",
      $limit: limit,
    });
  }

  /**
   * Get ADU-specific permits
   */
  async getADUPermits(neighborhood = null, limit = 20) {
    let where = `upper(description) LIKE '%ADU%' OR upper(description) LIKE '%ACCESSORY DWELLING%' OR upper(description) LIKE '%IN-LAW%'`;
    if (neighborhood) {
      where = `(${where}) AND neighborhoods_analysis_boundaries='${neighborhood}'`;
    }
    return this.query(DATASETS.building_permits, {
      $where: where,
      $order: "filed_date DESC",
      $limit: limit,
    });
  }

  // ========================================
  // DBI COMPLAINTS & VIOLATIONS
  // ========================================

  /**
   * Get DBI complaints for an address
   */
  async getComplaintsByAddress(address) {
    const normalized = address.toUpperCase().trim();
    return this.query(DATASETS.dbi_complaints, {
      $where: `upper(address) LIKE '%${normalized}%'`,
      $order: "date_filed DESC",
      $limit: 50,
    });
  }

  /**
   * Get DBI violations for an address
   */
  async getViolationsByAddress(address) {
    const normalized = address.toUpperCase().trim();
    return this.query(DATASETS.dbi_violations, {
      $where: `upper(address) LIKE '%${normalized}%'`,
      $order: "novissuedate DESC",
      $limit: 50,
    });
  }

  /**
   * Get complaints by type (heating, plumbing, electrical, etc.)
   */
  async getComplaintsByType(complaintType, limit = 100) {
    return this.query(DATASETS.dbi_complaints, {
      $where: `upper(complaint_type) LIKE '%${complaintType.toUpperCase()}%'`,
      $order: "date_filed DESC",
      $limit: limit,
    });
  }

  /**
   * Get open/active complaints for an address
   */
  async getOpenComplaintsByAddress(address) {
    const normalized = address.toUpperCase().trim();
    return this.query(DATASETS.dbi_complaints, {
      $where: `upper(address) LIKE '%${normalized}%' AND status != 'Closed'`,
      $order: "date_filed DESC",
      $limit: 50,
    });
  }

  // ========================================
  // 311 CASES
  // ========================================

  /**
   * Get 311 cases near an address
   */
  async get311CasesByAddress(address, limit = 20) {
    const normalized = address.toUpperCase().trim();
    return this.query(DATASETS.cases_311, {
      $where: `upper(address) LIKE '%${normalized}%'`,
      $order: "opened DESC",
      $limit: limit,
    });
  }

  /**
   * Get 311 cases by category (Tree Maintenance, Street Defects, etc.)
   */
  async get311CasesByCategory(category, neighborhood = null, limit = 50) {
    let where = `upper(category) LIKE '%${category.toUpperCase()}%'`;
    if (neighborhood) {
      where += ` AND upper(neighborhoods_sffind_boundaries) LIKE '%${neighborhood.toUpperCase()}%'`;
    }
    return this.query(DATASETS.cases_311, {
      $where: where,
      $order: "opened DESC",
      $limit: limit,
    });
  }

  /**
   * Get recent 311 cases near coordinates
   */
  async get311CasesNearby(lat, lng, radiusMeters = 500, limit = 20) {
    return this.query(DATASETS.cases_311, {
      $where: `within_circle(point, ${lat}, ${lng}, ${radiusMeters})`,
      $order: "opened DESC",
      $limit: limit,
    });
  }

  // ========================================
  // BUSINESSES
  // ========================================

  /**
   * Get registered businesses at an address
   */
  async getBusinessesByAddress(address) {
    const normalized = address.toUpperCase().trim();
    return this.query(DATASETS.registered_businesses, {
      $where: `upper(full_business_address) LIKE '%${normalized}%'`,
      $order: "location_start_date DESC",
      $limit: 50,
    });
  }

  /**
   * Search businesses by type in a neighborhood
   */
  async getBusinessesByType(naicsDescription, neighborhood = null, limit = 50) {
    let where = `upper(naic_code_description) LIKE '%${naicsDescription.toUpperCase()}%'`;
    if (neighborhood) {
      where += ` AND upper(neighborhoods_analysis_boundaries) LIKE '%${neighborhood.toUpperCase()}%'`;
    }
    return this.query(DATASETS.registered_businesses, {
      $where: where,
      $order: "location_start_date DESC",
      $limit: limit,
    });
  }

  // ========================================
  // FIRE VIOLATIONS
  // ========================================

  /**
   * Get fire violations for an address
   */
  async getFireViolationsByAddress(address) {
    const normalized = address.toUpperCase().trim();
    return this.query(DATASETS.fire_violations, {
      $where: `upper(address) LIKE '%${normalized}%'`,
      $order: "violation_date DESC",
      $limit: 50,
    });
  }

  // ========================================
  // TREES
  // ========================================

  /**
   * Get street trees near an address
   */
  async getStreetTreesByAddress(address) {
    const normalized = address.toUpperCase().trim();
    return this.query(DATASETS.street_trees, {
      $where: `upper(qaddress) LIKE '%${normalized}%'`,
      $limit: 50,
    });
  }

  /**
   * Get trees near coordinates
   */
  async getTreesNearby(lat, lng, radiusMeters = 200) {
    return this.query(DATASETS.street_trees, {
      $where: `within_circle(location, ${lat}, ${lng}, ${radiusMeters})`,
      $limit: 50,
    });
  }

  // ========================================
  // EVICTIONS
  // ========================================

  /**
   * Get eviction notices for an address
   */
  async getEvictionsByAddress(address) {
    const normalized = address.toUpperCase().trim();
    return this.query(DATASETS.eviction_notices, {
      $where: `upper(address) LIKE '%${normalized}%'`,
      $order: "file_date DESC",
      $limit: 50,
    });
  }

  /**
   * Get eviction statistics by neighborhood
   */
  async getEvictionsByNeighborhood(neighborhood, limit = 100) {
    return this.query(DATASETS.eviction_notices, {
      $where: `upper(neighborhood) LIKE '%${neighborhood.toUpperCase()}%'`,
      $order: "file_date DESC",
      $limit: limit,
    });
  }

  // ========================================
  // ZONING
  // ========================================

  /**
   * Get zoning info (note: this returns GeoJSON-like data)
   */
  async getZoningDistricts(limit = 100) {
    return this.query(DATASETS.zoning_districts, {
      $limit: limit,
    });
  }

  // ========================================
  // PARCEL & PROPERTY DATA (NEW - for 100% accuracy)
  // ========================================

  /**
   * Get parcel zoning info by address
   * Returns: zoning_code, zoning_district, block, lot, supervisor_district, neighborhood
   */
  async getParcelByAddress(streetNumber, streetName) {
    const normalizedName = streetName.toUpperCase().trim();
    let where = `upper(street_name) LIKE '%${normalizedName}%' AND active='true'`;
    if (streetNumber) {
      where += ` AND from_address_num <= '${streetNumber}' AND to_address_num >= '${streetNumber}'`;
    }
    const results = await this.query(DATASETS.parcels, {
      $where: where,
      $select:
        "block_num,lot_num,street_name,street_type,from_address_num,to_address_num,zoning_code,zoning_district,supervisor_district,supname,analysis_neighborhood,planning_district",
      $limit: 20,
    });

    // If address range query didn't work, try simpler approach
    if (results.length === 0) {
      return this.query(DATASETS.parcels, {
        $where: `upper(street_name) LIKE '%${normalizedName}%' AND active='true'`,
        $select:
          "block_num,lot_num,street_name,street_type,from_address_num,to_address_num,zoning_code,zoning_district,supervisor_district,supname,analysis_neighborhood,planning_district",
        $order: "from_address_num ASC",
        $limit: 20,
      });
    }
    return results;
  }

  /**
   * Get parcel zoning by block and lot
   */
  async getParcelByBlockLot(block, lot) {
    return this.query(DATASETS.parcels, {
      $where: `block_num='${block}' AND lot_num='${lot}' AND active='true'`,
      $select:
        "block_num,lot_num,street_name,street_type,from_address_num,to_address_num,zoning_code,zoning_district,supervisor_district,supname,analysis_neighborhood,planning_district",
      $limit: 5,
    });
  }

  /**
   * Get all parcels on a street with their zoning
   * Useful for "what's the zoning on Valencia Street?"
   */
  async getStreetZoning(streetName) {
    const normalizedName = streetName.toUpperCase().trim();
    return this.query(DATASETS.parcels, {
      $select: "zoning_code,zoning_district,count(*) as parcel_count",
      $where: `upper(street_name) LIKE '%${normalizedName}%' AND active='true'`,
      $group: "zoning_code,zoning_district",
      $order: "parcel_count DESC",
      $limit: 20,
    });
  }

  /**
   * Get property details from assessor data
   * Returns: lot_area, lot_depth, lot_frontage, property_area, year_built,
   *          bedrooms, bathrooms, stories, units, assessed_value, zoning, neighborhood
   */
  async getPropertyDetails(address) {
    const normalized = address.toUpperCase().trim();
    return this.query(DATASETS.assessor_property, {
      $where: `upper(property_location) LIKE '%${normalized}%' AND closed_roll_year = (SELECT MAX(closed_roll_year) FROM \`${DATASETS.assessor_property}\`)`,
      $select:
        "closed_roll_year,property_location,block,lot,use_code,use_definition,property_class_code,property_class_code_definition,year_property_built,number_of_bathrooms,number_of_bedrooms,number_of_rooms,number_of_stories,number_of_units,zoning_code,construction_type,lot_depth,lot_frontage,property_area,basement_area,lot_area,assessed_improvement_value,assessed_land_value,assessor_neighborhood,analysis_neighborhood,supervisor_district,current_sales_date",
      $order: "closed_roll_year DESC",
      $limit: 5,
    });
  }

  /**
   * Get property details by block and lot (more precise)
   */
  async getPropertyByBlockLot(block, lot) {
    return this.query(DATASETS.assessor_property, {
      $where: `block='${block}' AND lot='${lot}'`,
      $select:
        "closed_roll_year,property_location,block,lot,use_code,use_definition,property_class_code,property_class_code_definition,year_property_built,number_of_bathrooms,number_of_bedrooms,number_of_rooms,number_of_stories,number_of_units,zoning_code,construction_type,lot_depth,lot_frontage,property_area,basement_area,lot_area,assessed_improvement_value,assessed_land_value,assessor_neighborhood,analysis_neighborhood,supervisor_district,current_sales_date",
      $order: "closed_roll_year DESC",
      $limit: 5,
    });
  }

  /**
   * Get comparable properties in same neighborhood and zoning
   * Useful for price/rent comparisons
   */
  async getComparableProperties(neighborhood, zoningCode, useCode, limit = 20) {
    let where = `analysis_neighborhood='${neighborhood}' AND zoning_code='${zoningCode}'`;
    if (useCode) {
      where += ` AND use_code='${useCode}'`;
    }
    return this.query(DATASETS.assessor_property, {
      $where: where,
      $select:
        "property_location,lot_area,property_area,year_property_built,number_of_units,assessed_improvement_value,assessed_land_value,current_sales_date,closed_roll_year",
      $order: "closed_roll_year DESC, current_sales_date DESC",
      $limit: limit,
    });
  }

  // ========================================
  // COMPOSITE / INVESTIGATION QUERIES
  // ========================================

  /**
   * Full building investigation - pulls from ALL sources including parcel & property
   */
  async investigateAddress(address) {
    const [permits, complaints, violations, fireViolations, businesses, evictions, cases311, propertyDetails] =
      await Promise.all([
        this.getPermitsByAddress(address),
        this.getComplaintsByAddress(address),
        this.getViolationsByAddress(address),
        this.getFireViolationsByAddress(address),
        this.getBusinessesByAddress(address),
        this.getEvictionsByAddress(address),
        this.get311CasesByAddress(address),
        this.getPropertyDetails(address),
      ]);

    return {
      address,
      property_details: { count: propertyDetails.length, data: propertyDetails },
      permits: { count: permits.length, data: permits },
      complaints: { count: complaints.length, data: complaints },
      violations: { count: violations.length, data: violations },
      fire_violations: { count: fireViolations.length, data: fireViolations },
      businesses: { count: businesses.length, data: businesses },
      evictions: { count: evictions.length, data: evictions },
      cases_311: { count: cases311.length, data: cases311 },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Neighborhood competitive analysis (for business planning)
   */
  async analyzeBusinessCompetition(businessType, neighborhood) {
    const [existingBusinesses, recentPermits] = await Promise.all([
      this.getBusinessesByType(businessType, neighborhood),
      this.getRecentPermitsByType("8", neighborhood), // Type 8 = alterations (common for new businesses)
    ]);

    return {
      neighborhood,
      businessType,
      existing_businesses: { count: existingBusinesses.length, data: existingBusinesses.slice(0, 20) },
      recent_permits: { count: recentPermits.length, data: recentPermits.slice(0, 20) },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Tenant rights investigation for an address
   */
  async investigateTenantIssues(address) {
    const [complaints, violations, evictions, fireViolations] = await Promise.all([
      this.getComplaintsByAddress(address),
      this.getViolationsByAddress(address),
      this.getEvictionsByAddress(address),
      this.getFireViolationsByAddress(address),
    ]);

    const openComplaints = complaints.filter((c) => c.status !== "Closed");

    return {
      address,
      total_complaints: complaints.length,
      open_complaints: openComplaints.length,
      complaints: complaints.slice(0, 20),
      violations: { count: violations.length, data: violations.slice(0, 20) },
      eviction_history: { count: evictions.length, data: evictions },
      fire_violations: { count: fireViolations.length, data: fireViolations.slice(0, 20) },
      risk_level:
        openComplaints.length > 3 ? "HIGH" : openComplaints.length > 0 ? "MEDIUM" : "LOW",
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { SFDataClient, DATASETS };
