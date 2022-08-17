import fullFS from 'fs';
import readline from 'readline';
import { google } from 'googleapis';
import opener from "opener";

const fs = fullFS.promises;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

export default class GCalendarProxy {
  constructor() {
  }

  async init() {
    // Load client secrets from a local file.
    try {
      let content = await fs.readFile('credentials.json');
      content = Buffer.from(content).toString();
      // Uncomment for verbose logging
      // console.log("Found content:", content);

      // Authorize a client with credentials, then call the Google Calendar API.
      await this.authorize(JSON.parse(content));
    } catch (err) {
      console.error('Error loading credentials file:', err);
    }
  }

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   */
  async authorize(credentials) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    try {
      let token = await fs.readFile(TOKEN_PATH);
      token = Buffer.from(token).toString();
      // Uncomment for verbose logging
      // console.log("Found token:", token);
      oAuth2Client.setCredentials(JSON.parse(token));
      this.auth = oAuth2Client;
    } catch (err) {
      console.log("Couldn't set auth because:", err);
      await this.getAccessToken(oAuth2Client);
    }
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   */
  async getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log("Opening this URL:", authUrl);
    console.log("");
    opener(authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let code = await new Promise(resolve => rl.question('Enter the code from that page here: ', resolve));
    // Uncomment for verbose logging
    // console.log("Received code:", code);
    rl.close();
    try {
      const token = (await oAuth2Client.getToken(code)).tokens;
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      await fs.writeFile(TOKEN_PATH, JSON.stringify(token));
      console.log('Token stored to', TOKEN_PATH);
      this.auth = oAuth2Client;
    } catch (err) {
      console.error('Error retrieving access token', err);
    }
  }


  /**
   * Lists the next 10 events on the user's primary calendar.
   * @param maxResults {number} The number of results to return
   */
  async listEvents(maxResults = 10) {
    try {
      const calendar = google.calendar({version: 'v3', auth: this.auth});
      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });
      const events = res.data.items;
      const returnEvents = [];
      if (events.length) {
        // Uncomment for verbose logging
        // console.log(`Upcoming ${maxResults} events:`);
        events.map((event) => {
          returnEvents.push({
            id: event.id,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            summary: event.summary,
            meetingLocation: this.getZoomLocation(event),
          });
          // Uncomment for verbose debugging
          //console.log("Found Event:", event);
        });
      } else {
        console.log('No upcoming events found.');
      }
      return returnEvents;
    } catch (err) {
      console.log('The API returned an error: ' + err);
      return [];
    }
  }

  getZoomLocation(event) {
    if (event.conferenceData?.entryPoints) {
      return event.conferenceData.entryPoints[0].uri;
    } else {
      const urlFromLocation = this.findURL(event.location);
      if (urlFromLocation) {
        return urlFromLocation;
      }

      return this.findURL(event.description);
    }
  }

  findURL(someString) {
    const urlRegex = /(https?:\/\/[^\s"]+)/gi;
    const match = someString?.match(urlRegex);
    return match && match[0];
  }
}
