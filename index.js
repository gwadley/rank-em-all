const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const db = require('./queries')
const port = 3000
const rateLimit = require("express-rate-limit");
const uuidv4 = require('uuid/v4');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');

var EloRating = require('elo-rating');


var tokens={}

const limiter = rateLimit({
  windowMs: 60 * 1000, // 15 minutes
  max: 60 // limit each IP to 100 requests per windowMs
});

cron.schedule('*/10 * * * *', () => {
	console.log("Deleting old tokens")
	var currentTime = Date();
	var ONE_HOUR = 60 * 60 * 1000; /* ms */
	for(var token in tokens){
		if((Date.parse(currentTime) - Date.parse(tokens[token])) > ONE_HOUR){
			delete tokens[token];
		}
	}
});

app.use("/getPokemonPair",limiter);
app.use("/updateRankings",limiter);


app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.use(express.static('public'))
app.use(cookieParser());


app.get('/', function(req, res) {
    res.sendFile('./index.html');
});

//Endpoint which returns the ranked table of pokemon
app.get('/pokemonRanked',db.getPokemonRanked)

//The UI calls this function to get 2 pokemon for the user to choose between. Because the calls to the DB are asyncronous, we first ask for data for a specific ID
//Then when that is complete, ask for data for a pokemon within an acceptable ELO range (default 50)
app.get('/getPokemonPair', function(req,res){
	//create unique token so users cannot spam the same request
	var token = uuidv4();
	tokens[token] = Date();

	var returnData=[token]
	var r1 = Math.floor(Math.random() * 809)+1;
	getAllPokemonData(r1).then(function(value){
		returnData.push(value[0]);

		getFairPokemonMatchup(value[0]["id"],value[0]["rating"],50).then(function(value){
			returnData.push(value[0]);
			res.send(returnData);
		})
	})
})

/*
This function takes a POST body that looks like this:
{
	pokemon1:<id>,
	pokemon2:<id>,
	win,
	token
}

where win is a boolean value for whether pokemon1 was chosen. We do this through a boolean because that's what the ELO function expects.

It then makes calls to the DB to update ratings of both pokemon
*/
app.post('/updateRankings', function(req,res){

	token = req.body["token"];
	if(token in tokens){
		delete tokens[token]

		var id1="";
		var id2="";
		var wins1;
		var wins2;
		var losses1;
		var losses2;
		var rating1;
		var rating2;
		var win = req.body["win"]
		
		getAllPokemonData(req.body["pokemon1"]).then(function(value){
			id1=value[0]["id"]
			rating1=value[0]["rating"]
			wins1=value[0]["wins"]
			losses1=value[0]["losses"]

			getAllPokemonData(req.body["pokemon2"]).then(function(value){
				id2=value[0]["id"]
				rating2=value[0]["rating"]
				wins2=value[0]["wins"]
				losses2=value[0]["losses"]

				var newRatings = ratingChanges(rating1,rating2,win)

				if(win){
					updatePokemonRanking(id1,newRatings[0],parseInt(wins1)+1,parseInt(losses1))
					updatePokemonRanking(id2,newRatings[1],parseInt(wins2),parseInt(losses2)+1)
				} else {
					updatePokemonRanking(id1,newRatings[0],parseInt(wins1),parseInt(losses1)+1)
					updatePokemonRanking(id2,newRatings[1],parseInt(wins2)+1,parseInt(losses2))
				}
			})
			
		})

		res.send('Updated Rankings')
	} else {
		res.send('Invalid Token')
	}
})

//This function takes 2 ratings and a winner, and uses the ELO funciton to calculate new ratints
function ratingChanges(rating1,rating2,win){
	result = EloRating.calculate(rating1,rating2,win)
	return [result.playerRating,result.opponentRating]
}


app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})