/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chaiString = require('chai-string');
var chai = require('chai');
var assert = chai.assert;
var mongoose = require('mongoose');
var server = require('../server');

chai.use(chaiHttp);
chai.use(chaiString);

// Connect to database
mongoose.connect(process.env.DB);
let db = mongoose.connection;

// Create model
let boardModel = mongoose.model('board');

// Clear board
(() => {
  // Create clear promise
  let clearPromise = new Promise((resolve, reject) => {
    // Clear board
    boardModel.deleteMany({}, (err, threads) => {
      resolve();
    });
  });
  
  // Wait clear promise
  clearPromise.then(() => {});
})();

suite('Functional Tests', function() {
  let threadReadMeID;
  let threadPatchID;
  let replyID;

  suite('API ROUTING FOR /api/threads/:board', function() {

    suite('POST', function() {

      test('Add read me thread', done => {
        chai.request(server)
          .post('/api/threads/board')
          .send({
            text: 'Official Read Me',
            delete_password: 'delete123'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.endsWith(res.req.path, 'b/board');
          
            // Get board thread
            boardModel.findOne({ text: 'Official Read Me' }, (err, thread) => {              
              assert.isNotNull(thread);
              
              assert.property(thread, '_id');
              assert.property(thread, 'text');
              assert.equal(thread.text, 'Official Read Me');
              assert.property(thread, 'created_on');
              assert.isBelow(Date.now() - thread.created_on, 3600000);
              assert.property(thread, 'bumped_on');
              assert.isBelow(Date.now() - thread.bumped_on, 3600000);
              assert.property(thread, 'reported');
              assert.equal(thread.reported, false);
              assert.property(thread, 'delete_password');
              assert.equal(thread.delete_password, 'delete123');
              assert.property(thread, 'replies');
              assert.isArray(thread.replies);
              assert.equal(thread.replies.length, 0);
              
              // Store thread id
              threadReadMeID = thread._id;
              
              done();
            });
          });
      });      
        
      test('Add patch notes thread', done => {
        chai.request(server)
          .post('/api/threads/board')
          .send({
            text: 'Patch notes',
            delete_password: 'deletePatch123'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.endsWith(res.req.path, 'b/board');
          
            // Get board thread
            boardModel.findOne({ text: 'Patch notes' }, (err, thread) => {                
              assert.isNotNull(thread);
              
              assert.property(thread, '_id');
              assert.property(thread, 'text');
              assert.equal(thread.text, 'Patch notes');
              assert.property(thread, 'created_on');
              assert.isBelow(Date.now() - thread.created_on, 3600000);
              assert.property(thread, 'bumped_on');
              assert.isBelow(Date.now() - thread.bumped_on, 3600000);
              assert.property(thread, 'reported');
              assert.equal(thread.reported, false);
              assert.property(thread, 'delete_password');
              assert.equal(thread.delete_password, 'deletePatch123');
              assert.property(thread, 'replies');
              assert.isArray(thread.replies);
              assert.equal(thread.replies.length, 0);
              
              // Store thread id
              threadPatchID = thread._id;
              
              done();
            });
          });
      });
    });

    suite('GET', function() {

      test('Get recent threads', done => {
        chai.request(server)
          .get('/api/threads/board')
          .end((err, res) => {
            assert.equal(res.status, 200);
          
            assert.isArray(res.body);
            assert.isAbove(res.body.length, 0);
            assert.isAtMost(res.body.length, 10);
          
            let thread = res.body[0];
          
            assert.property(thread, '_id');
            assert.property(thread, 'text');
            assert.isString(thread.text);
            assert.property(thread, 'created_on');
            assert.isNotNaN(Date.parse(thread.created_on));
            assert.property(thread, 'bumped_on');
            assert.isNotNaN(Date.parse(thread.bumped_on));
            assert.property(thread, 'replies');
            assert.isArray(thread.replies);
          
            assert.isAtMost(thread.replies, 3);
          
            assert.notProperty(thread, 'reported');
            assert.notProperty(thread, 'delete_password');
            
            done();
          });
      });
    });    

    suite('PUT', function() {
      
      test('Set thread to reported', done => {
        chai.request(server)
          .put('/api/threads/board')
          .send({
            thread_id: threadReadMeID
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
          
            // Find thread
            boardModel.findById(threadReadMeID, (err, thread) => {              
              assert.isNotNull(thread);
              assert.isTrue(thread.reported);
              
              done();
            });          
          });
      });
    });

    suite('DELETE', function() {
      
      test('Delete read me thread with incorrect password', done => {
        chai.request(server)
          .delete('/api/threads/board')
          .send({
            thread_id: threadPatchID,
            delete_password: 'incorrect password'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);          
            assert.equal(res.text, 'incorrect password');
          
            done();
          });
      });      
      
      test('Delete path thread', done => {
        chai.request(server)
          .delete('/api/threads/board')
          .send({
            thread_id: threadPatchID,
            delete_password: 'deletePatch123'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);          
            assert.equal(res.text, 'success');
            
            // Find thread
            boardModel.findById(threadPatchID, (err, thread) => {     
              assert.isNull(thread);
              
              done();
            });
          });
      });      
    });
  });

  suite('API ROUTING FOR /api/replies/:board', function() {

    suite('POST', function() {
      
      test('Post reply to thread', done => {
        chai.request(server)
          .post('/api/replies/board')
          .send({
            text: '1st reply to read me.',
            delete_password: 'passwordReply123',
            thread_id: threadReadMeID
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            
            assert.endsWith(res.req.path, 'b/board/' + threadReadMeID);
          
            // Get board thread
            boardModel.findById(threadReadMeID, (err, thread) => {
              assert.isNotNull(thread);
              
              assert.isBelow(Date.now() - thread.bumped_on, 3600000);
              
              assert.property(thread, 'replies');
              assert.isArray(thread.replies);
              assert.equal(thread.replies.length, 1);
              
              let reply = thread.replies[0];
              
              assert.property(reply, '_id');
              assert.property(reply, 'text');
              assert.equal(reply.text, '1st reply to read me.');
              assert.property(reply, 'created_on');
              assert.isNotNaN(Date.parse(reply.created_on));
              assert.property(reply, 'delete_password');
              assert.equal(reply.delete_password, 'passwordReply123');
              assert.property(reply, 'reported');
              assert.isFalse(reply.reported);
              
              // Store reply id
              replyID = reply._id;
              
              done();
            });            
          });          
      });
    });

    suite('GET', function() {

      test('Get read me thread replies', done => {
        chai.request(server)
          .get('/api/replies/board')
          .query({
            thread_id: threadReadMeID.toString()
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
          
            assert.isObject(res.body);
          
            assert.property(res.body, '_id');
            assert.property(res.body, 'text');
            assert.isString(res.body.text);
            assert.property(res.body, 'created_on');
            assert.isNotNaN(Date.parse(res.body.created_on));
            assert.property(res.body, 'bumped_on');
            assert.isNotNaN(Date.parse(res.body.bumped_on));
            assert.property(res.body, 'replies');
            assert.isArray(res.body.replies); 
          
            assert.isArray(res.body.replies);
          
            assert.notProperty(res.body, 'reported');
            assert.notProperty(res.body, 'delete_password');
          
            done();
          });
      });
    });

    suite('PUT', function() {
      
      test('Set reply to reported', done => {
        chai.request(server)
          .put('/api/replies/board')
          .send({
            thread_id: threadReadMeID,
            reply_id: replyID
          })
          .end((err, res) => {
            assert.equal(res.status, 200);          
            assert.equal(res.text, 'success');
          
            // Find thread
            boardModel.findById(threadReadMeID, (err, thread) => {
              assert.isNotNull(thread);
              
              assert.property(thread, 'replies');
              assert.isArray(thread.replies);
              assert.equal(thread.replies.length, 1);
              
              let reply = thread.replies[0];
              
              assert.property(reply, '_id');
              assert.property(reply, 'text');
              assert.isString(reply.text);
              assert.property(reply, 'created_on');
              assert.isNotNaN(Date.parse(reply.created_on));
              assert.property(reply, 'delete_password');
              assert.property(reply, 'reported');
              assert.isTrue(reply.reported);
              
              done();
            });          
          });
      });
    });

    suite('DELETE', function() {
      
      test('Delete reply', done => {
        chai.request(server)
          .delete('/api/replies/board')
          .send({
            thread_id: threadReadMeID,
            reply_id: replyID,
            delete_password: 'passwordReply123'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            
            // Find thread
            boardModel.findById(threadReadMeID, (err, thread) => {
              assert.isNotNull(thread);
              
              assert.property(thread, 'replies');
              assert.equal(thread.replies.length, 1);
              
              let reply = thread.replies[0];
              
              assert.property(reply, 'text');
              assert.equal(reply.text, '[deleted]');
              
              done();
            });
          });
      });
        
      test('Delete reply wrong password', done => {
        chai.request(server)
          .delete('/api/replies/board')
          .send({
            thread_id: threadReadMeID,
            reply_id: replyID,
            delete_password: 'incorrect password'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'incorrect password');
          
            done();
          });
      });
    });
  });
});
