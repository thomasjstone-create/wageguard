const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 3000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

if (!accountSid || !authToken || !messagingServiceSid) {
  console.error('Missing Twilio environment variables. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID.');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const otpStore = new Map();

function generateOtp() {
  return String(Math.floor(Math.random() * 9000) + 1000);
}

app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const otp = generateOtp();
  otpStore.set(phone, otp);

  try {
    await client.messages.create({
      to: phone,
      messagingServiceSid,
      body: `Your verification code is ${otp}`
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('Twilio send-otp error:', error);
    otpStore.delete(phone);
    return res.status(500).json({ error: 'Unable to send verification code' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code || typeof phone !== 'string' || typeof code !== 'string') {
    return res.status(400).json({ error: 'Phone and code are required' });
  }

  const storedOtp = otpStore.get(phone);
  if (!storedOtp) {
    return res.status(400).json({ error: 'No verification code was sent for this number' });
  }
  if (storedOtp !== code) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  otpStore.delete(phone);
  return res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Twilio OTP server listening on port ${port}`);
});
