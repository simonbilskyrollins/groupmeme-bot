const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('./index.js')
const should = chai.should()

chai.use(chaiHttp)


describe('GroupMeme Bot Tests', function() {
  it('should render a basic form on / GET')
  it('should send a message on a /send POST')
  it('should process incoming messages on / POST')
})

it('should render a basic form on / GET', function (done) {
  chai.request(server)
    .get('/')
    .end(function (err, res) {
      res.should.have.status(200)
      res.should.be.html
      done()
    })
})

it('should send a message on a /send POST', function (done) {
  chai.request(server)
    .post('/send')
    .send({'message': 'test', 'imageUrl': 'http://reddit.com/thatsthejoke.jpg'})
    .end(function (err, res) {
      res.should.have.status(200)
      res.should.be.html
      done()
    })
})

it('should process incoming messages on / POST', function (done) {
  chai.request(server)
    .post('/')
    .send({'text': 'meme', 'name': 'Not Beep Boop'})
    .end(function (err, res) {
      res.should.have.status(200)
      done()
    })
})
