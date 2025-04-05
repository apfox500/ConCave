// ********************** Initialize server **********************************

const server = require('../index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************
describe('Testing Add User API', () => {
    it('positive : /add_user', done => {
      chai
        .request(server)
        .post('/add_user')
        .send({
            id: 1,
            first_name: 'Test',
            last_name: 'ing',
            username: 'testing',
            email: 'testing@testing.com',
            rank: 'user',
            password: 'TestingP@5sword',
            created_at: '2024-04-03T12:00:00Z',
            last_login: '2024-04-03T12:00:00Z'
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.message).to.equals('Success');
          done();
        });
    });

    it('Negative : /add_user. Checking invalid first name', done => {
        chai
          .request(server)
          .post('/add_user')
          .send({
            id: 1,
            first_name: 1,
            last_name: 'ing',
            username: 'testing',
            email: 'testing@testing.com',
            rank: 'user',
            password: 'TestingP@5sword',
            created_at: '2024-04-03T12:00:00Z',
            last_login: '2024-04-03T12:00:00Z'
        })
          .end((err, res) => {
            expect(res).to.have.status(400);
            expect(res.body.message).to.equals('Invalid input');
            done();
          });
      });
  });

  describe('Testing Render', () => {
    it('test "/login" route should render with an html response', done => {
      chai
        .request(server)
        .get('/login')
        .end((err, res) => {
          res.should.have.status(200); 
          res.should.be.html;
          done();
        });
    });
  });

  describe('Login Flow', () => {
    it('Should login and redirect or render the home page', done => {
      chai
        .request(server)
        .post('/login')
        .send({
          username: 'testing',
          password: 'TestingP@5sword'
        })
        .end((err, res) => {
          res.should.have.status(302); 
          if (res.redirects.length > 0) {
            expect(res.redirects[0]).to.include('/home');
          } else {
            res.should.be.html;
            expect(res.text).to.include('Home');
          }
          done();
        });
    });
  });
js// ********************************************************************************