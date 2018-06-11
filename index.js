"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const restService = express();


// Google Calendar
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'credentials.json';


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @return {function} if error in reading credentials.json asks for a new one.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    let token = {};
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    try {
        token = fs.readFileSync(TOKEN_PATH);
    } catch (err) {
        return getAccessToken(oAuth2Client, callback);
    }
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
    oAuth2Client.getToken(code, (err, token) => {
        if(err) return callback(err);
    oAuth2Client.setCredentials(token);
    // Store the token to disk for later program executions
    try {
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        console.log('Token stored to', TOKEN_PATH);
    } catch (err) {
        console.error(err);
    }
    callback(oAuth2Client);
});
});
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
    const calendar = google.calendar({version: 'v3', auth});
    calendar.events.list({
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    }, (err, {data}) => {
        if(err) return console.log('The API returned an error: ' + err);
    const events = data.items;
    if (events.length) {
        console.log('Upcoming 10 events:');
        events.map((event, i) => {
            const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
    });
    } else {
        console.log('No upcoming events found.');
    }
})
    ;
}

// End of Google Calendar


restService.use(
    bodyParser.urlencoded({
        extended: true
    })
);

restService.use(bodyParser.json());

restService.post("/echo", function (req, res) {
    var speech =
        req.body.result &&
        req.body.result.parameters &&
        req.body.result.parameters.echoText
            ? req.body.result.parameters.echoText
            : "Seems like some problem. Speak again.";
    return res.json({
        speech: speech,
        displayText: speech,
        fulfillmentText: speech,
        source: "webhook-echo-sample",
        message: {
            speech: speech
        }
    });
});

restService.post("/echo2", function (req, res) {
  // var speech = req.body.inputs && req.body.inputs[0].arguments && req.body.inputs[0].arguments[0].textValue ? req.body.inputs[0].arguments[0].textValue : 'your answer';
  // if (speech == 'bonjour') {
  //     return res.json({fulfillmentText: speech + ' is correct. That\'s it for today'});
  // } else {
  //     return res.json({fulfillmentText: speech + ' is not correct. The correct answer was bonjour.'});
  // }
  var parameters = req.body.queryResult.parameters;
  var dateParam = parameters.date;
  var timeParam = parameters.time;
  console.log('parameters: ' + parameters);
  console.log('dateParam: ' + dateParam);
  console.log('timeParam: ' + timeParam);
  return res.json({fulfillmentText: 'This is a sample response from your webhook!'});
});

restService.post("/makeAppointment", function (req, res) {
    // Load client secrets from a local file.
    try {
        const content = fs.readFileSync('client_secret.json');
        var parameters = req.body.queryResult.parameters;
        var timeParam = parameters.date;
        console.log('timeParam: ' + timeParam);

        authorize(JSON.parse(content), function (auth) {
          var event = {
              'summary': 'Google I/O 2015',
              'description': 'A chance to hear more about Google\'s developer products.',
              'start': {
                  'dateTime': '2018-05-28T09:00:00-07:00',
                  'timeZone': 'America/Los_Angeles',
              },
              'end': {
                  'dateTime': '2018-05-28T17:00:00-07:00',
                  'timeZone': 'America/Los_Angeles',
              },
              'attendees': [
                  {'email': 'verheye.francesco@gmail.com'}
              ],
              'reminders': {
                  'useDefault': false,
                  'overrides': [
                      {'method': 'email', 'minutes': 24 * 60},
                      {'method': 'popup', 'minutes': 10},
                  ],
              },
          };

          console.log('event before setting dateTime ' + event);
          event.start.dateTime = timeParam;
          event.end.endTime = '2018-06-12T16:00:00+02:00';
          console.log('event after setting dateTime ' + event);
          

          const calendar = google.calendar({version: 'v3', auth});
          calendar.events.insert({
              auth: auth,
              calendarId: 'primary',
              resource: event,
          }, function (err, event) {
              if (err) {
                  console.log('Er is een fout opgetreden bij het aanmaken van uw afspraak: ' + err);
                  return res.json({fulfillmentText: 'Something went wrong.'});
              }
              console.log('Event created: %s', event.htmlLink);
              return res.json({fulfillmentText: 'Klaar! Uw afspraak is gepland in de agenda.'});
          });

        });
      } catch(err){
        return console.log('Error loading client secret file:', err);
      };
});

restService.post("/audio", function (req, res) {
    var speech = "";
    switch (req.body.result.parameters.AudioSample.toLowerCase()) {
        //Speech Synthesis Markup Language
        case "music one":
            speech =
                '<speak><audio src="https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg">did not get your audio file</audio></speak>';
            break;
        case "music two":
            speech =
                '<speak><audio clipBegin="1s" clipEnd="3s" src="https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg">did not get your audio file</audio></speak>';
            break;
        case "music three":
            speech =
                '<speak><audio repeatCount="2" soundLevel="-15db" src="https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg">did not get your audio file</audio></speak>';
            break;
        case "music four":
            speech =
                '<speak><audio speed="200%" src="https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg">did not get your audio file</audio></speak>';
            break;
        case "music five":
            speech =
                '<audio src="https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg">did not get your audio file</audio>';
            break;
        case "delay":
            speech =
                '<speak>Let me take a break for 3 seconds. <break time="3s"/> I am back again.</speak>';
            break;
        //https://www.w3.org/TR/speech-synthesis/#S3.2.3
        case "cardinal":
            speech = '<speak><say-as interpret-as="cardinal">12345</say-as></speak>';
            break;
        case "ordinal":
            speech =
                '<speak>I stood <say-as interpret-as="ordinal">10</say-as> in the class exams.</speak>';
            break;
        case "characters":
            speech =
                '<speak>Hello is spelled as <say-as interpret-as="characters">Hello</say-as></speak>';
            break;
        case "fraction":
            speech =
                '<speak>Rather than saying 24+3/4, I should say <say-as interpret-as="fraction">24+3/4</say-as></speak>';
            break;
        case "bleep":
            speech =
                '<speak>I do not want to say <say-as interpret-as="bleep">F&%$#</say-as> word</speak>';
            break;
        case "unit":
            speech =
                '<speak>This road is <say-as interpret-as="unit">50 foot</say-as> wide</speak>';
            break;
        case "verbatim":
            speech =
                '<speak>You spell HELLO as <say-as interpret-as="verbatim">hello</say-as></speak>';
            break;
        case "date one":
            speech =
                '<speak>Today is <say-as interpret-as="date" format="yyyymmdd" detail="1">2017-12-16</say-as></speak>';
            break;
        case "date two":
            speech =
                '<speak>Today is <say-as interpret-as="date" format="dm" detail="1">16-12</say-as></speak>';
            break;
        case "date three":
            speech =
                '<speak>Today is <say-as interpret-as="date" format="dmy" detail="1">16-12-2017</say-as></speak>';
            break;
        case "time":
            speech =
                '<speak>It is <say-as interpret-as="time" format="hms12">2:30pm</say-as> now</speak>';
            break;
        case "telephone one":
            speech =
                '<speak><say-as interpret-as="telephone" format="91">09012345678</say-as> </speak>';
            break;
        case "telephone two":
            speech =
                '<speak><say-as interpret-as="telephone" format="1">(781) 771-7777</say-as> </speak>';
            break;
        // https://www.w3.org/TR/2005/NOTE-ssml-sayas-20050526/#S3.3
        case "alternate":
            speech =
                '<speak>IPL stands for <sub alias="indian premier league">IPL</sub></speak>';
            break;
    }
    return res.json({
        speech: speech,
        displayText: speech,
        source: "webhook-echo-sample"
    });
});

restService.post("/video", function (req, res) {
    return res.json({
        speech:
            '<speak>  <audio src="https://www.youtube.com/watch?v=VX7SSnvpj-8">did not get your MP3 audio file</audio></speak>',
        displayText:
            '<speak>  <audio src="https://www.youtube.com/watch?v=VX7SSnvpj-8">did not get your MP3 audio file</audio></speak>',
        source: "webhook-echo-sample"
    });
});

restService.post("/slack-test", function (req, res) {
    var slack_message = {
        text: "Details of JIRA board for Browse and Commerce",
        attachments: [
            {
                title: "JIRA Board",
                title_link: "http://www.google.com",
                color: "#36a64f",

                fields: [
                    {
                        title: "Epic Count",
                        value: "50",
                        short: "false"
                    },
                    {
                        title: "Story Count",
                        value: "40",
                        short: "false"
                    }
                ],

                thumb_url:
                    "https://stiltsoft.com/blog/wp-content/uploads/2016/01/5.jira_.png"
            },
            {
                title: "Story status count",
                title_link: "http://www.google.com",
                color: "#f49e42",

                fields: [
                    {
                        title: "Not started",
                        value: "50",
                        short: "false"
                    },
                    {
                        title: "Development",
                        value: "40",
                        short: "false"
                    },
                    {
                        title: "Development",
                        value: "40",
                        short: "false"
                    },
                    {
                        title: "Development",
                        value: "40",
                        short: "false"
                    }
                ]
            }
        ]
    };
    return res.json({
        speech: "speech",
        displayText: "speech",
        source: "webhook-echo-sample",
        data: {
            slack: slack_message
        }
    });
});

restService.listen(process.env.PORT || 8000, function () {
    console.log("Server up and listening");
});
