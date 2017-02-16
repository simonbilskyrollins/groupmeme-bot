# GroupMeme Bot [![Build Status](https://travis-ci.org/simonbilskyrollins/groupmeme-bot.svg?branch=master)](https://travis-ci.org/simonbilskyrollins/groupmeme-bot) [![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

## Introduction

GroupMeme bot is a GroupMe bot running on a Node JS callback server that specializes in posting the best memes to the chat he lives in.

The project is based on the [sample Node JS callback bot](https://github.com/groupme/bot-tutorial-nodejs) provided by GroupMe, which is a great place to get started if you want to set up a similar bot of your own.

I gave [a presentation](https://github.com/simonbilskyrollins/groupme-bot-workshop) about Beep Boop to Carleton DevX in February 2017. [View the repository as it was at the time of the presentation](https://github.com/simonbilskyrollins/groupmeme-bot/tree/2ce3d09b886478c554b9be8a3b63293cac6ed260).

# Get your bot up and running

## Find your Bot ID

Go here to view all of your bots:
https://dev.groupme.com/bots

Copy the Bot ID. Then go to your Heroku app's settings and configure a new environment variable called `BOT_ID` and paste your bot ID there.

On your computer, run `cp .sample-env .env` to create your own local configuration file and change the `BOT_ID` value to your bot ID.

## Connect to the Reddit API

If you want to be able to pull memes from Reddit, you will need to log into Reddit and create an app. Then you will need to give the app permission to access your account. Teddy Katz's [utility](https://github.com/not-an-aardvark/reddit-oauth-helper) that you can install with `npm install -g reddit-oauth-helper` is a good way to set everything up.

Now you can put the appropriate values in your `.env` file and also create new environment variables of the same name in your Heroku deployment.

## Start the server

To test locally, you will first need to download and install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli). Then, open terminal and run the following command to start a local server.

    $ heroku local

Then navigate to `http://127.0.0.1:5000/` in a browser.

To simulate a message being sent to the group, make a new `message.json` file with the following contents:

    {
      "name": "Test Sender",
      "text": "I would like a meme"
    }

Then post the message to the server by running `curl -H "Accept: application/json" -H "Content-Type: application/json" -d @message.json http://localhost:5000`.

# Contributing

To contribute to the bot, either clone the `develop` branch: `git clone -b develop https://github.com/simonbilskyrollins/groupmeme-bot.git` or fork the entire project.

Once you've committed all your changes, push them and make a pull request to master.
