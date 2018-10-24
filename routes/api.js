/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var mongoose = require('mongoose');
var expect = require('chai').expect;

// Connect to database
mongoose.connect(process.env.DB);
let db = mongoose.connection;

let boardSchema;
let boardModel;

db.once('open', () => {
  // Create baord schema
  boardSchema = new mongoose.Schema({
    board: String,
    text: String,
    created_on: Date,
    bumped_on: Date,
    reported: Boolean,
    delete_password: String,
    replies: [{
      text: String,
      created_on: Date,
      delete_password: String,
      reported: Boolean
    }]
  });
  
  // Create model
  boardModel = mongoose.model('board', boardSchema);
});

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .post((req, res) => {
      // Get current time
      let timeNow = Date.now();
    
      // Create new thread
      let newThread = new boardModel({
        board: req.params.board,
        text: req.body.text,
        created_on: timeNow,
        bumped_on: timeNow,
        reported: false,
        delete_password: req.body.delete_password,
        replies: []
      });
    
      // Save new thread
      newThread.save((err, thread) => {
        res.redirect('/b/' + req.params.board);
        return;
      });
    })
  
    .get((req, res) => {
      // Get threads
      boardModel
        .find({ board: req.params.board })
        .limit(10)
        .sort({ bumped_on: 1 })
        .select('text created_on bumped_on replies')
        .lean()
        .exec((err, threads) => {
          threads.forEach(thread => {
            // Sort and limit replies
            thread.replies = thread.replies
              .sort((a, b) => a.created_on - b.created_on)
              .slice(0, 3);
            
            // Remove hidden fields
            thread.replies.forEach(reply => {
              delete reply.reported;
              delete reply.delete_password;
            });
            
            // Add reply count
            thread.replycount = thread.replies.length;
          });
        
          // Send results
          res.json(threads);
          return;
        });
    })
    
    .put((req, res) => {
      // Update thread to reported
      boardModel.findOneAndUpdate({ 
        board: req.params.board,
        _id: req.body.thread_id
      },
      { reported: true },
      (err, thread) => {
        res.send('success');
      });
    })
  
    .delete((req, res) => {
      // Get thread
      boardModel.findOne({
        board: req.params.board,
        _id: req.body.thread_id
      }, (err, thread) => {
        // Check password
        if (thread.delete_password !== req.body.delete_password) {
          res.send('incorrect password');
          return;
        }
        
        // Delete thread
        boardModel.findByIdAndDelete(req.body.thread_id, err => {
          res.send('success');
          return;
        });
      })
    });
    
  app.route('/api/replies/:board')
    .post((req, res) => {    
      // Get thread
      boardModel.findOne({
        board: req.params.board,
        _id: req.body.thread_id
      }, (err, thread) => {
        let timeNow = Date.now();
        
        // Update bumped time
        thread.bumped_on = timeNow;
        
        // Add reply
        thread.replies.push({
          text: req.body.text,
          created_on: timeNow,
          delete_password: req.body.delete_password,
          reported: false
        });
        
        // Save thread
        thread.save((err, thread) => {
          // Redirect to thread
          res.redirect('/b/' + req.params.board + '/' + req.body.thread_id);
          return;
        });
      });
    })
  
    .get((req, res) => {    
      // Get thread
      boardModel
        .findOne({
          board: req.params.board,
          _id: mongoose.Types.ObjectId(req.query.thread_id)
        })
        .lean()
        .exec((err, thread) => {
          // Remove hidden fields
          delete thread.reported;
          delete thread.delete_password;

          thread.replies.forEach(reply => {
            delete reply.reported;
            delete reply.delete_password;
          });

          // Add reply count
          thread.replycount = thread.replies.length;

          // Send thread
          res.json(thread);
          return;
        });
    })
  
    .put((req, res) => {    
      // Find thread
      boardModel.findOne({
        board: req.params.board,
        _id: req.body.thread_id
      }, (err, thread) => {
        // Find reply
        let reply = thread.replies.find(x => x._id == req.body.reply_id);
        
        // Set to reported
        reply.reported = true;
        
        // Save
        thread.save((err, thread) => {
          res.send('success');
          return;
        });        
      });
    })
  
    .delete((req, res) => {
      // Find thread
      boardModel.findOne({
        board: req.params.board,
        _id: req.body.thread_id
      }, (err, thread) => {
        // Find reply
        let reply = thread.replies.find(x => x._id == req.body.reply_id);
        
        // Check passwords
        if (reply.delete_password != req.body.delete_password) {
          res.send('incorrect password');
          return;
        }
        
        // Set to deleted
        reply.text = '[deleted]';
        
        // Save
        thread.save((err, thread) =>{
          res.send('success');
          return;
        });
      });
    });
};
