import { NextApiRequest, NextApiResponse } from "next";

export default async function (req: NextApiRequest, res: NextApiResponse) {
  const {
    method,
    query: { url, raw },
  } = req;

  if (method === "GET") {
    const clean_url = url
      ? url
          .toString()
          .replace(/(^\w+:|^)\/\//, "")
          .replace(/^www\./, "")
      : undefined;

    const current_positions = [
      "Founder",
      "Co-Founder",
      "CEO",
      "CTO",
      "COO",
      "Chief People Officer",
      "VP of Talent",
      "VP of People",
      "Chief of staff",
      "Head of Talent",
      "Vice President of Talent",
      "Head of People",
      "VP of Engineering",
      "VP of Operations",
      "Director of Engineering",
      "CFO",
      "VP of Sales",
      "CMO",
    ];

    const lower_case_current_positions = current_positions.map((position) =>
      position.toLowerCase()
    );

    try {
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
                filter_type: "CURRENT_COMPANY",
                type: "in",
                value: [clean_url],
              },
            ],
            page: 1,
          }),
        }
      );

      const data = await response.json();

      if (raw) {
        return res.status(200).json(data);
      }

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

      // Counts for number of default_position_company_linkedin_id
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

      // Sort the most_common_default_position_company_linkedin_id by the number of profiles
      const sorted_company_counts = Object.entries(company_counts).sort(
        (a: any, b: any) => b[1] - a[1]
      );

      if (sorted_company_counts.length === 0) {
        res.status(200).json([]);
      }

      const most_common_linkedin_id = sorted_company_counts[0][0];

      const found_linkedins = profiles_found
        .filter(
          (result: any) =>
            result.default_position_company_linkedin_id ===
              most_common_linkedin_id && !!result.name
        )
        .filter((result: any) => {
          // Only include profiles where the end date is null and the company_id at that position is the same as the most common company_id and the title is in the current_positions array
          const current_positions = result.employer.filter(
            (employer: any) => !employer.end_date
          );

          console.log(result.name, current_positions);
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

      res.status(200).json(found_linkedins);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ statusCode: 500, message: errorMessage });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
