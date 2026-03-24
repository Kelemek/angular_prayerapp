#!/bin/bash
# Deployment script for all Supabase Edge Functions

set -e  # Exit on error

echo "🚀 Deploying Supabase Edge Functions"
echo "====================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not installed"
    echo ""
    echo "Install with:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Parse command line arguments
FUNCTION_NAME="${1:-all}"

deploy_function() {
    local func_name=$1
    local flags=$2
    
    echo "📦 Deploying $func_name..."
    if supabase functions deploy "$func_name" $flags; then
        echo "✅ $func_name deployed successfully!"
        echo ""
    else
        echo "❌ Failed to deploy $func_name"
        return 1
    fi
}

# Deploy based on argument
case $FUNCTION_NAME in
    "send-notification")
        deploy_function "send-notification" "--no-verify-jwt"
        echo "� Remember: send-notification runs without JWT verification"
        echo "   This is for anonymous email sending (prayer requests, etc.)"
        ;;
    "send-prayer-reminders")
        deploy_function "send-prayer-reminders" ""
        echo "💡 Daily invoke: Supabase pg_cron (invoke-send-prayer-reminders, 10:00 UTC) + Vault (project_url + service_role_key). See docs/SETUP.md."
        echo "💡 Next steps:"
        echo "   1. Configure reminder interval in Admin Settings"
        echo "   2. Test with 'Send Reminders Now' button"
        ;;
    "send-user-hourly-prayer-reminders")
        deploy_function "send-user-hourly-prayer-reminders" ""
        echo "💡 Hourly invoke: Supabase pg_cron + Vault (project_url + service_role_key); set APP_URL on the function. See docs/SETUP.md."
        ;;
    "cleanup-device-tokens")
        deploy_function "cleanup-device-tokens" ""
        echo "💡 Daily invoke: Supabase pg_cron (invoke-cleanup-device-tokens, 03:00 UTC) + Vault. See docs/SETUP.md."
        ;;
    "send-verification-code")
        deploy_function "send-verification-code" "--no-verify-jwt"
        echo "💡 Remember: send-verification-code runs without JWT verification"
        echo "   This is for email verification before prayer/preference submissions"
        echo ""
        echo "📋 Required environment variables:"
        echo "   - RESEND_API_KEY"
        echo "   - RESEND_FROM_EMAIL"
        echo "   - SUPABASE_URL"
        echo "   - SUPABASE_SERVICE_ROLE_KEY"
        ;;
    "all")
        echo "Deploying all functions..."
        echo ""
        deploy_function "send-notification" "--no-verify-jwt"
        deploy_function "send-verification-code" "--no-verify-jwt"
        deploy_function "send-prayer-reminders" ""
        deploy_function "send-user-hourly-prayer-reminders" ""
        deploy_function "cleanup-device-tokens" ""
        echo "🎉 All functions deployed successfully!"
        ;;
    *)
        echo "❌ Unknown function: $FUNCTION_NAME"
        echo ""
        echo "Usage: ./deploy-functions.sh [function-name]"
        echo ""
        echo "Available functions:"
        echo "  send-notification        - Email sending (no JWT)"
        echo "  send-verification-code   - Email verification codes (no JWT)"
        echo "  send-prayer-reminders    - Automated prayer reminders"
        echo "  send-user-hourly-prayer-reminders - User hourly self-reminders (cron)"
        echo "  cleanup-device-tokens    - Stale device tokens + push log cleanup (cron)"
        echo "  all                      - Deploy all functions (default)"
        echo ""
        exit 1
        ;;
esac

echo ""
echo "✨ Deployment complete!"
echo ""
