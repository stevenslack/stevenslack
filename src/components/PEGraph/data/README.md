## Data Retrieval

For wage data the Bureau of Labor Statistics series data is used.
You can generate new CSV formatted data from the data retrieval tools: https://data.bls.gov/pdq/SurveyOutputServlet

Data extracted on: August 8, 2023 (9:21 AM)

Quarterly Census of Employment and Wages

| Series Id    	| ENU3702140010                                                                                                                  	|
|--------------	|--------------------------------------------------------------------------------------------------------------------------------	|
| Series Title 	| Average Weekly Wage in Total Covered Total, all industries for All establishment sizes in Buncombe County, North Carolina, NSA 	|
| State        	| North Carolina                                                                                                                 	|
| Area         	| Buncombe County, North Carolina                                                                                                	|
| Industry     	| Total, all industries                                                                                                          	|
| Owner        	| Total Covered                                                                                                                  	|
| Size         	| All establishment sizes                                                                                                        	|
| Type         	| Average Weekly Wage                                                                                                            	|

## Data Retrieval

### Automated Data Updates

**To update BLS wage data automatically:**

```bash
npm run update-bls
```

This script will:
1. Fetch the latest data from the BLS API
2. Compare with existing data in `bls-wages.ts`
3. Append any new quarterly data points
4. Maintain proper sorting by year and quarter

**Testing the update script:**
```bash
npm run test-bls
```

### ZHVI Data

**To update ZHVI housing data automatically:**

```bash
npm run update-zhvi
```

This script will:
1. Download the latest Zillow ZHVI CSV file (~12MB)
2. Extract Buncombe County data (RegionID: 2156)
3. Merge with existing data in `avl-county-zhvi.json`
4. Update both JSON and CSV files
5. Maintain chronological sorting
6. Clean up the downloaded CSV file to save disk space

**Important Note:** Zillow regularly revises historical ZHVI values with each monthly release. This means previous months' values may change when you update. This is normal and reflects Zillow's ongoing improvements to their methodology and data quality.

**To preview changes before updating:**
```bash
npm run compare-zhvi
```

This comparison tool will show you what data would be added or revised without making any changes to your files. Note: The tool requires a downloaded CSV file, so if the file has been cleaned up, it will prompt you to run the update script.

**Testing the ZHVI update script:**
```bash
npm run test-zhvi
```

**Update both datasets:**
```bash
npm run update-data
```

### Manual Data Retrieval (Legacy)

**BLS Data:**
Data can be fetched via the BLS API as such:
https://api.bls.gov/publicAPI/v2/timeseries/data/ENU3702140010/?startyear=2013&endyear=2023&calculations=true&annualaverage=true&aspects=true

To get the latest data run the script without the `startyear` and `endyear` parameters. This will return the latest data available e.g.:
https://api.bls.gov/publicAPI/v2/timeseries/data/ENU3702140010/?calculations=true&annualaverage=true&aspects=true

This has rate limitations and date range limitations of 10 years therefore downloadable CSV data is much more rich and reliable. This requires manual updating.

**ZHVI Data:** 
For the ZHVI data, the Zillow Home Value Index is used and can be found at https://www.zillow.com/research/data/
NOTE the change in how the ZHVI is calculated can be found here: https://www.zillow.com/research/methodology-neural-zhvi-32128/
File Download link:
https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv?t=1740920520

Note: Zillow makes occasional changes to CSV download paths and data is updated on the 16th of each month
