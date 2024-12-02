import axios from "axios";
import { Executive } from "../types";
import { Logger } from "../utils/logger";
import { CRUST_POSITIONS } from "../config/constants";
import fetch, { RequestInit } from "node-fetch";

interface SerpApiResponse {
  organic_results: { link: string }[];
}

export async function querySerpApi(
  prompt: string,
  num_responses: number
): Promise<string[]> {
  const apiKey = process.env.SERP_API_KEY;
  const params = {
    q: prompt,
    hl: "en",
    gl: "us",
    google_domain: "google.com",
    api_key: apiKey,
  };

  try {
    const response = await axios.get<SerpApiResponse>(
      "https://serpapi.com/search",
      { params }
    );

    const urls = response.data.organic_results
      .map((result) => result.link)
      .slice(0, num_responses);

    return urls;
  } catch (error) {
    console.error("Failed to fetch data from SERP API:", error);
    return [];
  }
}

export async function queryCrustAPI(
  company_domain: string
): Promise<Executive[]> {
  try {
    const lower_case_current_positions = CRUST_POSITIONS.map((position) =>
      position.toLowerCase()
    );

    const response = await fetch(
      `https://api.crustdata.com/screener/person/search`,
      {
        headers: {
          Authorization: `Token c4b46b513cc0bd3b0ae459c334f1231f1af97000`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          filters: [
            {
              filter_type: "CURRENT_TITLE",
              type: "in",
              value: CRUST_POSITIONS,
            },
            {
              filter_type: "CURRENT_COMPANY",
              type: "in",
              value: [company_domain],
            },
          ],
          page: 1,
        }),
      }
    );

    const data = await response.json();

    const profiles_found = data.profiles.filter((profile: any) => {
      const current_positions = profile.employer.filter(
        (employer: any) => !employer.end_date
      );
      return current_positions.some((position: any) =>
        lower_case_current_positions.some((current_position) =>
          position.title.toLowerCase().includes(current_position)
        )
      );
    });

    const company_counts = profiles_found.reduce((acc: any, profile: any) => {
      const default_position_company_linkedin_id =
        profile.default_position_company_linkedin_id;
      if (acc[default_position_company_linkedin_id]) {
        acc[default_position_company_linkedin_id] += 1;
      } else {
        acc[default_position_company_linkedin_id] = 1;
      }
      return acc;
    }, {});

    const sorted_company_counts = Object.entries(company_counts).sort(
      (a: any, b: any) => b[1] - a[1]
    );

    const most_common_linkedin_id = sorted_company_counts[0][0];
    const found_linkedins = profiles_found
      .filter(
        (result: any) =>
          result.default_position_company_linkedin_id ===
            most_common_linkedin_id && !!result.name
      )
      .filter((result: any) => {
        const current_positions = result.employer.filter(
          (employer: any) => !employer.end_date
        );
        return current_positions.some(
          (position: any) =>
            position.company_linkedin_id === most_common_linkedin_id &&
            lower_case_current_positions.some((current_position) =>
              position.title.toLowerCase().includes(current_position)
            )
        );
      })
      .map((result: any) => {
        return {
          name: result.name,
          linkedin_url: result.linkedin_profile_url,
          position: result.default_position_title,
        };
      });

    const rawCrustLeads: Executive[] = found_linkedins.map((lead: any) => ({
      domain: company_domain,
      name: lead.name,
      title: lead.default_position_title,
      linkedin: lead.flagship_profile_url,
      source: "crust",
    }));

    return rawCrustLeads;
  } catch (error) {
    Logger.info(`Error fetching crust data: ${error}`);
  }
  return [];
}

export async function queryApolloAPI(
  company_domain: string
): Promise<Executive[]> {
  try {
    const url = "https://api.apollo.io/api/v1/mixed_people/search";
    const payload = {
      person_seniorities: [
        "ceo",
        "cto",
        "coo",
        "senior",
        "director",
        "chief people officer",
        "vp of talent acquisition",
        "vp of people",
        "chief of staff",
        "head of talent acquisition",
        "head of people",
        "vp of engineering",
        "senior recruiter",
        "vp of operations",
        "director of engineering",
        "recruiter",
        "hiring",
      ],
      q_organization_domains: company_domain,
    };

    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) {
      throw new Error(
        "API key is not defined. Set the APOLLO_API_KEY environment variable."
      );
    }

    const options: RequestInit = {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        accept: "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status} - ${errorDetails}`
      );
    }

    const json = await response.json();

    const executives: Executive[] = json.people.map(
      (person: { name: any; title: any; linkedin_url: any }) => {
        return {
          domain: company_domain,
          name: person.name,
          title: person.title,
          linkedin: person.linkedin_url,
          source: "apollo",
        };
      }
    );

    return executives;
  } catch (err) {
    console.error("Failed to fetch mixed people search:", err);
    return [];
  }
}
