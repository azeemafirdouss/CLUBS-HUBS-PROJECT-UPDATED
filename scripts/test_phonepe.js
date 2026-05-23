const path = require('path');
const crypto = require('crypto');
const https = require('https');
require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGMERCHANTIDUAT';
const saltKey = process.env.PHONEPE_SALT_KEY || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399';
const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
const phonepeApiUrl = process.env.PHONEPE_API_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

console.log("--------------------------------------------------");
console.log("PhonePe Gateway Connection Verification Test");
console.log("--------------------------------------------------");
console.log(`Merchant ID: ${merchantId}`);
console.log(`API URL: ${phonepeApiUrl}`);
console.log(`Base Redirect URL: ${baseUrl}`);
console.log("--------------------------------------------------");

function phonepeRequest(url, method, headers, requestBody = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: method.toUpperCase(),
            headers: headers
        };

        if (requestBody && method.toUpperCase() === 'POST') {
            options.headers['Content-Length'] = Buffer.byteLength(requestBody);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    reject(new Error(`Failed to parse PhonePe response: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (requestBody && method.toUpperCase() === 'POST') {
            req.write(requestBody);
        }
        req.end();
    });
}

async function runTest() {
    try {
        const merchantTransactionId = 'TEST' + Date.now() + Math.floor(Math.random() * 1000);
        const amountInPaise = 500 * 100; // Rs. 500

        const payload = {
            merchantId: merchantId,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: 'TEST_USER_123',
            amount: amountInPaise,
            redirectUrl: `${baseUrl}/api/payment-callback?transactionId=${merchantTransactionId}`,
            redirectMode: "POST",
            callbackUrl: `https://webhook.site/placeholder-for-phonepe-webhook`,
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        const jsonString = JSON.stringify(payload);
        const base64Payload = Buffer.from(jsonString).toString('base64');

        // Checksum formula: SHA256(Base64 payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex
        const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const checksum = sha256 + "###" + saltIndex;

        console.log("1. Calculated Base64 Payload & SHA256 Checksum...");
        console.log(`Checksum: ${checksum}`);

        console.log("2. Sending POST Request to PhonePe UAT Pay API...");
        const url = `${phonepeApiUrl}/pg/v1/pay`;
        const headers = {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'accept': 'application/json'
        };
        const requestBody = JSON.stringify({ request: base64Payload });

        const phonepeRes = await phonepeRequest(url, 'POST', headers, requestBody);
        
        console.log(`Response Status Code: ${phonepeRes.status}`);
        console.log("Response Body:", JSON.stringify(phonepeRes.data, null, 2));

        if (phonepeRes.status === 200 && phonepeRes.data.success) {
            console.log("\n==============================================");
            console.log("✅ PHONEPE SANDBOX CONNECTION SUCCESSFUL!");
            console.log(`Redirect URL: ${phonepeRes.data.data.instrumentResponse.redirectInfo.url}`);
            console.log("==============================================");
        } else {
            console.log("\n==============================================");
            console.log("❌ PHONEPE SANDBOX CONNECTION FAILED.");
            console.log("==============================================");
        }

    } catch (err) {
        console.error("\n❌ Test encountered an error:", err);
    }
}

runTest();
