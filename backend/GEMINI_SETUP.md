# Gemini AI Categorization Setup

This document explains how to configure and use Google's Gemini AI for automatic transaction categorization in Cashly.

## Prerequisites

1. **Google AI API Key**: Get your free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Docker environment running**: The backend should be running with `docker-compose up`

## Configuration Steps

### 1. Add Environment Variables

Add the following to your `.env` file in the `backend/` directory:

```bash
# AI Provider Selection
AI_PROVIDER=gemini

# Gemini Configuration
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-1.5-flash  # Options: gemini-1.5-flash, gemini-1.5-pro, gemini-pro
```

**Model Options:**
- `gemini-1.5-flash`: Fast and cost-effective (recommended for production)
- `gemini-1.5-pro`: More powerful, better accuracy
- `gemini-pro`: Previous generation model

### 2. Install Dependencies

The required package `google-generativeai` has already been installed. If you need to reinstall or update:

```bash
docker-compose exec web pip install 'google-generativeai>=0.3.0'
```

### 3. Restart Backend

After updating environment variables:

```bash
docker-compose restart web
```

## Testing

### Manual Test Script

Run the included test script to verify Gemini integration:

```bash
# Set your API key
export GEMINI_API_KEY=your-api-key-here

# Run the test
docker-compose exec web python test_gemini_categorization.py
```

Expected output:
```
============================================================
🧪 Gemini AI Categorization Test
============================================================
🔧 Initializing Gemini AI Service...
✅ Gemini service initialized with model: gemini-1.5-flash

📋 Fetching available categories...
✅ Found 10 categories
   - Groceries (...)
   - Dining (...)
   ...

🤖 Categorizing transaction: Starbucks (-$4.50)

✅ Categorization successful!
   Category: Dining
   Category ID: ...
   Confidence: 85.00%
   Reasoning: Coffee purchases are typically categorized as dining expenses
============================================================
```

### API Testing

Test via the REST API:

```bash
# 1. Get your auth token
TOKEN="your-jwt-token"

# 2. Create or find an uncategorized transaction
TRANSACTION_ID="your-transaction-id"

# 3. Request AI categorization suggestion
curl -X POST http://localhost:8000/api/v1/transactions/${TRANSACTION_ID}/suggest_category \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

# 4. Apply the suggestion automatically
curl -X POST "http://localhost:8000/api/v1/transactions/${TRANSACTION_ID}/suggest_category?apply=true" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

## Features

### Automatic Categorization on Sync

When `AI_AUTO_CATEGORIZE_ON_SYNC=True`, new transactions from Plaid will be automatically categorized using Gemini:

```bash
# In .env
AI_CATEGORIZATION_ENABLED=True
AI_AUTO_CATEGORIZE_ON_SYNC=True
AI_PROVIDER=gemini
```

### Manual Categorization

Users can request AI suggestions for any transaction via the API or frontend:
- Single transaction: `/api/v1/transactions/{id}/suggest_category`
- Bulk suggestions: `/api/v1/transactions/bulk_suggest_categories`

### Subscription Gating

The AI categorization feature respects subscription limits defined in `apps/subscriptions/limits.py`. The feature is controlled by the `FEATURE_AI_CATEGORIZATION` limit.

## Cost Considerations

### Gemini 1.5 Flash Free Tier
- **Rate limits**: 15 requests per minute (RPM), 1 million tokens per minute (TPM), 1,500 requests per day (RPD)
- **Input pricing**: Free up to limits
- **Output pricing**: Free up to limits

For pricing details: https://ai.google.dev/pricing

### Optimization Tips

1. **Use Flash model**: `gemini-1.5-flash` provides the best balance of speed and cost
2. **Batch operations**: Use bulk categorization endpoints when possible
3. **Cache results**: Gemini respects user modifications (won't re-categorize if `user_modified=True`)
4. **Set appropriate confidence thresholds**: Only apply suggestions above a certain confidence level

## Troubleshooting

### "API key not provided" Error

**Solution**: Ensure `GEMINI_API_KEY` is set in your `.env` file and restart the backend.

### "google-generativeai package is not installed" Error

**Solution**: Install the package in the Docker container:
```bash
docker-compose exec web pip install 'google-generativeai>=0.3.0'
```

### "No categories available" Error

**Solution**: Seed the database with default categories:
```bash
docker-compose exec web python manage.py seed_categories
```

### Rate Limit Errors

**Solution**: 
1. Reduce concurrent requests
2. Implement exponential backoff in production
3. Consider upgrading to Gemini Pro for higher limits

### Low Accuracy

**Solution**:
1. Switch to `gemini-1.5-pro` for better accuracy
2. Ensure categories are well-defined with clear names
3. Add more system categories for better granularity

## Switching Back to Ollama

To use Ollama instead of Gemini:

```bash
# In .env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

Then restart: `docker-compose restart web`

## Support

For issues or questions:
1. Check logs: `docker-compose logs web | grep -i gemini`
2. Review API documentation: `/api/docs/`
3. Test with the included test script
