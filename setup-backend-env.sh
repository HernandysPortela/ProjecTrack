#!/bin/bash

# Backend Environment Variables Setup Script
# Generated from Vly for Git Sync
# Run this script to set up your Convex backend environment variables

echo 'Setting up Convex backend environment variables...'

# Check if Convex CLI is installed
if ! command -v npx &> /dev/null; then
    echo 'Error: npx is not installed. Please install Node.js and npm first.'
    exit 1
fi

echo "Setting GMAIL_PASS..."
npx convex env set "GMAIL_PASS" -- "pzioyiguwiyjcufc"

echo "Setting GMAIL_USER..."
npx convex env set "GMAIL_USER" -- "projectrak3@gmail.com"

echo "Setting JWKS..."
npx convex env set "JWKS" -- "{\"keys\":[{\"use\":\"sig\",\"kty\":\"RSA\",\"n\":\"qSJKKBEGBCX8EXJ5YB5GcJZqcYfEmLNgWS-jFeKiKt9_VvIh4WM1YIv7HhCtM-Jn_imPCMi4-VtLRqNHv4iAcYTyzIMOtxfvfsICxc9eXa1-nKyf38KGlOWnq6H9V1q0J7xzyTV549yoZcBUWsYtRPDEGXoOwARW3wyZOyO0kyUxLi5rAPDNFxeshfKOsUaTAjkntsLDhI9WF7qoOpEmiqpV7nIO7ikwmE_40QiLTPEZv1nHNfsU5NJ5c1HqS1QRqo5OMm_7nKShdqF-V8xjREOjtGE-4q-xGoxnDbynj1il_xV1-KHlUximlJsEtQmXSQW8sOYcqJFJyeh4UybBJQ\",\"e\":\"AQAB\"}]}"

echo "Setting JWT_PRIVATE_KEY..."
npx convex env set "JWT_PRIVATE_KEY" -- "-----BEGIN PRIVATE KEY----- MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCpIkooEQYEJfwR cnlgHkZwlmpxh8SYs2BZL6MV4qIq339W8iHhYzVgi/seEK0z4mf+KY8IyLj5W0tG o0e/iIBxhPLMgw63F+9+wgLFz15drX6crJ/fwoaU5aerof1XWrQnvHPJNXnj3Khl wFRaxi1E8MQZeg7ABFbfDJk7I7STJTEuLmsA8M0XF6yF8o6xRpMCOSe2wsOEj1YX uqg6kSaKqlXucg7uKTCYT/jRCItM8Rm/Wcc1+xTk0nlzUepLVBGqjk4yb/ucpKF2 oX5XzGNEQ6O0YT7ir7EajGcNvKePWKX/FXX4oeVTGKaUmwS1CZdJBbyw5hyokUnJ 6HhTJsElAgMBAAECggEADO+a9WKL78BJ/bmgL+pQ3+aZQJKuRjGeAmRC2HcriRTs A+XkEn2IhRhfvgZvgOLlqkpabsUPZL8HTGFLqQoTLNuKyHqTowxZHHxRQvjf0lFl OC150t7pdTT1dIqgulAtLEbdIjwNVRC47oNd0E2NA9NYZExyGVybmla3146dDo3v D85tuL22Fc57gGq0Y1wiW9LjF0qaxqOh6hBggZkuKBDpZpAsK3UkFygr0poEsiAg aPLRTvLpi7SdotUgnEPwp/KP4E2+SpRUjw58RrD8PyHQHAAUIaoovvXXpdCGzTik XdQlYFm2KdZc0We/EohnTETtu9d8mCapy/yLUmG60QKBgQDtdnpWBuoXo+jDdI+z 9P2gJCITWAGJ2LTzEkWDXA4DC8lTGG3UAZEGlrWmCQTptYq36V0W+RautuYi08uU iSISxjkqspIAjF8ls7OL2w6PcySSBwghokrtSDrhj3jNBJlKBlfdxwFX5RZrjLO6 KodMeHdXaXIcheC4zGkb0LSvOQKBgQC2Vk8cTAAuLxmzHXrRO5Thz8B3G/5HXywz sVomEhX1Y+jGmPSxOgEQbenyNxQ9dO9oSu5Zeliw6u8AkaUo+T+pWf33nBQWRMR+ RQ86uFRdwdkC0xtCSsWgzi1UyaoYMvuLI2+5aqUY4VQkhRQVLodoepcG1SRbRFvX DcWsFYF1TQKBgE4azhpFo/GqpADF8g5K4rEtsVeTds4UTVA2Dk8qlCFEWy/NtTIq Yb09DPpTtR357GqZg1jvDRriZcfGygtNH7v1HxCAM62ifhk0hjXWE2/ze2/ciDwn 2WU6gMN4IU+t142VkIkNz89NNpahbOwq2N26Mea6dCIVltixw1C20PdhAoGAG9mO 98l79ZHoIP2Ntsuc7+ilgwvZiNk2jSa3mD0G8ZYzBbJzHWa4puPC6eYTx1dHAez/ /ta7GTqpCrM0QM/hM2K1cc57GvOh949gxh1FdZSYKuBHt5ZoHSmgruSmgE+5MAVX mUB6uxQfn/xbluimcgTXcIm5pd8JEA3gdWpLfbkCgYEAuTeagRj4d7lhkBygs/7P XzzdGdhaxEYL1LmfOK6GN2NqyPJTfCJP+SmyZc5cNcVmtGo5G2438PY8MhtOjkrr Zzf7eLSsUdSEIX56jh37Rdu2Mh5SeEdsRTa9fUlou3KTy4hbzTvlQ3th4lEdDbXc 2T4JccI6vQY1Lh9GLOu1Iwg"

echo "Setting RESEND_API_KEY..."
npx convex env set "RESEND_API_KEY" -- "re_EAAe5m5Z_ACijxLpEojuaPD2DS9ehBA3j"

echo "Setting SITE_URL..."
npx convex env set "SITE_URL" -- "https://chubby-signs-accept.vly.sh"

echo "Setting VLY_APP_NAME..."
npx convex env set "VLY_APP_NAME" -- "ProjecTrak"

echo "Setting re_aDHYzhok_6UnzAQNTswTNhdu1GJMTwCNp..."
npx convex env set "re_aDHYzhok_6UnzAQNTswTNhdu1GJMTwCNp" -- "re_EAAe5m5Z_ACijxLpEojuaPD2DS9ehBA3j"

echo "✅ All backend environment variables have been set!"
echo "You can now run: pnpm dev:backend"
