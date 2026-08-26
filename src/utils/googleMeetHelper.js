const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', '..', 'config', 'google_tokens.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/admin/lms';

function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

function isAuthorized() {
  try {
    if (!fs.existsSync(TOKEN_PATH)) return false;
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    if (!tokens || !tokens.refresh_token) return false;
    const auth = getOAuth2Client();
    auth.setCredentials(tokens);
    return true;
  } catch {
    return false;
  }
}

function getAuthUrl() {
  const auth = getOAuth2Client();
  return auth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

async function saveTokens(code) {
  const auth = getOAuth2Client();
  const { tokens } = await auth.getToken(code);
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  auth.setCredentials(tokens);
  return tokens;
}

function loadAuth() {
  const auth = getOAuth2Client();
  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    auth.setCredentials(tokens);
  }
  return auth;
}

async function createMeetLink({ title, agenda, date, startTime, endTime }) {
  const auth = loadAuth();
  const calendar = google.calendar({ version: 'v3', auth });

  const startDT = combineDateTime(date, startTime);
  const endDT = combineDateTime(date, endTime);

  const event = {
    summary: title || 'FTI Live Class',
    description: agenda || '',
    start: { dateTime: startDT, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endDT, timeZone: 'Asia/Kolkata' },
    conferenceData: {
      createRequest: {
        requestId: 'fti-' + Date.now(),
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1
  });

  return response.data.hangoutLink;
}

function unlinkAuth() {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
}

function combineDateTime(dateStr, timeStr) {
  const d = new Date(dateStr);
  const clean = timeStr.trim().toUpperCase();

  let hours = 0;
  let minutes = 0;

  if (clean.includes('AM') || clean.includes('PM')) {
    const parts = clean.replace(/AM|PM/g, '').trim().split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    if (clean.includes('PM') && hours < 12) hours += 12;
    if (clean.includes('AM') && hours === 12) hours = 0;
  } else {
    const parts = clean.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  }

  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

module.exports = { isAuthorized, getAuthUrl, saveTokens, createMeetLink, unlinkAuth };
