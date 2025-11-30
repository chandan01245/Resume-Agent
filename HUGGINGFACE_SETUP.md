# 🤗 Hugging Face API Setup Guide

The application now uses **Hugging Face Inference API** instead of OpenAI for resume analysis. This provides free access to powerful AI models.

## Step 1: Get Your Free API Key

1. **Sign up for Hugging Face** (if you don't have an account):
   - Go to https://huggingface.co/join
   - Create a free account

2. **Generate an Access Token**:
   - Go to https://huggingface.co/settings/tokens
   - Click "New token"
   - Give it a name (e.g., "Resume-Agent")
   - Select **"Read"** access type
   - Click "Generate token"
   - **Copy the token** (you won't see it again!)

## Step 2: Configure Your Application

1. Open the `.env` file in the root directory
2. Add or update this line:
   ```
   HUGGINGFACE_API_KEY=your_token_here
   ```
3. Replace `your_token_here` with the token you copied

## Step 3: Install Dependencies

If you haven't already:
```bash
cd backend
pip install -r requirements.txt
```

## Step 4: Start the Application

Run the start script:
```bash
start_app.bat
```

## What Changed?

- **Model**: Using `mistralai/Mistral-7B-Instruct-v0.2` (free and powerful)
- **API**: Switched from OpenAI to Hugging Face Inference API
- **API URL**: Using latest endpoint `https://api-inference.huggingface.co`
- **Cost**: Completely free with generous rate limits
- **Functionality**: Same resume analysis features

## Troubleshooting

### "Model is loading" Error
If you get a 503 error, the model is loading. The app will automatically retry after 20 seconds.

### Rate Limits
Free tier allows ~1000 requests/day. For higher usage, consider upgrading to PRO ($9/month).

### API Key Not Working
- Make sure you copied the full token
- Check that the `.env` file is in the root directory
- Restart the backend server after updating the `.env` file

## Need Help?

- Hugging Face Docs: https://huggingface.co/docs/api-inference
- Token Settings: https://huggingface.co/settings/tokens
