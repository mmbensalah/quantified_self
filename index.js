const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const pry  = require('pryjs');
const util = require('util');


const environment = process.env.NODE_ENV || 'development';
const configuration = require('./knexfile')[environment];
const database = require('knex')(configuration);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('port', process.env.PORT || 3000);
app.locals.title = 'Quantified Self';

app.get('/api/v1/foods', (request, response) => {
  database('foods').select()
    .then((foods) => {
      response.status(200).json(foods);
    })
    .catch((error) => {
      response.status(500).json({ error });
    });
});

app.get('/api/v1/foods/:id', (request, response) => {
  database('foods').where('id', request.params.id).select()
    .then(foods => {
      if (foods.length) {
        response.status(200).json(foods[0]);
      } else {
        response.status(404).json({
          error: `Could not find food with id ${request.params.id}`
        });
      }
    })
    .catch(error => {
      response.status(500).json({ error });
    });
});

app.patch('/api/v1/foods/:id', (request, response) => {
  const food = request.body;

  for (let requiredParameter of ['name', 'calories']) {
    if (!food[requiredParameter]) {
      return response
        .status(422)
        .send({ error: `Expected format: { title: <String>, author: <String> }. You're missing a "${requiredParameter}" property.` });
    }
  }
  database('foods').where('id', request.params.id).update(food)
    .then(foods => {
      if (foods == 1) {
        response.status(201).json({"food": food });
      }
    })
    .catch((error) => {
      response.status(400).json({ error });
    });
});

app.post('/api/v1/foods', (request, response) => {
  const food = request.body;
  for (let requiredParameter of ['name', 'calories']) {
    if (!food[requiredParameter]) {
      return response
        .status(422)
        .send({ error: `Expected format: { title: <String>, author: <String> }. You're missing a "${requiredParameter}" property.` });
    }
  }
  database('foods').insert(food, 'id')
    .then(food => {
      response.status(201).json({ "food": request.body })
    })
    .catch(error => {
      response.status(400).json({ error });
    });
});

app.delete('/api/v1/foods/:id', (request, response) => {
  database('foods').where('id', request.params.id).del()
  .then(foods => {
    if (foods == 1) {
      response.status(204).json({success: true});
    } else {
      response.status(404).json({ "error": "That food does not exist." });
    }
  })
  .catch((error) => {
    response.status(500).json({ error });
  });
});

app.get('/api/v1/meals', (request, response) => {
  database('meals')
  .select(['meals.id AS meal_id', 'meals.name AS meal_name', 'foods.* AS foods'])
  .join('meal_foods', 'meals.id', '=', 'meal_foods.meal_id')
  .join('foods', 'foods.id', '=', 'meal_foods.food_id')
    .then((meals) => {
      const result = formatMeals(meals)
      response.status(200).json(result);
    })
    .catch((error) => {
      response.status(500).json({ error });
    });
  });

app.get('/api/v1/meals/:meal_id/foods', (request, response) => {
  database('meals')
    .select(['meals.id AS meal_id', 'meals.name AS meal_name', 'foods.* AS foods'])
    .join('meal_foods', 'meals.id', '=', 'meal_foods.meal_id')
    .join('foods', 'foods.id', '=', 'meal_foods.food_id')
    .where('meal_id', request.params.meal_id)
    .then((foods) => {
      var meal = {"id": request.params.meal_id, "name": foods[0].meal_name, "foods": []}
      foods.forEach(function(f){
          result = { "id": f.id, "name": f.name, "calories": f.calories }
          meal.foods.push(result)
        })
      response.status(200).json(meal);
    })
    .catch((error) => {
      response.status(404).json("Error: Could not find a meal with that id.");
    });
});

app.post('/api/v1/meals/:meal_id/foods/:food_id', (request, response) => {
  database('meal_foods').insert({'food_id': request.params.food_id, 'meal_id': request.params.meal_id, 'date_id': request.query.date })
    .then(date => {
      response.status(201).json({ "message": "Successfully added food to meal"})
    })
    .catch(error => {
      response.status(400).json({ error });
    });
});

app.delete('/api/v1/meals/:meal_id/foods/:food_id', (request, response) => {
  database('meal_foods').where({'meal_id': request.params.meal_id, 'food_id': request.params.food_id, 'date_id': request.query.date}).del()
  .then(foods => {
    if (foods == 1) {
      response.status(204).json({success: true});
    } else {
      response.status(404).json({ error });
    }
  })
  .catch((error) => {
    response.status(500).json({ error });
  });
});

app.get('/api/v1/mealfoods', (request, response) => {
  database('meal_foods').select()
    .then(meal_foods => {
      response.status(201).json({ meal_foods})
    })
    .catch(error => {
      response.status(400).json({ error });
    });
});

app.get('/api/v1/mealfoods/:id', (request, response) => {
  database('meal_foods').where('id', request.params.id).select()
    .then(mealfoods => {
      if (mealfoods.length) {
        response.status(200).json(mealfoods[0]);
      } else {
        response.status(404).json({
          error: `Could not find meal entry with id ${request.params.id}`
        });
      }
    })
    .catch(error => {
      response.status(500).json({ error });
    });
});

app.get('/api/v1/dates', (request, response) => {
  database('dates').select()
    .then(dates => {
      response.status(201).json({ dates})
    })
    .catch(error => {
      response.status(400).json({ error });
    });
});

app.post('/api/v1/dates', (request, response) => {
  const request_date = request.body;
    if(!request_date.day) {
      return response
        .status(422)
        .send({ error: "You're missing a day property." });
    }
  database('dates').where({day: request_date.day}, 'id')
    .then(date => {
      if(date.length == 0){
        database('dates').insert({"day": request_date.day}, 'id')
        .then(date_id => {
          response.status(201).json({'id': date_id[0]})
        });
      } else {
        response.status(200).json({'id': date[0].id})
        }
      })
    .catch(error => {
      response.status(400).json({ error });
    });
});

app.get('/api/v1/dates/meals', (request, response) => {
  database('dates')
  .select(['dates.day', 'meals.id AS meal_id', 'meals.name AS meal_name', 'foods.* AS foods'])
  .join('meal_foods', 'dates.id', '=', 'meal_foods.date_id')
  .join('meals', 'meals.id', '=', 'meal_foods.meal_id')
  .join('foods', 'foods.id', '=', 'meal_foods.food_id')
  .orderBy('dates.day', 'desc')
  .orderBy('meals.id', 'asc')
  .then(dates => {
    var result = [];
    dates.forEach(function(element) {
      var currentDay = {date: '', meals: ''}
      var elementArray = [element]

      if (result.length == 0) {
        var currentDay = formatDates(currentDay, elementArray)
        result.push(currentDay)
      }
      else {
        var i = 0;
        result.forEach(function(day) {
          if (+day.date === +element.day) {
            var mealArray = formatMeals(elementArray)
            mealArray.forEach(function(meal) {
              if (meal.foods.length > 0) {
                day.meals.push(meal)
              }
            })
          } else {
            i++;
          }
        })
          if (i === result.length) {
            var currentDay = formatDates(currentDay, elementArray)
            result.push(currentDay)
          }
        }
      });
    response.status(200).json(result);
  })
  .catch((error) => {
    response.status(404).json({ error });
  });
});

const formatDates = (currentDay, elementArray) => {
  currentDay.date = elementArray[0].day
  var mealArray = formatMeals(elementArray)
  mealArray.forEach(function(meal) {
    if (meal.foods.length > 0) {
      currentDay.meals = [meal]
    }
  })
  return currentDay;
}

app.get('/api/v1/dates/:day/meals', (request, response) => {
  database('dates')
  .select(['dates.day', 'meals.id AS meal_id', 'meals.name AS meal_name', 'foods.* AS foods'])
  .join('meal_foods', 'dates.id', '=', 'meal_foods.date_id')
  .join('meals', 'meals.id', '=', 'meal_foods.meal_id')
  .join('foods', 'foods.id', '=', 'meal_foods.food_id')
  .where('dates.day', request.params.day)
    .then(date => {
      if (date.length > 0) {
        const result = formatMeals(date)
        response.status(200).json(result);
      }
      else if (date.length == 0){
        response.status(200).json("No saved meals");
      }
      else {
        response.status(401).json({ error });
      }
    })
    .catch((error) => {
      response.status(404).json({ error });
    });
  });

const formatMeals = (data) => {
  var breakfast = {"id": 1, "name": "Breakfast", "foods": []}
  var lunch = {"id": 2, "name": "Lunch", "foods": []}
  var dinner = {"id": 3, "name": "Dinner", "foods": []}
  var snack = {"id": 4, "name": "Snack", "foods": []}
    data.forEach(function(m){
      switch(m.meal_id){
      case 1:
        result = { "id": m.id, "name": m.name, "calories": m.calories }
        breakfast.foods.push(result)
        break;
      case 2:
        result = { "id": m.id, "name": m.name, "calories": m.calories }
        lunch.foods.push(result)
        break;
      case 3:
        result = { "id": m.id, "name": m.name, "calories": m.calories }
        dinner.foods.push(result)
        break;
      default:
        result = { "id": m.id, "name": m.name, "calories": m.calories }
        snack.foods.push(result)
        }
      })
    return [breakfast, lunch, dinner, snack]
  }

app.listen(app.get('port'), () => {
  console.log(`${app.locals.title} is running on ${app.get('port')}.`);
});

module.exports = app;
