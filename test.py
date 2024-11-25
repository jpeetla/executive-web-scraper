import pandas as pd

expected_data = pd.read_csv("finport.csv")  
experimental_data = pd.read_csv("fincapportfolio.csv")  

# Initialize counters and list to store unmatched companies
matched_count = 0
missing_companies = []

# Iterate over each row in expected_data
for _, row in expected_data.iterrows():
    full_name = row['Full Name']
    linkedin_profile = row['LinkedIn Profile']
    
    # Check for any match in experimental_data
    full_name_match = experimental_data['Full Name'].eq(full_name).any()
    linkedin_profile_match = experimental_data['LinkedIn Profile'].eq(linkedin_profile).any()
    
    # If there’s a match on either column, count it as a match
    if full_name_match or linkedin_profile_match:
        matched_count += 1
    else:
        # If no match is found, add the company to missing list
        missing_companies.append(row['Full Name'])

# Calculate accuracy
total_expected_rows = expected_data.shape[0]
total_accuracy = (matched_count / total_expected_rows) * 100

# Print results
print(f"Total Accuracy (Full Name or LinkedIn): {total_accuracy:.2f}%")
print("Companies with missing matches:", missing_companies)

