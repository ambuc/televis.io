//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// TELEVIS.IO DATABASE FUNCTIONS

//given a $shortname to search for, we query yql.
// http://james.padolsey.com/snippets/using-yql-with-jsonp/
// https://developer.yahoo.com/yql/console/#h=select+*+from+xml+where+url%3D'services.tvrage.com%2Ffeeds%2Fsearch.php%3Fshow%3Dlost'
//with the $data, we print the CHOOSE panel.
function search_shortname(shortname, string){
	xhr = $.ajax({
		url: "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20xml%20where%20url%3D\"services.tvrage.com%2Ffeeds%2Fsearch.php%3Fshow%3D"+encodeURIComponent(shortname)+"\"&format=json&diagnostics=true&callback=", 
		// url: 'http://services.tvrage.com/feeds/search.php?show=' + shortname, 
		dataType: "json",
		type: 'GET',
		success: function(data) {
			// console.log(data.query.results.Results.show);
			data = data.query.results.Results.show;
			if (data == false) { //if nothing happens,
				add_switch('a'); //return to ASK screen
				make_toast('Something\'s wrong with the database.');
			} else if (data[0]=="0") { //if there are no search results,
				make_toast('No Search Results Found'); //tell us
				add_switch('a'); //and return to ASK screen
			} else { //if there are search results,
				add_switch('c'); //proceed to CHOOSE screen
				if (!inProgress){
					// console.log('inProgress: ' + inProgress);
					return;
				}
				data = wrap_data(data); //wrap the data in an array,
				add_choose(string, data); //and push the search results to it
				//let us know how many results were found
				if(data.length) { 
					make_toast(data.length + ' Results Found');
				} else {
					make_toast('1 Result Found');						
				}
			}
		}
	});
}

//given a $showObj OBJ and its status $seen,
//	look for it on Parse
//	if it exists, 
//		fetch its eps
//	if it doesn't,
//		create it and fetch its eps 
function try_show(showObj, seen) {
	// console.log('try_show() called');

	var query = new Parse.Query(Parse.Object.extend("Show"));
	query.equalTo("show_id", parseInt(showObj.showid));
	query.find({
	  	success: function(results) {
		  	if (results.length != 0) { //if the show exists
		  		var showModel = _.first(results);
	    		fetch_eps(showModel, seen); //async
	    		make_toast("Getting '"+showModel.get('name')+"'...")
		  	} else {//if the show doesn't
		  		//careful typecasting
				var showModel = new Show({
					'show_id'			: parseInt(showObj.showid),
					'num_seasons'		: parseInt(showObj.seasons),
					'name'				: String(showObj.name),
					'classification'	: String(showObj.classification),
					'country'			: String(showObj.country),
					'ended'				: String(showObj.ended),
					'started'			: String(showObj.started),
					'status'			: String(showObj.status)
				});

				//save showModel to Parse::Show
				showModel.save({
					success: function() {
			    		make_toast("Getting '"+showModel.get('name')+"'...");
						fetch_eps(showModel, seen); //async
					},
					error: function(error) {
						make_toast("Couldn't add show. Something's quite wrong.");
						make_toast('Error: ' + error.code + ' ' + error.message);
					}
				});
		  	}
	  	},
	  	error: function(error) {
	  		make_toast("Couldn't reach Parse. Something's quite wrong.");
	  		make_toast("Error: " + error.code + ' ' + error.message);
	  	}
	});
}

//only called when CREATING a show
//  given a $showModel and a status $seen,
//	  fetch its episodes,
//	  process them,
// 	  and .save() them to the $showModel.
//	then create a BOOLS of the show.
function fetch_eps(showModel, seen) {
	// console.log('fetch_eps() called');

	// console.log('getting episodes by model');
	yhr = $.ajax({
		url: "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20xml%20where%20url%3D'services.tvrage.com%2Ffeeds%2Fepisode_list.php%3Fsid%3D"+showModel.get('show_id')+"'&format=json&diagnostics=true&callback=", 
		// url: 'http://services.tvrage.com/feeds/episode_list.php?sid='+showModel.get('show_id'),
		dataType: "json",
		type: 'GET',
		success: function(data) {
			// console.log(data);
			data = data.query.results.Show;
			console.log(data);
			if(_.isUndefined(data)){
				make_toast("No episodes found in show. Try again later.");
				add_switch('a');
				return;
			}
			data = clean_data(data);
			// console.log('data');
			// console.log(data);
			if(_.isEmpty(data)){
				make_toast("No episodes returned from database. Try again later.");
				add_switch('a');
				return;
			}
			showModel.set('episodes', data);
			showModel.save();
			try_bools(showModel, seen);
		},
		error: function(error) {
			// console.log(error);
		}
	});
}

function update_eps(showModel){
	// console.log('update_eps()');

	$.ajax({
		url: "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20xml%20where%20url%3D'services.tvrage.com%2Ffeeds%2Fepisode_list.php%3Fsid%3D"+showModel.get('show_id')+"'&format=json&diagnostics=true&callback=", 
		// url: 'http://services.tvrage.com/feeds/episode_list.php?sid='+showModel.get('show_id'),
		dataType: "json",
		type: 'GET',
		success: function(data) {
			// console.log(data);
			data = data.query.results.Show;
			showModel.set('episodes', clean_data(data));
			showModel.save();
		},
		error: function(error) {
			// console.log('could not update show');
		}
	});
}

//given a $showModel and a status $seen,
//	create a user-specifc BOOLS model and .save() it. 
function try_bools(showModel, seen) {
	// console.log('try_bools()');

	var query = new Parse.Query(Parse.Object.extend("Bools"));
	//two constraints -- $show_id and $user -- UNSCALEABLE, I think
	query.equalTo("show_id", parseInt(showModel.get('show_id')));
	query.equalTo("user", Parse.User.current());
	
	query.find({
		success: function(results) {
		  	//results.length HAS TO BE ZERO
		  	// if it's not, .destroy() and recreate.

		  	if (results.length != 0) {
		  		_.each(results, function(result) {
		  			result.destroy();
		  		});
		  	}

			var newBools = new Bools({
				'show_id' : parseInt(showModel.get('show_id')),
				'seasons' : parseInt(showModel.get('num_seasons'))
			});

			var show 	= showModel.get('episodes');
			var array 	= create_array(newBools.get('seasons'),0);

			_.each(show, function(season, i) {
				_.each(season, function(episode, j) {

					if ( !grok_airdate(episode.airdate) ) {
						array[i][j] = false;							
					} else {
						array[i][j] = seen;
					}

				});
			});

			newBools.set({ 'array' : array });

			newBools.save({
				success: function() {
					var name = showModel.get('name');
					make_toast('Successfully added ' + name); //toast
					add_great(name); //view
					fetch_bools(); //model
				},
				error: function(error) {
					make_toast("There really shouldn't be an error here. Is Parse down?");
				}
			});

		},
		error: function(error) {
			make_toast("There really shouldn't be an error here. Is Parse down?");
		}
	});
}


//resets myBools and myShows
//for the current user, 
//  finds their BOOl models in the database
//  and adds them to myBools
//  and fetches each relevant show
//  and adds them to myShows
function fetch_bools() {
	// console.log('fetch_bools() called');

	var boolsQuery  = new Parse.Query( Parse.Object.extend("Bools") );
	boolsQuery.equalTo("user", Parse.User.current());
	//async
	boolsQuery.find({
		success: function(results) {
			myBools.reset();
			myShows.reset();
			_.each(results, function(result) {
				myBools.add( result );
				fetch_show( result.get('show_id') );
			});
			check_stacks(currentTab);
		}
	});
}

// for a show of $id, finds the SHOW model
//   and adds it to myShows
function fetch_show(id) {
	// console.log('fetch_show() called');

	var showsQuery  = new Parse.Query( Parse.Object.extend("Show") );
	showsQuery.equalTo("show_id", parseInt(id));
	//async
	showsQuery.find({
		success: function(results) {
			var result = _.first(results);
			myShows.add( result );
			check_stacks(currentTab);
		}
	});
}

function check_shows(){
	var query  = new Parse.Query( Parse.Object.extend("Show") );
	//async
	query.find({
		success: function(results) {
			// console.log(results);

			_.each(results, function(result){
				var status = result.get('status')
				if (	
					moment().diff( result.updatedAt, 'days') > turnover
					&& status != "Ended" 
					&& status != "Canceled"
					&& status != "Canceled/Ended"	
				) {
					// console.log('   ' + result.get('name') + ' //' + result.get('status') + '// needs updating');
					update_eps(result);
				}

			});

		}
	});
}

//goes thru all the user's bools, checking their length against the newly-updated show episodes array. if it's not long enough (if it's undefined), we initialize that entry as false - unseen.
function check_bools(){
	// console.log('check_bools()');
	_.each(myBools.models, function(bool){

		show = myShows.match(bool.get('show_id'));

		var arrCopy = bool.get('array');
		var eps = show.get('episodes');

		for(var i = 0; i < eps.length; i++){
			if (_.isUndefined(arrCopy[i])){
				arrCopy[i] = [];
				console.log('undefined, creating season' + i);
			}
			for(var j = 0; j < eps[i].length; j++){
				if (_.isUndefined(arrCopy[i][j])){
					arrCopy[i][j] = false;
					console.log('undefined, for show ' + show.get('name') + ' creating season' + i + ' episode ' + j + ' and initializing as `false`');
				}
			}
		}

		bool.set('array', arrCopy);
		bool.save();

	});
}



//sometimes data.show is an object (one result), and sometimes it's an array (multiple results). wrap_data(data) puts it in an array all the time, for simpler printing
function wrap_data(data){
	// console.log(data);
	if(!_.isArray(data)) {
		var tempdata = data;
		data = new Array();
		data.push(tempdata);
	}
	// console.log(data);
	return data;
}
