Intro
----------
I'm sick of being late for meetings because my brain can't keep track of the time. So I made this program that sits
in the tray and causes the default browser to open the Zoom link at the start of the meeting time. It also shows
the next 10 meetings and if you click on them, it'll open the link early for you.

Install
----------
You'll have to start with Node 10.x or higher. Pull these files and then:
```shell
npm install
npm start
```

Initial Setup
----------
The first time you run the program, it open your browser and ask you to giver permission to access your Google Calendar. 
After accepting it, it will redirect to localhost and go to a URL like:
```
http://localhost:3000/?code=4/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&scope=https://www.googleapis.com/auth/calendar.readonly
```
The code you need to provide on the command line is the value for the `code` query parameter in the URL.

After Expiration
----------
If you've been using this program for a year or more, you might find your token expired. If that happens, it won't load your 
Google Calendar anymore and you'll have to re-authenticate. Just delete the `token.json` file and run the program again:
```shell
del token.json
npm start
```
