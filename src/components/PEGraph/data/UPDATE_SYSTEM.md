# Economic Data Update System

This document provides an overview of the automated data update system for the P/E Graph economic visualization.

## 📊 Data Sources

### BLS Wage Data
- **Source**: Bureau of Labor Statistics (BLS) API
- **Series ID**: ENU3702140010
- **Data**: Average Weekly Wage for Buncombe County, NC
- **Format**: Quarterly data points
- **File**: `bls-wages.ts`

### ZHVI Housing Data
- **Source**: Zillow Home Value Index (ZHVI)
- **Region**: Buncombe County, NC (RegionID: 2156)
- **Data**: Monthly home values
- **Format**: JSON and CSV files
- **Files**: `avl-county-zhvi.json`, `avl-county-zhvi.csv`
- **Note**: Zillow revises historical data monthly with new releases

## 🤖 Automated Update Scripts

### BLS Data Update (`update-bls-data.js`)
```bash
npm run update-bls
```

**Features:**
- Fetches latest quarterly wage data from BLS API
- Automatically determines date range based on existing data
- Deduplicates data to prevent duplicates
- Maintains TypeScript data structure
- Provides detailed logging of changes

### ZHVI Data Update (`update-zhvi-data.js`)
```bash
npm run update-zhvi
```

**Features:**
- Downloads latest Zillow CSV file (12+ MB)
- Extracts Buncombe County data from national dataset
- Updates both JSON and CSV formats
- Preserves existing data structure
- Handles chronological sorting
- Automatically cleans up downloaded file to save disk space

### Combined Update
```bash
npm run update-data
```

### Preview ZHVI Changes
```bash
npm run compare-zhvi
```

**Features:**
- Shows what data would change before updating
- Identifies new data points vs. historical revisions
- Helps understand Zillow's data revision patterns
- No files are modified during comparison

## 🧪 Testing Scripts

### Test BLS Functionality
```bash
npm run test-bls
```

### Test ZHVI Functionality
```bash
npm run test-zhvi
```

Both test scripts validate:
- Data parsing functionality
- API/URL accessibility
- Data merging logic
- File structure integrity

## ⚙️ Automation Options

### 1. Manual Updates
Run scripts manually when needed:
```bash
npm run update-data
```

### 2. GitHub Actions (Recommended)
- **Workflow**: `.github/workflows/update-economic-data.yml`
- **Trigger**: Manual or scheduled (currently disabled)
- **Features**:
  - Runs tests before updating
  - Commits changes automatically
  - Provides detailed summary
  - Handles multiple file updates

To enable scheduled updates, uncomment the cron section:
```yaml
schedule:
  # Run on the 1st and 15th of each month at 9 AM UTC
  - cron: '0 9 1,15 * *'
```

### 3. Local Cron Job
Add to your crontab for local automation:
```bash
# Update economic data on the 1st and 15th of each month
0 9 1,15 * * cd /path/to/project && npm run update-data
```

## 📁 File Structure

```
src/components/PEGraph/data/
├── bls-wages.ts                    # BLS wage data (TypeScript)
├── avl-county-zhvi.json          # ZHVI data (JSON format)
├── avl-county-zhvi.csv           # ZHVI data (CSV format)
├── update-bls-data.js             # BLS update script
├── update-zhvi-data.js            # ZHVI update script
├── compare-zhvi-updates.js        # ZHVI comparison tool
├── test-bls-update.js             # BLS test script
├── test-zhvi-update.js            # ZHVI test script
└── README.md                      # Documentation
```

## 🔧 Configuration

### BLS Configuration
- **API Endpoint**: `https://api.bls.gov/publicAPI/v2/timeseries/data/`
- **Rate Limits**: Yes (automatic handling)
- **Date Range**: 10-year API limitation
- **Authentication**: Not required for public API

### ZHVI Configuration
- **Download URL**: `https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv`
- **File Size**: ~12 MB
- **Update Frequency**: Monthly (16th of each month)
- **Data Format**: CSV with 3000+ counties
- **Path Changes**: Zillow occasionally changes CSV download paths; monitor for 404 errors

### URL Path Monitoring

Zillow notes that they "make occasional changes to CSV download paths." If the update script starts failing with 404 errors, you may need to:

1. **Check Zillow's data page**: Visit [Zillow Research Data](https://www.zillow.com/research/data/) for updated CSV URLs
2. **Update the script**: Modify the `ZILLOW_CSV_URL` constant in `update-zhvi-data.js`
3. **Verify the data format**: Ensure Buncombe County (RegionID 2156) is still present
4. **Test the update**: Run `npm run test-zhvi` to validate the new URL

## ⚠️ Important: Zillow Data Revisions

Zillow regularly revises historical ZHVI data with each monthly release. This means:

- **Historical Values Change**: Previous month's values may be different in the current month's CSV
- **Data Consistency**: Our local files may show discrepancies with newly downloaded data
- **This is Normal**: Zillow's methodology improvements and data corrections cause these revisions
- **Update Strategy**: The system prioritizes new data over preserving historical consistency

### Handling Revisions

When the update script runs, it may show "differences" for historical dates. This is expected because:

1. **Seasonal Adjustments**: Zillow applies new seasonal adjustment algorithms
2. **Methodology Updates**: Changes in how ZHVI is calculated
3. **Data Quality Improvements**: Corrections based on new transaction data
4. **Model Refinements**: Updates to Zillow's automated valuation model

The system will automatically use the most recent Zillow data, which represents their best current estimate of historical home values.

## 🚨 Error Handling

Both scripts include comprehensive error handling:

- **Network Issues**: Graceful failure with informative messages
- **API Changes**: Validation of response structure
- **File Corruption**: Backup preservation and validation
- **Data Inconsistencies**: Detailed logging and recovery

## 📈 Data Quality

### Validation Checks
- **Data Structure**: Ensures consistent TypeScript/JSON format
- **Chronological Order**: Maintains proper date sorting
- **Duplicate Prevention**: Automatic deduplication
- **Value Validation**: Checks for reasonable numeric ranges

### Monitoring
- **Change Detection**: Reports new vs updated data points
- **Date Ranges**: Validates data continuity
- **Value Trends**: Logs significant changes

## 🔮 Future Enhancements

### Planned Features
- **Email Notifications**: Alert on successful updates
- **Data Validation**: Enhanced checks for data quality
- **Historical Backup**: Maintain version history
- **Performance Metrics**: Track update success rates

### Potential Integrations
- **Slack/Discord**: Update notifications
- **Database Storage**: Alternative to file-based storage
- **API Endpoints**: Expose data via REST API
- **Dashboard**: Web interface for monitoring updates

## 📞 Support

For issues or questions:
1. Check the test scripts first: `npm run test-bls` or `npm run test-zhvi`
2. Review error logs for specific issues
3. Verify network connectivity and API accessibility
4. Check for breaking changes in data source formats

## 📄 License

This update system is part of the stevenslack project and follows the same licensing terms.
