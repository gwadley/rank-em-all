const Pool = require('pg').Pool
const jQuery = require('jQuery')
const pool = new Pool({
  user: 'me',
  host: 'localhost',
  database: 'api',
  password: 'password',
  port: 5432,
})

//This constant returns the entire table of pokemon ordered by their rating. It only returns name and ID because end users don't see the actual values
const getPokemonRanked = (request, response) => {
  pool.query('SELECT id,name,rating FROM pokemon ORDER BY rating DESC', (error,results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
    })
}

//this gets all the data from a single row corresponding to a pokemon ID
getAllPokemonData = async function(id){
  try{
  var data = await pool.query('SELECT * FROM pokemon WHERE id = '+id);
  } catch(error){
    throw error
  }
  return data.rows;
}

//this function finds a pokemon who's ELO is within an acceptable range from the one it is given.
//If no such pokemon can be found (a pokemon is too popular or unpopular) this function calls itself recursively with increasingly large ranges
getFairPokemonMatchup = async function(id,rating,range){
  var data = {}
  var upperRating = parseInt(rating);
  var lowerRating = parseInt(rating);
  var returnData = {};
  try{
    data = await pool.query('SELECT * FROM pokemon WHERE rating BETWEEN '+(lowerRating-range)+' AND '+(upperRating+range)+' AND id != '+id+' ORDER BY RANDOM() LIMIT 1;')
  } catch(error){
    throw error
  }

  if(parseInt(data.rowCount) >0){
    return data.rows;
  } else{
    return getFairPokemonMatchup(id,rating,range+50);
  }
}

//function to update the rating of a pokemon.
updatePokemonRanking = async  function(id,rating,wins,losses){
  try{
      var data = await pool.query('UPDATE pokemon SET rating = '+rating+',wins = '+wins+', losses = '+losses+' WHERE id = '+id)
  } catch(error){
    throw error
  }
}

module.exports = {
  getPokemonRanked,
  getAllPokemonData,
  updatePokemonRanking,
  getFairPokemonMatchup
}