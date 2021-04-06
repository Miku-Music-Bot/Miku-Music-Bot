const Discord = require('discord.js')
const ytdl = require('ytdl-core')
const ytsr = require('ytsr')
const fs = require('fs')
const mm = require('music-metadata')
const events = require('events')
const client = new Discord.Client()
const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg')
const {PassThrough} = require('stream')

ffmpeg.setFfmpegPath(ffmpegPath.path) // set path for ffmpeg

var settings = require('./config.json')
var finishSong = false  // stop after current song or not
var finishQueue = false // stop after finishing youtube queue or not
var autoplay = true     // play songs from autoplay or not
var repeatSong = 0      // how many times to repeat song

var queue = []          // queue for youtube
var autoplayQueue = []  // queue for autoplay
var autoplayList = []   // non randomized list of files in autoplay folder
var nowPlaying          // data for currently playing song
var progressUpdate      // updater for progressBar
var paused = false      // paused or not

var voiceChannel        // currently connected voice channel id
var connection          // connection for voice channel
var dispatcher          // dispatcher for playing audio
var channel             // text channel for bot to listen on


function autoplayInit () {  // reads through all files in autoplay folder, randomizes their order, and adds them to autoplayQueue
  return new Promise((resolve) => {
    let list = []           // temporary storage
    autoplayList = []
    fs.readdir('./autoplay/', async function (err, files) { // read files in autoplay folder
      if (err) throw err
      for (let i = 0; i < files.length; i++) {              // parse each file for metadata using music-metadata
        await mm.parseFile('./autoplay/' + files[i]).then(function (metadata) {
          const min = Math.floor(Math.floor(metadata.format.duration) / 60)  // calculate string for duration
          let sec
          if (Math.floor(metadata.format.duration) % 60 < 10) {
            sec = '0' + Math.floor(metadata.format.duration) % 60
          } else {
            sec = Math.floor(metadata.format.duration) % 60
          }
          const duration = min + ':' + sec

          const data = {      // data for each file
            fileName: files[i],
            title: metadata.common.title,
            duration: duration,
            artist: metadata.common.artist,
            id: 'Autoplay'
          }
          list.push(data)    // add data to list and autoplayList
          autoplayList.push(data)
        })
      }

      for (let i = list.length - 1; i > -1; i--) {
        const j = Math.floor(Math.random() * i)
        const temp = list[i]
        list[i] = list[j]
        list[j] = temp
      }
      for (let i = 0; i < list.length; i++) {
        autoplayQueue.push(list[i])
      }
      resolve(list)
    })
  })
}
autoplayInit()              // init autoplay when bot starts

function refreshAutoplay () { // update autoplayQueue and autoplayList based on what is in the autoplay folder
  return new Promise ((resolve) => {
    fs.readdir('./autoplay/', async function (err, files) {
      var temp = []           // create copy of autoplayList
      for (let i = 0; i < autoplayList.length; i++) { temp.push(autoplayList[i].fileName) }

      autoplayList = []       // update autoplayList
      for (let i = 0; i < files.length; i++) {
        await mm.parseFile('./autoplay/' + files[i]).then(function (metadata) {
          const min = Math.floor(Math.floor(metadata.format.duration) / 60)  // calculate string for duration
          let sec
          if (Math.floor(metadata.format.duration) % 60 < 10) {
            sec = '0' + Math.floor(metadata.format.duration) % 60
          } else {
            sec = Math.floor(metadata.format.duration) % 60
          }
          const duration = min + ':' + sec

          const data = {      // data for each file
            fileName: files[i],
            title: metadata.common.title,
            duration: duration,
            artist: metadata.common.artist,
            id: 'Autoplay'
          }
          autoplayList.push(data) // add data to autoplayList
        })
      }

      var i = 0                   // compare autoplayList and temp, stuff left in temp is stuff no longer in then folder, stuff left in files is new
      var j = 0
      while (i < temp.length) {
        while (j < files.length) {
          if (temp[i] === files[j]) {
            temp.splice(i, 1)
            files.splice(j, 1)
            i = -1
            j = files.length
          } else { j++ }
        }
        i++
        j = 0
      }
      for (let i = 0; i < temp.length; i++) {   // remove removed songs from autoplayQueue and queue
        for (let j = 0; j < autoplayQueue.length; j++) { if (autoplayQueue[j].fileName === temp[i]) { autoplayQueue.splice(j, 1) } }
        for (let j = 0; j < queue.length; j++) { if (queue[j].fileName === temp[i]) { queue.splice(j, 1) } }
      }
      resolve(temp)
    })
  })
}
setInterval(() => { refreshAutoplay() }, 60000)

var ui = new Promise((resolve) => { resolve({ deleted: true }) }) // ui object
const uiReact = new events.EventEmitter()
var uiResend = undefined
uiReact.on('react', (message) => {      // listener for reactions on ui
  const filter = (reaction, user) => { return user.id !== message.author.id } // filter out bot's reaction
  const collector = message.createReactionCollector(filter, { max: 1 })       // only look at 1 reaction at a time
  collector.on('collect', function (reaction, user) {
    const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id)) // try to delete users reaction
    try {
      for (const reaction of userReactions.values()) {
        reaction.users.remove(user.id);
      }
    } catch (error) {
      console.log('Failed to remove reactions from now playing message')
    }

    uiReact.emit('react', message) // start reaction listener again
    if (reaction.emoji.name === '⏯') {
      if (dispatcher) {
        if (paused) {
          dispatcher.resume()
          nowPlaying.total = nowPlaying.total + Date.now() - nowPlaying.pstart
          nowPlaying.pstart = undefined
        }
        else {
          nowPlaying.pstart = Date.now()
          dispatcher.pause(true)
        }
        paused = !paused
        sendUI()
      }                                       // play / pause player
    } else if (reaction.emoji.name === '⏹') { stop() }                        // stop the player
    else if (reaction.emoji.name === '⏭') {  if (dispatcher) { playNext() } } // play next song
    else if (reaction.emoji.name === '🔄') {                                   // add 1 to repeat if curretly playing
      if (nowPlaying) {
        repeatSong += 1
        sendUI()
      }
    }
  })
})

async function sendUI (newChannel) {  // calls createUI() for message object and send it to channel, sends UI to new channel if newChannel argument if given
  clearTimeout(uiResend)
  ui.then((message) => {
    uiResend = setTimeout(() => {     // resend UI once a week
      sendUI(channel)
    }, 604800000)
    if (!message.deleted && !newChannel) { message.edit(createUI()) } // if newChannel is not given and message is not deleted, edit the message with updated info
    else {                                                            // otherwise send new message
      if (!message.deleted) { message.delete() }
      ui = new Promise((resolve) => {
        channel.send(createUI()).then((message) => {
          uiReact.emit('react', message)
          message.react('⏯')          // create reactions
            .then(() => message.react('⏹'))
            .then(() => message.react('⏭'))
            .then(() => message.react('🔄'))
            .then(() => resolve(message))
            .catch(() => resolve(message))
        }).catch(() =>  resolve({ deleted: true }))
      })
    }
  })
}

function createUI () {                // creates message object for ui
  var newMessage = { embed: { color: 1426114 } }  // set color

  if (nowPlaying) {                               // if currently playing a song
    newMessage.embed.title = 'Now Playing - ' + nowPlaying.title      // set title to song title
    if (paused) { newMessage.embed.title = '[PAUSED] - ' + nowPlaying.title }   // change Now Playing to [PAUSED] if paused

    let queueMessage = ''
    for (let i = 0; i < 5; i++) {                // find next 5 songs in queue and add them to queueMessage
      if (i < queue.length && !finishSong) {
        queueMessage = queueMessage.concat('\n', i + 1, '. ', queue[i].title, ' -[', queue[i].id + ']')
      } else if (autoplay && i - queue.length < autoplayQueue.length && !finishQueue && !finishSong) {
        queueMessage = queueMessage.concat('\n', i + 1, '. ', autoplayQueue[i - queue.length].title, ' -[autoplay]')
      }
    }
    if (queueMessage === '') { queueMessage = 'Nothing in Queue' }  // if nothing, queue is empty

    let autoStop = 'Autostop is disabled'                           // set autoStop to correct message based on finishSong and finishQueue
    if (finishSong) { autoStop = 'Automatically stopping after this song' }
    if (finishQueue) { autoStop = 'Automatically stopping after finishing the queue' }

    let duration = nowPlaying.duration                              // set duration as duration unless song is live
    let progressBar = ''
    if (nowPlaying.isLive) {                                          // create progress bar
      duration = 'live'
      progressBar = 'LIVE'
    } else {
      var msduration = 0                                                // convert duration string to msec
      var temp = nowPlaying.duration.split(':')
      for (let i = temp.length; i > 0; i--) { msduration += parseInt(temp[i - 1]) * 1000 * 60**(temp.length - i) }

      var played = Date.now() - nowPlaying.start - nowPlaying.total
      if (paused) { played = nowPlaying.pstart - nowPlaying.start - nowPlaying.total }

      var timeToEnd = (msduration - played) / 1000
      var min = Math.floor(Math.floor(timeToEnd) / 60)              // calculate string for time to end
      let sec
      if (Math.floor(timeToEnd) % 60 < 10) { sec = '0' + Math.floor(timeToEnd) % 60 }
      else { sec = Math.floor(timeToEnd) % 60 }
      progressBar = progressBar.concat('-', min, ':', sec, ' [')

      for (let i = 0; i < 60; i++) {
        if (i === Math.floor((played / msduration) * 60)) { progressBar = progressBar.concat('|') }
        else { progressBar = progressBar.concat('-') }
      }

      progressBar = progressBar.concat('] ', nowPlaying.duration)
    }

    if (!nowPlaying.fileName) {                                     // if song is a youtube video
      newMessage.embed.thumbnail = { url: nowPlaying.bestThumbnail.url }        // set thumbnail to youtube thumbnail
      newMessage.embed.fields = [
        { name: 'Requested by', value: nowPlaying.id, inline: true },
        { name: 'Youtube Link', value: nowPlaying.url, inline: true }, // youtube link
        { name: 'Progress:', value: progressBar },
        { name: 'Queue:', value: queueMessage },
        { name: 'Autoplay', value: autoplay, inline: true},
        { name: 'Repeat', value: repeatSong + ' time(s)', inline: true},
        { name: 'Auto Stop', value: autoStop, inline: true}
      ]
    } else {                                                        // if song is a local file
      newMessage.embed.thumbnail = { url: settings.autoplayThumbnail } // set thumbnail to autoplay thumbnail
      newMessage.embed.fields = [
        { name: 'Requested by', value: nowPlaying.id, inline: true },
        { name: 'Artist', value: nowPlaying.artist, inline: true },           // set artist field instead of link
        { name: 'Progress:', value: progressBar },
        { name: 'Queue:', value: queueMessage },
        { name: 'Autoplay', value: autoplay, inline: true},
        { name: 'Repeat', value: repeatSong + ' time(s)', inline: true},
        { name: 'Auto Stop', value: autoStop, inline: true}
      ]
    }
  } else {                                        // if not currently playing a song, display idle message
    newMessage.embed.title = 'Listening for commands'
    newMessage.embed.thumbnail = { url: settings.idleThumbnail } // miku idle thumbnail
    newMessage.embed.description = 'Type "' + settings.prefix + 'help" for a list of avaliable commands'
    newMessage.embed.fields = [ { name: 'Autoplay', value: autoplay } ]
  }
  return newMessage         // return completed message object
}

var showQueueMessage = new Promise((resolve) => { resolve({ deleted: true }) }) // showQueueMessage object
var showQueuePage = 1             // current page showQueueMessage is displaying
var showQueueRequest = undefined  // who user message that requested showQueue
var showQueueTimeout = undefined  // timeout for deletetion
const showQueueReact = new events.EventEmitter()
showQueueReact.on('react', (message) => { // listener for reactions on showQueueMessage
  const filter = (reaction, user) => { return user.id !== message.author.id } // filter out bot's own reactions
  const collector = message.createReactionCollector(filter, { max: 1 })       // only look at 1 reaction at a time
  collector.on('collect', function (reaction, user) {                         // when reaction detected
    clearTimeout(showQueueTimeout)          // reset message deletion
    showQueueTimeout = setTimeout(function () { showQueueMessage.then((message) => { if (!message.deleted) { message.delete() } }) }, 60000)

    const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id)) // try to remove users reaction
    try {
      for (const reaction of userReactions.values()) {
        reaction.users.remove(user.id)
      }
    } catch (error) {
      console.log('Failed to remove reactions from now show queue message')
    }

    if (reaction.emoji.name === '❌') {        // delete message
      showQueueMessage.then((message) => { if (!message.deleted) { message.delete() } })
    } else if (reaction.emoji.name === '⬅') { // go back one page
      showQueueReact.emit('react', message)    // restart reaction listener
      if (showQueuePage > 1) { showQueuePage -= 1 }
      message.edit(createQueueMessage())
    } else if (reaction.emoji.name === '➡') { // go forward one page
      showQueueReact.emit('react', message)    // restart reaction listener
      if (showQueuePage < Math.ceil((autoplayQueue.length + queue.length) / 20)) { showQueuePage += 1 }
      message.edit(createQueueMessage())
    } else {
      showQueueReact.emit('react', message)   // restart reaction listener
    }
  })
})

function showQueue (request, page) {  // calls createQueueMessage() for message object and sends it to channel
  showQueuePage = page                // set global variables to input
  showQueueRequest = request

  clearTimeout(showQueueTimeout)      // clear timeout for deletion

  showQueueMessage.then((message) => {// send message
    showQueueTimeout = setTimeout(function () { showQueueMessage.then((message) => { if (!message.deleted) { message.delete() } }) }, 60000) // set timeout for deletion

    if (!message.deleted) { message.edit(createQueueMessage()) } // if message is not deleted, edit the message with updated info
    else {                                                       // otherwise, send new message
      showQueueMessage = new Promise(function (resolve) {
        channel.send(createQueueMessage()).then((message) => {
          showQueueReact.emit('react', message)
          message.react('⬅')                      // create reactions
            .then(() => message.react('➡'))
            .then(() => message.react('❌'))
            .then(() => resolve(message))
            .catch(() => resolve(message))
        }).catch(() => resolve(message))
      })
    }
  })
}

function createQueueMessage () {      // creates message object for showQueueMessage
  var newMessage = { embed: { title: 'Queue', color: 1426114 } } // set color and Title
  if (showQueuePage > Math.ceil((autoplayQueue.length + queue.length) / 20) && showQueuePage !== 1) { // if showQueuePage is greater than actual length, add error
    newMessage.embed.description = '<@!' + showQueueRequest.author.id + '> The queue is only ' + Math.ceil((autoplayQueue.length + queue.length) / 20) + ' pages long'
  } else {                                                                                            // otherwise, cycle through queue and autoplayQueue add and entries to message
    let queueMessage = ''
    for (let i = (showQueuePage - 1) * 20; i < showQueuePage * 20; i++) {
      if (i < queue.length && !finishSong) {
        queueMessage = queueMessage.concat('\n', i + 1, '. ', queue[i].title, ' [', queue[i].id, ']')
      } else if (autoplay && i - queue.length < autoplayQueue.length && !finishQueue) {
        queueMessage = queueMessage.concat('\n', i + 1, '. ', autoplayQueue[i - queue.length].title, ' [autoplay]')
      }
    }
    if (queueMessage === '') { queueMessage = 'Nothing in Queue' }        // if nothing in the message after cycling through queues, queue is empty

    newMessage.embed.description = queueMessage                           // add message to discord embed
    newMessage.embed.footer = { text: 'Showing page ' + showQueuePage + ' of ' + Math.ceil((autoplayQueue.length + queue.length) / 20) } // add footer
  }
  return newMessage       // return completed message object
}

var notification = new Promise (function (resolve) { resolve({ deleted: true }) } ) // notification object, shared btween sendError() and sendNotification()
var notificationTimeout = undefined
function sendError (text, textChannel) {        // sends error to selected text channel, defaults to channel variable if no text channel selected
  if (!textChannel) {                                   // if no text channel, similar to sendNotification(), just send usual error notification
    clearTimeout(notificationTimeout)           // delete message after 60 seconds
    setTimeout(() => { notification.then((message) => { if (!message.deleted) { message.delete() } }) }, 60000)

    notification.then((message) => {
      if (!message.deleted) { message.edit({ embed: { color: 13188374, description: text } }) } // if notification hasn't been deleted, edit the notification if new text
      else {
        notification = new Promise (function (resolve) {                                        // if deleted, create new message and send it
          channel.send({ embed: { color: 13188374, description: text } }).then((message) => {
            const filter = (reaction, user) => { return user.id !== message.author.id }
            const collector = message.createReactionCollector(filter, { max: 1 })
            collector.once('collect', function (reaction, user) {                       // create collector for reactions
              if (reaction.emoji.name === '❌') { notification.then((message) => { if (!message.deleted) { message.delete() } }) }
              else {
                const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id)) // try to delete users reaction
                try {
                  for (const reaction of userReactions.values()) {
                    reaction.users.remove(user.id);
                  }
                } catch (error) {
                  console.log('Failed to remove reactions from error message')
                }
              }
            })
            message.react('❌')                // create reaction
              .then(() => resolve(message))
              .catch(() => resolve(message))
          }).catch(() =>  resolve({ deleted: true }))
        })
      }
    })
  } else {                                      // special case for when first setting up bot, sends error to selected text channel, does not delete message after timeout, only on reaction
    textChannel.send({ embed: { color: 13188374, description: text } }).then((message) => {
      message.react('❌')                    // create reaction
      const filter = (reaction, user) => { return user.id !== message.author.id }
      const collector = message.createReactionCollector(filter, { max: 1 })
      collector.once('collect', function (reaction, user) {   // create collector for reaction
        if (reaction.emoji.name === '❌') { if (!message.deleted) { message.delete() } }
        else {
          const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id));
          try {
            for (const reaction of userReactions.values()) {
              reaction.users.remove(user.id);
            }
          } catch (error) {
            console.log('Failed to remove reactions from error message')
          }
        }
      })
    })
  }
}

function sendNotification (text) {              // sends a notification to the selected text channel, defaults to channel variable
  clearTimeout(notificationTimeout)             // delete message after 60 seconds
  setTimeout(() => { notification.then((message) => { if (!message.deleted) { message.delete() } }) }, 60000)

  notification.then((message) => {
    if (!message.deleted) { message.edit({ embed: { color: 7506394, description: text } }) } // if notification hasn't been deleted, edit the notification if new text
    else {
      notification = new Promise (function (resolve) {                                      // if deleted, create new message and send it
        channel.send({ embed: { color: 7506394, description: text } }).then((message) => {
          const filter = (reaction, user) => { return user.id !== message.author.id }
          const collector = message.createReactionCollector(filter, { max: 1 })
          collector.once('collect', function (reaction, user) {       // create collector for reaction
            if (reaction.emoji.name === '❌') { notification.then((message) => { if (!message.deleted) { message.delete() } }) }
            else {
              const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id)) // try to delete users reaction
              try {
                for (const reaction of userReactions.values()) {
                  reaction.users.remove(user.id);
                }
              } catch (error) {
                console.log('Failed to remove reactions from now notification')
              }
            }
          })
          message.react('❌')         // create reaction
            .then(() => resolve(message))
            .catch(() => resolve(message))
        }).catch(() =>  resolve({ deleted: true }))
      })
    }
  })
}

async function joinVoice (message) {  // joins voice channel, returns true if successful, false if not
  voiceChannel = message.member.voice.channel
  if (!voiceChannel) {                // check user is in a voice channel
    sendError('<@!' + message.author.id + '> Please join a voice channel to play music')
    return false
  } else {
    try {
      connection = await voiceChannel.join()
      sendNotification('Joined <@!' + message.author.id + '> in the voice channel named: ' + voiceChannel.name)
      return true
    } catch {
      sendError
    }
  }
}

function player (play) {              // takes in a song and determines how to play it and plays it
  clearTimeout(autostopTimeout)       // clear the autostop timeout since we are not inactive anymore
  clearTimeout(progressUpdate)        // clear the updater for progress
  const output = new PassThrough()    // pass through stream
  var stream = undefined

  if (play.fileName) { stream = fs.createReadStream('./autoplay/' + play.fileName) }
  else if (play.isLive) { stream = ytdl(play.url, { quality: [91, 92, 93, 94, 95] }) }
  else { stream = ytdl(play.url, { filter: format => format.contentLength, quality: 'highestaudio' }) }

  ffmpeg(stream).audioFilters(settings.ffmpegFilter).format('ogg').pipe(output) // apply audio filters with ffmpeg

  dispatcher = connection.play(output) // send the audio stream to discord

  dispatcher.on('start', () => {      // set paused to false since we are playing and update UI
    nowPlaying.start = Date.now()      // record when playing start
    nowPlaying.total = 0
    nowPlaying.pstart = undefined       // have not been paused yet
    progressUpdate = setInterval(() => { sendUI() }, 5555)
    paused = false
    sendUI()
  })
  dispatcher.on('finish', () => { playNext() }) // call playNext() once done playing
}

var autostopTimeout = undefined
function playNext () {                // plays the next song or stops playing depending on settings
  clearTimeout(progressUpdate)
  refreshAutoplay().then(() => {
    if (autoplay && autoplayQueue.length < 10) { autoplayInit() } // maintain length of autoplay queue if autoplay is enabled
    if (dispatcher) { dispatcher.destroy() }                      // make sure dispatcher has stopped

    if (repeatSong === 0) {                 // if we don't need to repeat
      nowPlaying = undefined
      if (queue.length > 0) {                      // if the queue is not finished
        if (finishSong) {                                 // and don't need to stop
          stop()
          return
        } else {                                          // play next song in the queue
          nowPlaying = queue[0]
          queue.shift()
        }
      } else if (queue.length === 0) {            // if the queue is finished
        if (finishQueue || finishSong) {                // and don't need to stop
          stop()
          return
        } else if (autoplay) {                          // if autoplay is enabled
          nowPlaying = autoplayQueue[0]                         // play next song in the autoplay queue
          autoplayQueue.shift()
        } else {                                        // otherwise, don't play more and set a timeout to leave voice channel in 1 min
          sendUI()
          sendNotification('Nothing to play, leaving voice channel in 60 seconds')
          autostopTimeout = setTimeout(() => { stop() }, 60000)
          return
        }
      }
    } else if (repeatSong > 0) { repeatSong -= 1 } // if repeat is enabled, repeat the song and decrament repeat counter
    if (nowPlaying) { player(nowPlaying) } else { stop() }                            // play the song
  })
}

function queuer (message, song) {     // takes in a song and request message and adds them to the queue and joins voice channel if needs
  if (finishSong) {                                                                                                                           // makes sure autostop isn't enabled and returns and error is it is
    sendError('<@!' + message.author.id + '> Auto stop is set to finish song, disable it if you\'d like to add music to the queue')
    return
  } else if (finishQueue) {
    sendError('<@!' + message.author.id + '> Auto stop is set to finish queue, disable it if you\'d like to add music to the queue')
    return
  }

  if (!connection) {              // if there is no voice channel connected, join it, then add the song to queue
    joinVoice(message).then(function (connected) {
      if (connected) {
        queue.push(song)
        if (queue.length === 1 && !nowPlaying) { playNext() }
        else { sendNotification('<@!' + message.author.id + '> Added ' + song.title + ' to the queue') }
      }
    })
  } else {                       // otherwise, just add the song to the queue
    queue.push(song)
    if (queue.length === 1 && !nowPlaying) { playNext() }
    else { sendNotification('<@!' + message.author.id + '> Added ' + song.title + ' to the queue') }
  }

  sendUI()                      // update UI
}

function stop () {                    // stops the player and resets variables
  showQueueMessage.then((message) => { if (!message.deleted) { message.delete() } }) // delete any messages that are not needed anymore
  searchMessage.then((message) => { if (!message.deleted) { message.delete() } })
  notification.then((message) => { if (!message.deleted) { message.delete() } })

  clearTimeout(autostopTimeout)       // clear the autostop timeout since we are already stopped
  clearTimeout(progressUpdate)        // clear the updater for progress

  if (voiceChannel) { voiceChannel.leave() } // leave voice channel and stop dispatcher
  if (dispatcher) { dispatcher.destroy() }

  paused = false                    // reset variables
  nowPlaying = undefined
  finishSong = false
  finishQueue = false
  repeatSong = 0
  queue = []
  voiceChannel = undefined
  connection = undefined
  dispatcher = undefined

  sendUI()                         // update UI
}

async function searchYT (searchString, number) {  // users ytsr to search youtube with given string and number of results
  try {
    const results = []
    const search = await ytsr(searchString, { limit: number })  // search youtube
    for (let i = 0; i < search.items.length; i++) {             // filter out non video results
      if (search.items[i].type === 'video') {
        results.push(search.items[i])
      }
    }
    return results
  } catch {
    return undefined
  }
}

async function searchAutoplay (searchString) {       // searchs autoplayList for search
  var search = []
  var short = []
  searchString = searchString.split(' ')         // split search string by spaces
  for (let i = 0; i < searchString.length; i++) {    // split words by length (>3 in search and <3 in short)
    if (searchString[i].length >= 3) { search.push(searchString[i]) }
    else { short.push(searchString[i]) }
  }
  let results = []                                   // found results
  for (let i = 0; i < autoplayList.length; i++) {    // iterate through autoplayList to find songs
    let currentScore = 0                             // score of current entry
    let current = autoplayList[i].title.split(' ')   // split title by spaces
    for (let j = 0; j < current.length; j++) {       // if any word in search matches and word in title, add 3 to score
      for (let n = 0; n < search.length; n++) {
        if (removeSpecial(search[n].toUpperCase()) === removeSpecial(current[j].toUpperCase())) {
          currentScore += 3
        }
      }

      for (let m = 0; m < short.length; m++) {       // if any word in short matches and word in title, add 1 to score
        if (removeSpecial(short[m].toUpperCase()) === removeSpecial(current[j].toUpperCase())) {
          currentScore += 1
        }
      }
    }
    autoplayList[i].score = currentScore                    // add the score data of file
    if (currentScore > 2) { results.push(autoplayList[i]) } // if score is greater than 2, add it to results
  }
  results = results.sort(function(a, b){return b.score - a.score})  // sort resutls by score
  return results  // return results
}

function isNumber (text) {      // used by remove special
  if (text) {
    var reg = new RegExp('[0-9]+$');
    return reg.test(text);
  }
  return false;
}

function removeSpecial (text) { // remove special characters for autoplay search
  if (text) {
    var lower = text.toLowerCase();
    var upper = text.toUpperCase();
    var result = "";
    for(var i = 0; i < lower.length; ++i) {
      if(isNumber(text[i]) || (lower[i] != upper[i]) || (lower[i].trim() === '')) {
        result += text[i];
      }
    }
    return result;
  }
  return '';
}

var searchMessage = new Promise (function (resolve) { resolve({ deleted: true }) }) // searchmessage object
var searchResults = { items: [] }   // searchResults, contains both youtube search and autopaly search
var searchPage = 1                  // current page searchMessage is on
var ytIndex = 0                     // index of where youtube search starts in searchResults.items
const searchReact = new events.EventEmitter()
var searchTimeout = undefined
searchReact.on('react', (message) => {  // reaction listener for reaction on searchMessage
  const filter = (reaction, user) => { return user.id !== message.author.id } // filter out bot's reactions
  const collector = message.createReactionCollector(filter, { max: 1 })       // only look at 1 reaction at a time

  collector.once('collect', function (reaction, user) {     // when reaction is detected
    clearTimeout(searchTimeout)                             // reset timeout for message deletion
    searchTimeout = setTimeout(function () { searchMessage.then((message) => { if (!message.deleted) { message.delete() } }) }, 60000)

    const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id)) // try to delete users reaction
    try {
      for (const reaction of userReactions.values()) {
        reaction.users.remove(user.id)
      }
    } catch (error) {
      console.log('Failed to remove reactions from now search message')
    }

    if (reaction.emoji.name === '❌') {        // cancel search and reset search data and delete message
      searchResults.items = []
      searchPage = 1
      ytIndex = 0
      searchMessage.then((message) => { if (!message.deleted) { message.delete() } })
    } else if (reaction.emoji.name === '⬅') {  // go back one page
      if (searchPage > 1) { searchPage -= 1 }
      message.edit(createSearchMessage())
      searchReact.emit('react', message)        // restart reaction listener
    } else if (reaction.emoji.name === '➡') {  // go back one page
      if (searchPage < Math.ceil(searchResults.items.length / 5 )) { searchPage += 1 }
      message.edit(createSearchMessage())
      searchReact.emit('react', message)        // restart reaction listener
    } else if (reaction.emoji.name === '⏭') { // go to start of youtube results
      if (searchResults.items.length > ytIndex + 1) {
        searchPage = Math.ceil((ytIndex + 1) / 5)
        message.edit(createSearchMessage())
      } else { message.edit(createSearchMessage(true))}
      searchReact.emit('react', message)       // restart reaction listener
    } else { searchReact.emit('react', message) } // restart reaction listener
  })
})

function search (search, request) {     // searchs calls searchYT() and searchAutoplay() and adds results to searchResults.items and sets ytIndex
  clearTimeout(searchTimeout)           // clear timeout for deletion

  searchMessage.then(async (message) => {
    searchResults.query = search        // set data for searchResults
    searchResults.request = request
    searchResults.items = []
    searchTimeout = setTimeout(function () {
      searchResults.items = []
      searchMessage.then((message) => { if (!message.deleted) { message.delete() } })
    }, 60000)

    const ytResult = await searchYT(search, 20) // search youtube
    const autoplayResult = await searchAutoplay(search, ytResult) // search autoplay
    if (autoplayResult) {                       // set ytIndex to correct value
      ytIndex = autoplayResult.length
      for (let i = 0; i < autoplayResult.length; i++) { searchResults.items.push(autoplayResult[i]) }
    }
    if (ytResult) { for (let i = 0; i < ytResult.length; i++) { searchResults.items.push(ytResult[i]) } }
    searchPage = 1                              // set searchPage to page 1

    if (!message.deleted) { message.edit(createSearchMessage()) }   // if message is not deleted, edit message with new info
    else {                                                          // otherwise, send new message
      searchMessage = new Promise(function (resolve) {
        channel.send(createSearchMessage()).then((message) => {
          searchReact.emit('react', message)
          message.react('⬅')              // create reactions
            .then(() => message.react('➡'))
            .then(() => message.react('⏭'))
            .then(() => message.react('❌'))
            .then(() => resolve(message))
            .catch(() => resolve(message))
        }).catch(() =>  resolve({ deleted: true }))
      })
    }
  })
}

function createSearchMessage () {       // creates message object for searchMessage
  let newMessage = { embed: { color: 12857387, title: 'Search Results for "' + searchResults.query + '"', }} // set title

  if (searchResults.items.length > 0) {      // if there are results
    let searchMessage = ''
    for (let i = (searchPage - 1) * 5; i < searchPage * 5; i++) { // iterate through searchResults.items and add each to searchMessage
      if (i === 0) { searchMessage = searchMessage.concat('\nAutoplay Search Results:\n') } // if it's the first entry, add header 'Autoplay Search Results'
      if (searchResults.items[i] && !searchResults.items[i].isLive) {
        if (searchResults.items[i] && searchResults.items[i].fileName) {    // item is an autoplay item, show title and duration
          searchMessage = searchMessage.concat('\n', i + 1, ': ', searchResults.items[i].title, ' - ', searchResults.items[i].duration, '\n')
        } else if (i === 0) {                                               // if no autoplay item and is the first entry, add 'Nothing Found'
          searchMessage = searchMessage.concat('\nNothing Found!\n')
        }

        if (i === ytIndex) { searchMessage = searchMessage.concat('\nYoutube Search Results:\n') }  // if entry = ytIndex, add header 'Youtube Search Results'

        if (searchResults.items[i] && !searchResults.items[i].fileName) {   // if item is a youtube item, show title, duration, and link
          searchMessage = searchMessage.concat('\n', i + 1, ': ', searchResults.items[i].title, ' - ', searchResults.items[i].duration, '\n      Uploaded by: ', searchResults.items[i].author.name, '\n', searchResults.items[i].url, '\n')
        } else if (!searchResults.items[i] && i === ytIndex) {
          searchMessage = searchMessage.concat('\nNothing Found!\n')        // if no searchResults left and ytIndex === i, add 'Nothing Found'
        }
      } else {
        if (searchResults.items[i] && searchResults.items[i].fileName) {    // item is an autoplay item, show title and duration
          searchMessage = searchMessage.concat('\n', i + 1, ': ', searchResults.items[i].title, ' - live \n')
        } else if (i === 0) {                                               // if no autoplay item and is the first entry, add 'Nothing Found'
          searchMessage = searchMessage.concat('\nNothing Found!\n')
        }

        if (i === ytIndex) { searchMessage = searchMessage.concat('\nYoutube Search Results:\n') }  // if entry = ytIndex, add header 'Youtube Search Results'

        if (searchResults.items[i] && !searchResults.items[i].fileName) {   // if item is a youtube item, show title, duration, and link
          searchMessage = searchMessage.concat('\n', i + 1, ': ', searchResults.items[i].title, ' - live \n      Uploaded by: ', searchResults.items[i].author.name, '\n', searchResults.items[i].url, '\n')
        } else if (!searchResults.items[i] && i === ytIndex) {
          searchMessage = searchMessage.concat('\nNothing Found!\n')        // if no searchResults left and ytIndex === i, add 'Nothing Found'
        }
      }
    }
    newMessage.embed.description = searchMessage    // set description to searchMessage
    newMessage.embed.footer = { text: 'Showing page ' + searchPage + ' of ' + Math.ceil(searchResults.items.length / 5) } // add footer
  } else {                                // if there are no results, show Nothing Found
    newMessage = {
      embed: {
        color: 12857387,
        title: 'Search Results for "' + searchResults.query + '"',
        description: 'Nothing Found!'
      }
    }
  }
  return newMessage
}

client.login(settings.token)                    // login to discord with bot token
client.once('ready', async function () {        // once ready
  console.log('Ready!')                         // log ready
  channel = await client.channels.cache.get(settings.channelID)   // get channel data using saved channelID
  if (!settings.channelID) { console.log('Set a channel first!') } else { sendUI() }  // if no channel id, log 'Set a channel first', otherwise sendUI()
})

client.on('message', async function (message) { // when bot recieveds a message
  if (message.author.bot) return                    // ignore if author of message is the bot
  message.content = message.content.toLowerCase()   // set content to lower case
  if (!message.content.startsWith(settings.prefix.toLowerCase())) return  // ignore if doesn't start with bot prefix

  if (message.content === 'set channel') {                                                             // if is 'set channel', set channel to new channel id, save, and resend UI
    settings.channelID = message.channel.id
    fs.writeFile('config.json', JSON.stringify(settings), (error) => { if (error) throw error })
    channel = await client.channels.cache.get(settings.channelID)
    if (channel) { sendUI(channel) }
    message.delete()
    return
  } else if (message.channel.id !== settings.channelID) { return }                                      // otherwise, if not in correct channel, ignore

  if (message.content.startsWith(settings.prefix.toLowerCase())) { // if starts with prefix delete message and remove prefix
    message.delete()
    message.content = message.content.replace(settings.prefix, '')
  }

  if (message.content === 'join') { joinVoice(message) }                  // if join, join voice
  else if (message.content.startsWith('play ') || message.content.startsWith('search ')) { // if search or play with more content, remove search or play, and search
    message.content = message.content.replace('play ', '')
    message.content = message.content.replace('search ', '')
    search(message.content, message)
  } else if (parseInt(message.content) > 0) {                             // if a number greater than 0, check if currently searching and select entry or send error
    var index = parseInt(message.content) - 1
    if (searchResults.items.length > 0) {
      if (index < searchResults.items.length) {
        for (let i = 0; i < autoplayQueue.length; i++) {
          if (autoplayQueue[i].fileName === searchResults.items[index].fileName && autoplay) {
            autoplayQueue.splice(i, 1)
          }
        }
        searchResults.items[index].id = '<@!' + searchResults.request.author.id + '>'
        queuer(searchResults.request, searchResults.items[index])
        searchResults.items = []
        searchMessage.then((message) => { if (!message.deleted) { message.delete() } })
      } else {
        sendError('There are only ' + searchResults.items.length + ' search results!')
      }
    } else {
      sendError('You aren\'t searching anything!')
    }
  } else if (message.content === 'play' || message.content === 'resume') {// if play or resume make sure connected to voice channel and play
    if (!nowPlaying && autoplay) {
      joinVoice(message).then(function (connected) {
        if (connected) {
          paused = false
          playNext()
        }
      })
    } else if (!dispatcher) {
      sendError('<@!' + message.author.id + '> There\'s nothing to resume')
    } else {
      paused = false
      dispatcher.resume()
      nowPlaying.total = nowPlaying.total + Date.now() - nowPlaying.pstart
      nowPlaying.pstart = undefined
      sendUI()
    }
  } else if (message.content === 'skip' || message.content === 'next') {  // if skip, check if playing and skip
    if (!dispatcher) { sendError('<@!' + message.author.id + '> There\'s nothing to skip') }
    else { playNext() }
  } else if (message.content === 'pause') {                               // if pause, check if playing and pause
    if (!dispatcher) { sendError('<@!' + message.author.id + '> There\'s nothing to pause') }
    else if (nowPlaying.isLive) { sendError('<@!' + message.author.id + '> Live videos cannot be paused') }
    else if (!paused) {
      dispatcher.pause(true)
      nowPlaying.pstart = Date.now()
      paused = true
      sendUI()
    }
  } else if (message.content === 'repeat 0') {                            // if repeat 0, check if playing and set repeat song = 0
    if (nowPlaying) {
      repeatSong = 0
      sendUI()
    } else { sendError('<@!' + message.author.id + '> Nothing to repeat') }
  } else if (message.content.startsWith('repeat ')) {                     // if repeat, check if playing and set repeat song to user input
    if (nowPlaying) {
      var times = parseInt(message.content.replace('repeat ', ''))
      if (!times) { sendError('<@!' + message.author.id + '> That was not an integer') }
      else {
        repeatSong = times
        sendUI()
      }
    } else { sendError('<@!' + message.author.id + '> Nothing to repeat') }
  } else if (message.content === 'stop' || message.content === 'commit seppuku') { stop() } // if stop or commit seppuku, stop bot
  else if (message.content === 'show queue') { showQueue(message, 1) }    // if show queue, showQueue()
  else if (message.content.startsWith('show queue ')) {                   // if show queue + [page], test for int and show that page
    const page = parseInt(message.content.replace('show queue ', ''))
    if (!page) { sendError('<@!' + message.author.id + '> That was not an integer') }
    else { showQueue(message, page) }
  } else if (message.content.startsWith('advance ')) {                    // if advance, advance song in queue to top
    message.content = message.content.replace('advance ', '')
    const index = parseInt(message.content)
    if (!index) { sendError('<@!' + message.author.id + '> That was not an integer') }
    else if (index > queue.length + autoplayQueue.length) { sendError('<@!' + message.author.id + '> The queue is not that long') }
    else {
      if (index <= queue.length) {
        const temp = queue[index - 1]
        queue.splice(index - 1, 1)
        queue.unshift(temp)
      } else {
        const temp = autoplayQueue[index - queue.length - 1]
        temp.message = message
        autoplayQueue.splice(index - queue.length - 1, 1)
        queue.unshift(temp)
      }
      sendUI()
    }
  } else if (message.content.startsWith('remove ')) {                     // if remove, remove song from queue
    message.content = message.content.replace('remove ', '')
    const index = parseInt(message.content)
    if (!index) { sendError('<@!' + message.author.id + '> That was not an integer') }
    else if (index > queue.length + autoplayQueue.length) { sendError('<@!' + message.author.id + '> The queue is not that long') }
    else {
      if (index <= queue.length) {
        queue.splice(index - 1, 1)
      } else {
        autoplayQueue.splice(index - queue.length - 1, 1)
      }
      sendUI()
    }
  } else if (message.content === 'clear queue') {                         // if clear queue, clear queue
    queue = []
    sendNotification('<@!' + message.author.id + '> Cleared the queue')
    sendUI()
  } else if (message.content === 'toggle autoplay') {                     // if toggle autoplay, toggle autoplay
    autoplay = !autoplay
    sendNotification('<@!' + message.author.id + '> Set autoplay to ' + autoplay)
    if (autoplay) {
      autoplayQueue = []
      autoplayInit().then(() => sendUI())
    } else {
      autoplayQueue = []
      sendUI()
    }
  } else if (message.content === 'autostop finish song' || message.content === 'autostop fs' || message.content === 'as fs') { // if set autostop to corret user input
    finishQueue = false
    finishSong = !finishSong
    sendNotification('<@!' + message.author.id + '> Set autostop to finish song')
    sendUI()
  } else if (message.content === 'autostop finish queue' || message.content === 'autostop fq' || message.content === 'as fq') {
    finishSong = false
    finishQueue = !finishQueue
    sendNotification('<@!' + message.author.id + '> Set autostop to finish queue')
    sendUI()
  } else if (message.content === 'autostop disable'  || message.content === 'autostop d' || message.content === 'as d') {
    finishSong = false
    finishQueue = false
    sendNotification('<@!' + message.author.id + '> Disabled autostop')
    sendUI()
  } else if (message.content === 'help') {                                // if help, send help page to dm
    const newMessage = new Discord.MessageEmbed()
      .setColor('#7289da')
      .setTitle('Avaiable Commands')
      .setDescription('**"' + settings.prefix + 'join"**\nBot joins the voice channel the user is in.\n\n' +
      '**"' + settings.prefix + 'play"**\n Bot will attempt to start or resume playing anything in the queue' +
      '**"' + settings.prefix + 'play [query]"**\nBot will search avaliable autoplay entries as well as youtube for the query. User can then choose which one to play by typing index of search' + ' If something is already playing, it will add it to the queue.\n\n' +
      '**"' + settings.prefix + 'pause"**\nPauses what the bot is playing.\n\n' +
      '**"' + settings.prefix + 'resume"**\nResumes what was paused.\n\n' +
      '**"' + settings.prefix + 'skip" or "' + settings.prefix + 'next"**\nSkips the current song and moves onto the next song in the queue.\n\n' +
      '**"' + settings.prefix + 'repeat [times]"**\nHow many times to repeat the current song. A value of -1 will result in indefinite repeats\n\n' +
      '**"' + settings.prefix + 'remove [queue index]"**\nRemoves that entrie from the queue.\n\n' +
      '**"' + settings.prefix + 'advance [queue index]"**\nMoves the corresponding song in the queue to the top.\n\n' +
      '**"' + settings.prefix + 'clear queue"**\nBot will clear the current queue.\n\n' +
      '**"' + settings.prefix + 'stop"**\nImmediately stops playing, clears the queue, and leaves the voice channel.\n\n' +
      '**"' + settings.prefix + 'autostop finish song"**\nWhether or not the bot will finish playing the current song then leave. New requests will not be honored when true.\n\n' +
      '**"' + settings.prefix + 'autostop finish queue"**\nWhether or not the bot will finish playing the queue then leave. New requests will not be honored when true.\n\n' +
      '**"' + settings.prefix + 'autostop disable"**\nDisabes both finish song and finish queue.\n\n' +
      '**"' + settings.prefix + 'toggle autoplay"**\nToggles whether or not bot will play songs from the autoplay folder when queue is empty. When disabled, bot will automatically leave after 60 seconds when queue is empty.\n\n' +
      '**"' + settings.prefix + 'set channel"**\nBot sets the channel the bot will listen to. Bot will notify users if they try to user a different channel.\n\n' +
      '**"' + settings.prefix + 'clear channel [x]"**\nBot will delete that last x messages in the channel. Note that you can only delete messages less than 14 days old.')
    client.users.cache.get(message.author.id).send(newMessage)
  } else if (message.content.startsWith('clear channel ')) {              // if clear channel, clear last 1-100 messages
    message.content = message.content.replace('clear channel ', '')
    const number = parseInt(message.content)
    if (!number) {
      sendError('<@!' + message.author.id + '> That was not an integer')
    } else if (number > 100) {
      sendError('<@!' + message.author.id + '> You can only delete up to 100 messages at a time')
    } else {
      message.channel.bulkDelete(number).then(() => {
        setTimeout(() => {
          sendUI()
          sendNotification('<@!' + message.author.id + '> Deleted ' + number + ' messages')
        }, 1000)
      }).catch()
    }
  } else {                                                                // otherwise send error
    sendError('<@!' + message.author.id + '> That is not a valid command. Type "' + settings.prefix + 'help" to show the list of avaliable commands.')
  }
})


// catching signals and do something before exit
var signals = ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM' ]
signals.forEach((sig) => {
  process.on(sig, function () {
    if (typeof sig === "string") { channel.bulkDelete(100).then(() => { process.exit(1) }) }
  })
})
