import chardet
import pandas as pd

# Read a portion of the file to detect encoding
with open("crust_data.csv", "rb") as f:
    raw_data = f.read(10000)
    result = chardet.detect(raw_data)
    print(result)  # Displays detected encoding, e.g., {'encoding': 'utf-8', 'confidence': 0.99}

# Use the detected encoding
crust_data = pd.read_csv("crust_data.csv", encoding=result['encoding'])
my_results = pd.read_csv("updated_leads.csv")

# Step 1: Add a source column to identify the origin of the data
crust_data["Source"] = "crust_data"
my_results["Source"] = "my_results"

# Step 2: Find all unique domains in my_results
unique_domains = my_results["Domain"].unique()

# Step 3: Initialize an empty DataFrame to store the final results
combined_results = pd.DataFrame(columns=my_results.columns)

# Step 4: Iterate through all unique domains
for domain in unique_domains:
    # Filter data for the current domain from both DataFrames
    my_results_domain = my_results[my_results["Domain"] == domain]
    crust_data_domain = crust_data[crust_data["Domain"] == domain]

    # Combine the two DataFrames for the current domain
    combined_domain_data = pd.concat([my_results_domain, crust_data_domain], ignore_index=True)

    # Remove duplicates based on the "Full Name" column
    combined_domain_data = combined_domain_data.drop_duplicates(subset=["Full Name"], keep="first")

    # Append the cleaned data to the final results DataFrame
    combined_results = pd.concat([combined_results, combined_domain_data], ignore_index=True)

# Step 5: Write the combined results to a CSV file
combined_results.to_csv("updated_my_results_with_source.csv", index=False)

