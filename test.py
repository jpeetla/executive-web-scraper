import pandas as pd

# Load the datasets
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

# import pandas as pd

# # Load the combined data with the Source column
# combined_results = pd.read_csv("updated_my_results_with_source.csv")

# # Count the occurrences of each source
# source_counts = combined_results["Source"].value_counts()

# # Calculate the ratio
# crust_data_count = source_counts.get("crust_data", 0)
# my_results_count = source_counts.get("my_results", 0)

# # Print the counts and ratio
# print(f"Rows from 'crust_data': {crust_data_count}")
# print(f"Rows from 'my_results': {my_results_count}")
# if my_results_count > 0:  # Avoid division by zero
#     ratio = crust_data_count / my_results_count
#     print(f"Ratio (crust_data : my_results): {crust_data_count} : {my_results_count} = {ratio:.2f}")
# else:
#     print("No rows found from 'my_results', so ratio cannot be calculated.")
