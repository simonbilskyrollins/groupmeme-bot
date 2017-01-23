# GroupMeme Bot [![Build Status](https://travis-ci.org/simonbilskyrollins/groupmeme-bot.svg?branch=master)](https://travis-ci.org/simonbilskyrollins/groupmeme-bot)

## Introduction

GroupMeme bot is a GroupMe bot running on a Node JS callback server that specializes in posting the best memes to the chat he lives in.
The project is based on the [sample Node JS callback bot](https://github.com/groupme/bot-tutorial-nodejs) provided by GroupMe, which is a great place to get started if you want to set up a similar bot of your own.

# Get your bot up and running<a name="deploy"></a>

## Find your Bot ID

Go here to view all of your bots:
https://dev.groupme.com/bots

Copy the Bot ID. Then go to your Heroku app's settings and configure a new environment variable called `BOT_ID` and paste your bot ID there.

On your computer, run `cp .sample-env .env` to create your own local configuration file and change the `BOT_ID` value to your bot ID.

## Connect to the Reddit API

If you want to be able to pull memes from Reddit, you will need to log into Reddit and create an app. Then you can put the appropriate values in your `.env` file and also create new environment variables of the same name in your Heroku deployment.

## Start the server

To test locally, open terminal and run the following command to start a local server.

    $ foreman start

Then navigate to `http://127.0.0.1:5000/` in a browser.
