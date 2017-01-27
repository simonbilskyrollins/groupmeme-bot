# GroupMeme Bot [![Build Status](https://travis-ci.org/simonbilskyrollins/groupmeme-bot.svg?branch=master)](https://travis-ci.org/simonbilskyrollins/groupmeme-bot)

## Introduction

GroupMeme bot is a GroupMe bot running on a Node JS callback server that specializes in posting the best memes to the chat he lives in.
The project is based on the [sample Node JS callback bot](https://github.com/groupme/bot-tutorial-nodejs) provided by GroupMe, which is a great place to get started if you want to set up a similar bot of your own.

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

To test locally, open terminal and run the following command to start a local server.

    $ foreman start

Then navigate to `http://127.0.0.1:5000/` in a browser. Note: you may need to install the [Heroku Toolbelt](https://devcenter.heroku.com/articles/heroku-cli) for the `foreman` command to work.

To simulate a message being sent to the group, make a new `message.json` file with the following contents:


    {
      "name": "Test Sender",
      "text": "I would like a meme"
    }

Then post the message to the server by running `curl -X POST -d @message.json http://localhost:5000`.

# Contributing

To contribute to the bot, either clone the `develop` branch: `git clone -b develop https://github.com/simonbilskyrollins/groupmeme-bot.git` or fork the entire project.

Once you've committed all your changes, push them and make a pull request to master.
