const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const server = require('../index');
const pry = require('pryjs')

const environment = process.env.NODE_ENV || 'development';
const configuration = require('../knexfile')[environment];
const database = require('knex')(configuration);

chai.use(chaiHttp);

describe('API Routes', () => {
  before((done) => {
    database.migrate.latest()
      .then(() => done())
      .catch(error => {
        throw error;
      });
  });

  beforeEach((done) => {
    database.seed.run()
      .then(() => done())
      .catch(error => {
        throw error;
      });
  });

  after((done) => {
    database.seed.run()
      .then(() => done())
      .catch(error => {
        throw error;
      });
  });

  describe('GET /api/v1/foods', () => {
   it('should return all of the foods', done => {
      chai.request(server)
        .get('/api/v1/foods')
        .end((err, response) => {
          response.should.have.status(200);
          response.should.be.json;
          response.body.should.be.a('array');
          response.body[0].should.have.property('name');
          response.body[0].name.should.equal('Orange');
          response.body[0].should.have.property('calories');
          response.body[0].calories.should.equal(100);
          done();
        });
      });
    })

  describe('GET api/v1/foods/1', () => {
    it('should return one specific food', done => {
      chai.request(server)
        .get('/api/v1/foods/1')
        .end((err, response) => {
          response.should.have.status(200);
          response.should.be.json;
          response.body.should.be.a('array');
          response.body.length.should.equal(1);
          response.body[0].should.have.property('name');
          response.body[0].name.should.equal('Orange');
          response.body[0].should.have.property('calories');
          response.body[0].calories.should.equal(100);
          done();
        });
    });
    it('should return 404 if id does not exist', done => {
      chai.request(server)
       .get('/api/v1/foods/100000000')
       .end((err, response) => {
         response.should.have.status(404);
         done();
       });
    });
  });

  describe('PATCH /api/v1/foods/1', () => {
    it('should update an existing food', done => {
      chai.request(server)
       .patch('/api/v1/foods/1')
       .send({
         name: "Apple",
         calories: 200
       })
       .end((err, response) => {
         response.should.have.status(201);
         response.should.be.json;
         response.body.should.be.a('object');
         response.body.should.have.property('food');
         response.body.food.name.should.equal('Apple');
         response.body.food.calories.should.equal(200);
       });
        done();
    });
    it('should return 404 if datatypes incorrect', done => {
      chai.request(server)
       .patch('/api/v1/foods/10000000')
       .send({
         name: "Apple",
         calories: 200
       })
        .end((err, response) => {
          response.should.have.status(400);
        });
        done();
     });
    it('should return 422 if patch does not include all attributes', done => {
     chai.request(server)
       .patch('/api/v1/foods/1')
       .send({
         name: "Apple"
       })
        .end((err, response) => {
          response.should.have.status(422);
        });
        done();
     });
   });

  describe('POST /api/v1/foods', () => {
    it('should create a new food', done => {
      chai.request(server)
       .post('/api/v1/foods')
       .send({
         name: "Egg",
         calories: 80
       })
       .end((err, response) => {
         response.should.have.status(201);
         response.should.be.json;
         response.body.should.be.a('object');
         response.body.should.have.property('food');
         response.body.food.name.should.equal('Egg');
         response.body.food.calories.should.equal(80);
       });
      chai.request(server)
       .get('/api/v1/foods')
       .end((err, response) => {
         response.body.should.be.a('array');
         response.body[response.body.length-1].name.should.equal('Egg');
         response.body[response.body.length-1].calories.should.equal(80);
         done();
       });
    });

    it('should return 422 is all attributes are not included in request', done => {
      chai.request(server)
       .post('/api/v1/foods')
       .send({
         calories: 80
       })
       .end((err, response) => {
         response.should.have.status(422);
       done();
       });
    });
  });

  describe('DELETE /api/v1/foods/1', () => {
    it('should delete a specific food', done => {
      chai.request(server)
        .delete('/api/v1/foods/1')
        .end((err, response) => {
          response.should.have.status(204);
      });
      chai.request(server)
        .get('/api/v1/foods/1')
        .end((err, response) => {
          response.should.have.status(404);
        done();
        });
    });
  });
});
