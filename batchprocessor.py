import requests
import pandas as pd

file_path = "totalLeads.csv"
output_file_path = "generatedLeads.csv"

input_data = pd.read_csv(file_path)
domains = input_data["Domain"].unique()

company_name = {}
investor_reference = {}
company_reference = {}
for domain in domains:
    domain_data = input_data[input_data["Domain"] == domain]
    
    company_name[domain] = domain_data["Company name"].iloc[0]
    investor_reference[domain] = domain_data["Investor reference"].iloc[0]
    company_reference[domain] = domain_data["Companies reference"].iloc[0]

def fetch_company_executives(domain: str):
    if not isinstance(domain, str) or not domain.strip():
        raise ValueError("The domain must be a non-empty string.")

    base_url = "https://companyexecutivescraper.onrender.com/scrape?company_name="
    url = f"{base_url}{domain}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()  
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to fetch data from the API: {e}")

processed_data = []
for domain in domains:
    print(f"Scraping executives for {domain}...")
    try:
        json_data = fetch_company_executives(domain)

        for executive in json_data:
            name = executive.get('name', 'Unknown')
            title = executive.get('title', 'Unknown')
            linkedin = executive.get('linkedin', 'N/A')
            source = executive.get('source', 'N/A')

            row = {
                "Company_Name": company_name[domain],
                "Domain": domain,
                "Name": name,
                "Title": title,
                "LinkedIn": linkedin,
                "Source": source,
                "Investor_Reference": investor_reference[domain],
                "Company_Reference": company_reference[domain]
            }

            processed_data.append(row)
    except Exception as e:
        print(f"Error processing domain {domain}: {e}")

processed_df = pd.DataFrame(processed_data)
processed_df.to_csv(output_file_path, index=False)
print(f"Processed data written to {output_file_path}")